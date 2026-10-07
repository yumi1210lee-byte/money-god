// 股價與匯率：透過 CORS 代理抓 Yahoo 報價、計算當日漲跌與股利、換算台幣

export const isTwStock = (symbol) => {
  const sym = String(symbol || '').trim().toUpperCase();
  return sym.includes('.TW') || /^\d+[A-Z]?$/.test(sym);
};

// Yahoo 有些市場以輔幣報價，例如倫敦 GBp 是便士
export const SUBUNIT_CURRENCIES = { GBp: ['GBP', 100], ZAc: ['ZAR', 100], ILA: ['ILS', 100] };

// 股票的報價幣別；舊資料還沒有幣別時，台股視為台幣、其他視為美元
export const stockCurrency = (stock) => stock.quoteCurrency || (isTwStock(stock.quoteSymbol || stock.symbol) ? 'TWD' : 'USD');

// 股價換算成台幣的匯率
export const stockFxRate = (stock, fxRates) => {
  const [base, divisor] = SUBUNIT_CURRENCIES[stockCurrency(stock)] || [stockCurrency(stock), 1];
  if (base === 'TWD') return 1 / divisor;
  return (fxRates[base] ? fxRates.TWD / fxRates[base] : fxRates.TWD) / divisor;
};

// 取「最新交易日之前」最後一根日 K 的收盤價。
// chartPreviousClose 是整段圖表起點前的收盤價（range=1y 時約為一年前），不能拿來算當日漲跌。
export const getPreviousClose = (result) => {
  const { regularMarketTime, gmtoffset = 0 } = result.meta;
  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const toLocalDay = (t) => Math.floor((t + gmtoffset) / 86400);
  const marketDay = toLocalDay(regularMarketTime);
  for (let i = timestamps.length - 1; i >= 0; i--) {
    if (closes[i] != null && toLocalDay(timestamps[i]) < marketDay) return closes[i];
  }
  return null;
};

export const FETCH_TIMEOUT_MS = 8000;

export const STOCK_CONCURRENCY = 2;                     // 同時最多抓幾檔，避免一次發太多請求被擋

export const AUTO_REFRESH_MS = 5 * 60 * 1000;           // App 開著時每 5 分鐘自動更新

export const RESUME_REFRESH_MS = 60 * 1000;             // 從背景回到 App 時，距上次同步超過 1 分鐘就更新

export const DIVIDEND_REFRESH_MS = 24 * 60 * 60 * 1000; // 股利資料一天最多更新一次

export const fetchWithTimeout = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try { return await fetch(url, { signal: controller.signal }); }
  finally { clearTimeout(timer); }
};

// Yahoo 不允許瀏覽器直接跨網域呼叫，需經過 CORS 代理；依序嘗試不同代理與 Yahoo 主機
export const YAHOO_ATTEMPTS = [
  { host: 'query1', proxy: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}&_=${Date.now()}` },
  { host: 'query2', proxy: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}` },
  { host: 'query2', proxy: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}&_=${Date.now()}` },
];

// 回傳 Yahoo 的 JSON（查無代號時也是 JSON）；所有代理都失敗、逾時或被限流時回傳 null
export const fetchYahoo = async (path) => {
  for (const { host, proxy } of YAHOO_ATTEMPTS) {
    try {
      const res = await fetchWithTimeout(proxy(`https://${host}.finance.yahoo.com${path}`));
      const body = await res.json();
      const payload = typeof body?.contents === 'string' ? JSON.parse(body.contents) : body;
      if (payload?.chart || payload?.quotes) return payload;
    } catch { /* 換下一個代理 */ }
  }
  return null;
};

// 純數字代號（可帶一個字母，如 00679B）先試上市 .TW，找不到再試上櫃 .TWO
export const toYahooCandidates = (symbol) => {
  const sym = String(symbol || '').trim().toUpperCase();
  if (!sym) return [];
  return /^\d{4,6}[A-Z]?$/.test(sym) ? [`${sym}.TW`, `${sym}.TWO`] : [sym];
};

export const parseDividends = (result) => {
  const divArray = Object.values(result?.events?.dividends || {}).sort((a, b) => b.date - a.date);
  // 近 12 個月的每股股利合計；同一個月份只算最近一次，避免一年區間頭尾剛好跨到同一個月而重複計算
  const latestByMonth = new Map();
  for (const d of divArray) {
    const month = new Date(d.date * 1000).getMonth();
    if (!latestByMonth.has(month)) latestByMonth.set(month, d.amount || 0);
  }
  return {
    dividend: divArray[0]?.amount || 0,
    annualDividend: [...latestByMonth.values()].reduce((sum, amount) => sum + amount, 0),
    divMonth: [...new Set(divArray.map(d => new Date(d.date * 1000).getMonth() + 1))].sort((a, b) => a - b).join(','),
  };
};

// 還沒有年度股利（舊資料）或超過一天沒更新時，下次同步要重新抓股利
export const isDividendStale = (stock) => stock.annualDividend === undefined || !stock.divUpdatedAt || Date.now() - stock.divUpdatedAt > DIVIDEND_REFRESH_MS;

// 每股年度股利；還沒抓到近 12 個月資料時，用「最近一次配息 × 每年配息次數」估計
export const annualDividendPerShare = (stock) => stock.annualDividend ?? (stock.dividend || 0) * (stock.divMonth ? stock.divMonth.split(',').length : 0);

// 回傳報價；網路失敗或查無此代號時回傳 null
export const fetchStockQuote = async (stock, { withName, withDividend }) => {
  const candidates = [...new Set([stock.quoteSymbol, ...toYahooCandidates(stock.symbol)].filter(Boolean))];
  for (const sym of candidates) {
    const chart = await fetchYahoo(`/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`);
    if (!chart) return null; // 網路問題，不再嘗試其他後綴
    const result = chart.chart?.result?.[0];
    if (result?.meta?.regularMarketPrice == null) continue; // 查無此代號，試下一個
    const price = result.meta.regularMarketPrice;
    const prevClose = getPreviousClose(result);
    const quote = { quoteSymbol: sym, currency: result.meta.currency, price, change: prevClose != null ? price - prevClose : 0 };
    if (withDividend) {
      const divResult = (await fetchYahoo(`/v8/finance/chart/${encodeURIComponent(sym)}?interval=1mo&range=1y&events=div`))?.chart?.result?.[0];
      if (divResult) Object.assign(quote, parseDividends(divResult));
    }
    if (withName) {
      const search = await fetchYahoo(`/v1/finance/search?q=${encodeURIComponent(sym)}&lang=zh-Hant-TW&region=TW`);
      const match = search?.quotes?.find(q => q.symbol === sym) || search?.quotes?.[0];
      quote.name = match?.shortname || match?.longname || result.meta.shortName || result.meta.longName || sym;
    }
    return quote;
  }
  return null;
};

export const applyQuote = (stock, quote) => ({
  ...stock,
  quoteSymbol: quote.quoteSymbol,
  ...(quote.currency ? { quoteCurrency: quote.currency } : {}),
  price: quote.price,
  change: quote.change,
  amount: stock.shares * quote.price,
  priceUpdatedAt: Date.now(),
  ...(!stock.label && quote.name ? { label: quote.name } : {}),
  ...(quote.dividend !== undefined ? { dividend: quote.dividend || stock.dividend, annualDividend: quote.annualDividend, divMonth: quote.divMonth || stock.divMonth, divUpdatedAt: Date.now() } : {}),
});

export const fetchFxRates = async () => {
  try {
    const res = await fetchWithTimeout('https://open.er-api.com/v6/latest/USD');
    const rates = (await res.json())?.rates;
    return rates?.TWD ? rates : null;
  } catch (err) {
    console.error("Exchange rate sync failed:", err);
    return null;
  }
};

export const runWithLimit = async (items, limit, worker) => {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await worker(queue.shift());
  }));
};
