// 股價中繼站的測試：以模擬的 Yahoo 回應執行，不需要網路（npm run test:worker）
import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import worker, { clearCache, toYahooRequest } from '../src/index.js';

const ORIGIN = 'https://yumi1210lee-byte.github.io';
const BASE = 'https://money-god-quotes.yumi-money.workers.dev';
const chartJson = { chart: { result: [{ meta: { regularMarketPrice: 1050 } }] } };
const notFoundJson = { chart: { result: null, error: { code: 'Not Found' } } };

const call = (path, { origin = ORIGIN, method = 'GET' } = {}) =>
  worker.fetch(new Request(`${BASE}${path}`, { method, headers: origin ? { Origin: origin } : {} }));

// 依序回應每一次對 Yahoo 的請求，並記下請求網址
let upstream;
const respondWith = (...responses) => {
  let calls = 0;
  upstream = mock.method(globalThis, 'fetch', async () => {
    const next = responses[Math.min(calls++, responses.length - 1)];
    if (next instanceof Error) throw next;
    return new Response(typeof next.body === 'string' ? next.body : JSON.stringify(next.body), { status: next.status ?? 200 });
  });
};
const upstreamUrls = () => upstream.mock.calls.map(c => c.arguments[0]);

beforeEach(() => clearCache());
afterEach(() => mock.restoreAll());

test('轉送股價查詢，帶上 CORS 標頭', async () => {
  respondWith({ body: chartJson });
  const res = await call('/yahoo/v8/finance/chart/2330.TW?interval=1d&range=5d');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await res.json(), chartJson);
  assert.deepEqual(upstreamUrls(), ['https://query1.finance.yahoo.com/v8/finance/chart/2330.TW?interval=1d&range=5d']);
  assert.match(upstream.mock.calls[0].arguments[1].headers['User-Agent'], /Mozilla/);
});

test('股利查詢保留 events=div，參數順序不影響', async () => {
  respondWith({ body: chartJson });
  const res = await call('/yahoo/v8/finance/chart/AAPL?events=div&range=1y&interval=1mo');
  assert.equal(res.status, 200);
  assert.deepEqual(upstreamUrls(), ['https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1mo&range=1y&events=div']);
});

test('查無代號時照樣回傳 Yahoo 的 404 JSON，App 才能改試 .TWO', async () => {
  respondWith({ status: 404, body: notFoundJson });
  const res = await call('/yahoo/v8/finance/chart/6488.TW?interval=1d&range=5d');
  assert.equal(res.status, 404);
  assert.deepEqual(await res.json(), notFoundJson);
  assert.equal(upstreamUrls().length, 1);
});

test('query1 被限流或連線失敗時改用 query2', async () => {
  respondWith({ status: 429, body: 'Too Many Requests' }, { body: chartJson });
  let res = await call('/yahoo/v8/finance/chart/2330.TW?interval=1d&range=5d');
  assert.equal(res.status, 200);
  assert.deepEqual(upstreamUrls().map(u => new URL(u).host), ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']);

  mock.restoreAll();
  respondWith(new TypeError('network down'), { body: chartJson });
  res = await call('/yahoo/v8/finance/chart/AAPL?interval=1d&range=5d');
  assert.equal(res.status, 200);
  assert.equal(upstreamUrls().length, 2);
});

test('兩台主機都失敗時回傳 502', async () => {
  respondWith({ status: 503, body: '<html>error</html>' });
  const res = await call('/yahoo/v8/finance/chart/2330.TW?interval=1d&range=5d');
  assert.equal(res.status, 502);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  assert.equal(upstreamUrls().length, 2);
});

test('1 分鐘內重複查詢同一檔股價直接用上次的結果，過期後重新查詢', async () => {
  respondWith({ body: chartJson });
  const now = mock.method(Date, 'now', () => 1_000_000);
  await call('/yahoo/v8/finance/chart/2330.TW?interval=1d&range=5d');
  await call('/yahoo/v8/finance/chart/2330.TW?range=5d&interval=1d');
  assert.equal(upstreamUrls().length, 1);
  now.mock.mockImplementation(() => 1_000_000 + 61_000);
  await call('/yahoo/v8/finance/chart/2330.TW?interval=1d&range=5d');
  assert.equal(upstreamUrls().length, 2);
});

test('失敗的結果不會被記住', async () => {
  respondWith({ status: 500, body: 'oops' });
  await call('/yahoo/v8/finance/chart/2330.TW?interval=1d&range=5d');
  mock.restoreAll();
  respondWith({ body: chartJson });
  const res = await call('/yahoo/v8/finance/chart/2330.TW?interval=1d&range=5d');
  assert.equal(res.status, 200);
});

test('名稱查詢固定使用繁體中文、台灣地區', async () => {
  respondWith({ body: { quotes: [{ symbol: '2330.TW', shortname: '台積電' }] } });
  const res = await call('/yahoo/v1/finance/search?q=2330.TW&lang=en&region=US');
  assert.equal(res.status, 200);
  assert.deepEqual(upstreamUrls(), ['https://query1.finance.yahoo.com/v1/finance/search?q=2330.TW&lang=zh-Hant-TW&region=TW']);
});

test('不是 App 網站發出的請求一律拒絕', async () => {
  respondWith({ body: chartJson });
  for (const origin of [null, 'https://evil.example', 'https://yumi1210lee-byte.github.io.evil.example']) {
    const res = await call('/yahoo/v8/finance/chart/2330.TW?interval=1d&range=5d', { origin });
    assert.equal(res.status, 403);
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
  }
  assert.equal(upstreamUrls().length, 0);
});

test('只轉送 App 用到的查詢，其他網址與參數一律拒絕', async () => {
  respondWith({ body: chartJson });
  const rejected = [
    '/yahoo/v7/finance/quote?symbols=AAPL',
    '/yahoo/v8/finance/chart/AAPL',                               // 缺少參數
    '/yahoo/v8/finance/chart/AAPL?interval=1m&range=5d',          // 不允許的間隔
    '/yahoo/v8/finance/chart/AAPL?interval=1d&range=max',         // 不允許的區間
    '/yahoo/v8/finance/chart/AAPL?interval=1d&range=5d&events=split',
    '/yahoo/v8/finance/chart/..%2F..%2Fv7?interval=1d&range=5d',  // 代號不能帶路徑
    '/yahoo/v8/finance/chart/%E0%A4%A?interval=1d&range=5d',      // 無效編碼
    '/yahoo/v1/finance/search?q=',
    '/v8/finance/chart/AAPL?interval=1d&range=5d',                // 少了 /yahoo 前綴
  ];
  for (const path of rejected) {
    const res = await call(path);
    assert.equal(res.status, 400, path);
  }
  assert.equal((await call('/yahoo/v8/finance/chart/AAPL?interval=1d&range=5d', { method: 'POST' })).status, 405);
  assert.equal(upstreamUrls().length, 0);
});

test('只把允許的參數帶到 Yahoo', () => {
  const target = toYahooRequest(new URL(`${BASE}/yahoo/v8/finance/chart/%5ETWII?interval=1d&range=5d&crumb=x&url=https://evil.example`));
  assert.equal(target.path, '/v8/finance/chart/%5ETWII?interval=1d&range=5d');
  assert.equal(target.ttl, 60);
});

test('預檢請求與首頁', async () => {
  const preflight = await call('/yahoo/v8/finance/chart/AAPL?interval=1d&range=5d', { method: 'OPTIONS' });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  const home = await call('/', { origin: null });
  assert.equal(home.status, 200);
  assert.equal(await home.text(), 'money-god quotes');
});
