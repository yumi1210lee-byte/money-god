import { test as base, expect } from '@playwright/test';

export { expect };

const DAY = 86400;
const twDay = Date.UTC(2026, 9, 6, 1, 0) / 1000;  // 台股某交易日 09:00 (+08)
const usDay = Date.UTC(2026, 9, 5, 13, 30) / 1000; // 美股某交易日 09:30 (-04)

// 模擬的 Yahoo 報價：現價、前一交易日收盤、時區、名稱、最近一次股利、幣別
export const QUOTES = {
  '2330.TW': { price: 1050, prev: 1000, gmt: 28800, day: twDay, name: '台積電', div: 5, ccy: 'TWD' },
  '6488.TWO': { price: 500, prev: 490, gmt: 28800, day: twDay, name: '環球晶', div: 8, ccy: 'TWD' },
  '7203.T': { price: 3000, prev: 2950, gmt: 32400, day: twDay, name: 'Toyota', div: 40, ccy: 'JPY' },
  'VOD.L': { price: 70, prev: 69, gmt: 3600, day: usDay, name: 'Vodafone', div: 2, ccy: 'GBp' },
  'AAPL': { price: 200, prev: 198, gmt: -14400, day: usDay, name: 'Apple Inc.', div: 0.25, ccy: 'USD' },
};

// 以美元為基準的模擬匯率：1 USD = 30 TWD
export const FX_RATES = { USD: 1, TWD: 30, JPY: 150, GBP: 0.75 };

const notFound = { chart: { result: null, error: { code: 'Not Found', description: 'No data found' } } };

// 依 Yahoo 的網址回傳與真實 API 相同結構的資料
function yahooResponse(target) {
  const url = new URL(target);
  const chartMatch = url.pathname.match(/\/v8\/finance\/chart\/(.+)$/);
  if (chartMatch) {
    const q = QUOTES[decodeURIComponent(chartMatch[1])];
    if (!q) return { status: 404, json: notFound };
    if (url.searchParams.get('interval') === '1mo') {
      return { status: 200, json: { chart: { result: [{ meta: { regularMarketPrice: q.price }, events: { dividends: { a: { amount: q.div, date: q.day - 60 * DAY } } } }] } } };
    }
    return { status: 200, json: { chart: { result: [{
      meta: { currency: q.ccy, regularMarketPrice: q.price, chartPreviousClose: q.prev - 100, gmtoffset: q.gmt, regularMarketTime: q.day + 4 * 3600 },
      timestamp: [q.day - 2 * DAY, q.day - DAY, q.day],
      indicators: { quote: [{ close: [q.prev - 5, q.prev, q.price] }] },
    }] } } };
  }
  if (url.pathname.includes('/v1/finance/search')) {
    const sym = url.searchParams.get('q');
    return { status: 200, json: { quotes: QUOTES[sym] ? [{ symbol: sym, shortname: QUOTES[sym].name }] : [] } };
  }
  return { status: 404, json: {} };
}

export const test = base.extend({
  // 攔截所有外部請求並回傳模擬資料。
  // 測試可設定 mock.fail.raw / codetabs / get（代理故障）、mock.delay['2330.TW']（毫秒）、mock.rateFails，
  // 並從 mock.log 檢查發出過哪些請求。
  mock: [async ({ page }, use) => {
    const mock = { log: [], fail: {}, delay: {}, rateFails: false };
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.route('https://open.er-api.com/**', route => mock.rateFails
      ? route.fulfill({ status: 500, body: 'error' })
      : route.fulfill({ json: { rates: FX_RATES } }));
    const proxy = (kind, param) => async (route) => {
      const target = new URL(route.request().url()).searchParams.get(param);
      mock.log.push({ kind, target });
      if (mock.fail[kind]) return route.fulfill({ status: 500, body: 'proxy down' });
      const delayed = Object.keys(mock.delay).find(sym => target.includes(`/chart/${sym}?`));
      if (delayed) await new Promise(resolve => setTimeout(resolve, mock.delay[delayed]));
      const { status, json } = yahooResponse(target);
      if (kind === 'get') return route.fulfill({ json: { contents: JSON.stringify(json), status: { http_code: status } } });
      return route.fulfill({ status, json });
    };
    await page.route('https://api.allorigins.win/raw**', proxy('raw', 'url'));
    await page.route('https://api.allorigins.win/get**', proxy('get', 'url'));
    await page.route('https://api.codetabs.com/**', proxy('codetabs', 'quest'));
    await use(mock);
  }, { auto: true }],
});

export const PASSCODE = '1234';

// 開啟 App 並預先寫入密碼與資料；passcode 為 null 時模擬第一次使用
export async function openApp(page, { data, passcode = PASSCODE, storage = {} } = {}) {
  await page.goto('./');
  await page.evaluate(({ data, passcode, storage }) => {
    localStorage.clear();
    if (passcode) localStorage.setItem('asset_terminal_pass', passcode);
    if (data) localStorage.setItem('money_god_v55', JSON.stringify(data));
    for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
  }, { data: data && { cash: [], stocks: [], debts: [], monthlyExpenses: [], ...data }, passcode, storage });
  await page.reload();
}

export async function unlock(page, passcode = PASSCODE) {
  await page.locator('input[type=password]').fill(passcode);
  await page.locator('input[type=password]').press('Enter');
  await expect(page.getByText('Start Session')).toHaveCount(0);
}

// 等目前的同步結束（解鎖後同步會在下一次畫面更新才開始，所以先稍等）
export async function waitForSync(page) {
  await page.waitForTimeout(300);
  await expect(page.locator('.animate-spin')).toHaveCount(0, { timeout: 30_000 });
}

export const storedData = page => page.evaluate(() => JSON.parse(localStorage.getItem('money_god_v55')));
export const storedItem = (page, key) => page.evaluate(k => localStorage.getItem(k), key);

export const row = (page, text) => page.locator('main div.p-4.flex-col.gap-3').filter({ hasText: text });
export const entryModal = page => page.locator('.z-\\[60\\]');
export const settingsPanel = page => page.locator('.z-\\[70\\]');
export const commitButton = page => entryModal(page).getByRole('button', { name: 'COMMIT CHANGES' });
export const undoToast = page => page.getByRole('status');

export const openTab = (page, name) => page.locator('main').getByRole('button', { name, exact: true }).first().click();
export const toggleValues = page => page.locator('nav button').nth(0).click();
export const openSettings = page => page.locator('nav button').nth(1).click();
export const closeSettings = page => settingsPanel(page).locator('button:has(svg.lucide-x)').click();
export const lockButton = page => page.getByRole('button', { name: '上鎖' });
export const refreshButton = page => page.locator('main button').first();

export async function openNewEntry(page, type) {
  await page.locator('div.fixed.bottom-10 button').click();
  if (type) await entryModal(page).getByRole('button', { name: type, exact: true }).click();
}

export const textOf = async locator => (await locator.innerText()).replace(/\s+/g, ' ');
