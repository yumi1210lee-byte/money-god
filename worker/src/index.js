// money-god 專用的股價中繼站（Cloudflare Worker）
// 瀏覽器不能直接呼叫 Yahoo（沒有開放跨網域），App 改由這裡代為查詢。
// 只轉送 App 用到的兩種 Yahoo API、只接受 App 網站發出的請求，避免被別人拿來當公開代理。

export const ALLOWED_ORIGINS = [
  'https://yumi1210lee-byte.github.io',
  'http://localhost:5173', // npm run dev
  'http://localhost:4173', // npm run preview
];

const YAHOO_HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
const UPSTREAM_TIMEOUT_MS = 3500; // 兩台主機都試完也在 App 的 8 秒逾時之內
const UPSTREAM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  Accept: 'application/json',
};

// 股價：interval=1d&range=5d；股利：interval=1mo&range=1y&events=div
const CHART_PARAMS = { interval: ['1d', '1mo'], range: ['5d', '1y'], events: ['div'] };
const SYMBOL_PATTERN = /^[A-Za-z0-9.^=-]{1,20}$/;
const PRICE_TTL_S = 60;           // 股價最多重用 1 分鐘
const DIVIDEND_TTL_S = 6 * 3600;  // 股利一天才變一次
const SEARCH_TTL_S = 24 * 3600;   // 股票名稱幾乎不會變

// 把 App 的請求（/yahoo/...）轉成 Yahoo 的路徑，只保留允許的參數；格式不符時回傳 null
export const toYahooRequest = (url) => {
  if (!url.pathname.startsWith('/yahoo/')) return null;
  const path = url.pathname.slice('/yahoo'.length);

  const chart = path.match(/^\/v8\/finance\/chart\/([^/]+)$/);
  if (chart) {
    let symbol;
    try { symbol = decodeURIComponent(chart[1]); } catch { return null; }
    if (!SYMBOL_PATTERN.test(symbol)) return null;
    const params = new URLSearchParams();
    for (const [key, allowed] of Object.entries(CHART_PARAMS)) {
      const value = url.searchParams.get(key);
      if (value === null) continue;
      if (!allowed.includes(value)) return null;
      params.set(key, value);
    }
    if (!params.has('interval') || !params.has('range')) return null;
    return {
      path: `/v8/finance/chart/${encodeURIComponent(symbol)}?${params}`,
      ttl: params.get('interval') === '1d' ? PRICE_TTL_S : DIVIDEND_TTL_S,
    };
  }

  if (path === '/v1/finance/search') {
    const q = url.searchParams.get('q');
    if (!q || !SYMBOL_PATTERN.test(q)) return null;
    return { path: `/v1/finance/search?${new URLSearchParams({ q, lang: 'zh-Hant-TW', region: 'TW' })}`, ttl: SEARCH_TTL_S };
  }

  return null;
};

// 依序試 Yahoo 的兩台主機；拿到 Yahoo 的 JSON（查無代號的 404 也算）就回傳，被限流、逾時或回傳網頁時換下一台
const fetchYahoo = async (path) => {
  for (const host of YAHOO_HOSTS) {
    try {
      const res = await fetch(`https://${host}${path}`, { headers: UPSTREAM_HEADERS, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
      const body = await res.text();
      const json = JSON.parse(body);
      if (json?.chart || json?.quotes) return { status: res.status, body };
    } catch { /* 換下一台主機 */ }
  }
  return null;
};

// 短暫記住查過的結果，App 多次重新整理時不必每次都問 Yahoo（同一台伺服器上才共用）
const MAX_CACHE_ENTRIES = 500;
const cache = new Map();

export const clearCache = () => cache.clear();

const remember = (key, entry) => {
  cache.delete(key);
  cache.set(key, entry);
  if (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
};

const jsonResponse = (status, body, headers = {}) => new Response(typeof body === 'string' ? body : JSON.stringify(body), {
  status,
  headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/') return new Response('money-god quotes', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

    const origin = request.headers.get('Origin');
    if (!ALLOWED_ORIGINS.includes(origin)) return jsonResponse(403, { error: 'forbidden' });
    const cors = { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' } });
    }
    if (request.method !== 'GET') return jsonResponse(405, { error: 'method not allowed' }, cors);

    const target = toYahooRequest(url);
    if (!target) return jsonResponse(400, { error: 'unsupported request' }, cors);

    const now = Date.now();
    let entry = cache.get(target.path);
    if (!entry || entry.expires <= now) {
      const fresh = await fetchYahoo(target.path);
      if (!fresh) return jsonResponse(502, { error: 'yahoo unavailable' }, cors);
      entry = { ...fresh, expires: now + target.ttl * 1000 };
      remember(target.path, entry);
    }
    return jsonResponse(entry.status, entry.body, cors);
  },
};
