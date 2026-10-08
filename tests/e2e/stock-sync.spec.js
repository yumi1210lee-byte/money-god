import { test, expect, openApp, unlock, waitForSync, storedData, row, entryModal, commitButton, openTab, toggleValues, refreshButton, openNewEntry, textOf, lockButton } from './fixtures.js';

const tsmc = { id: 's1', symbol: '2330', label: '我的台積電', shares: 1000, price: 900, change: 0, dividend: 0, divMonth: '' };
const apple = { id: 's2', symbol: 'AAPL', label: '', shares: 10, price: 100, change: 0, dividend: 0, divMonth: '' };
const chartRequests = (mock, interval = '1d') => mock.log.filter(l => l.target.includes('/chart/') && l.target.includes(`interval=${interval}`)).length;

test('同步後更新股價與當日漲跌，並保留自訂名稱', async ({ page, mock }) => {
  await openApp(page, { data: { stocks: [tsmc, apple] } });
  await unlock(page);
  await waitForSync(page);
  const [tw, us] = (await storedData(page)).stocks;
  // 當日漲跌 = 現價 − 前一交易日收盤，不是 chartPreviousClose（約一年前）
  expect(tw.change).toBe(50);
  expect(us.change).toBe(2);
  expect(tw.label).toBe('我的台積電');
  expect(us.label).toBe('Apple Inc.');
  // 有名稱的股票不查名稱；股價只抓 5 天的小資料量
  expect(mock.log.some(l => l.target.includes('/search') && l.target.includes('2330'))).toBe(false);
  expect(mock.log.filter(l => l.target.includes('/chart/')).every(l => l.target.includes('range=5d') || l.target.includes('interval=1mo'))).toBe(true);

  await toggleValues(page);
  await openTab(page, '股票');
  const text = (await textOf(row(page, 'Apple Inc.'))).toUpperCase();
  expect(text).toContain('NT$ 60,000');   // 10 × 200 × 30
  expect(text).toContain('+NT$ 600');     // 10 × 2 × 30
  expect(text).toContain('年股利 NT$ 75'); // 10 × 0.25 × 30
  expect(text).toContain('更新');
});

test('匯率 API 失敗時股價仍會更新', async ({ page, mock }) => {
  mock.rateFails = true;
  await openApp(page, { data: { stocks: [tsmc] } });
  await unlock(page);
  await expect.poll(async () => (await storedData(page)).stocks[0].price).toBe(1050);
});

test('優先使用自己的 Worker，不經過公共代理', async ({ page, mock }) => {
  await openApp(page, { data: { stocks: [tsmc, apple] } });
  await unlock(page);
  await waitForSync(page);
  expect((await storedData(page)).stocks.map(s => s.price)).toEqual([1050, 200]);
  expect(mock.log.length).toBeGreaterThan(0);
  expect(mock.log.every(l => l.kind === 'worker')).toBe(true);
});

test('Worker 失敗時改用公共代理', async ({ page, mock }) => {
  mock.fail = { worker: true };
  await openApp(page, { data: { stocks: [tsmc] } });
  await unlock(page);
  await expect.poll(async () => (await storedData(page)).stocks[0].price).toBe(1050);
  expect(mock.log.some(l => l.kind === 'raw')).toBe(true);
});

test('allorigins raw 與 codetabs 都失敗時，改用 allorigins get 與 Yahoo query2', async ({ page, mock }) => {
  mock.fail = { worker: true, raw: true, codetabs: true };
  await openApp(page, { data: { stocks: [tsmc, apple] } });
  await unlock(page);
  await waitForSync(page);
  expect((await storedData(page)).stocks.map(s => s.price)).toEqual([1050, 200]);
  expect(mock.log.filter(l => l.kind === 'get').every(l => l.target.includes('query2.finance'))).toBe(true);
});

test('allorigins 失敗時改用 codetabs', async ({ page, mock }) => {
  mock.fail = { worker: true, raw: true };
  await openApp(page, { data: { stocks: [tsmc] } });
  await unlock(page);
  await expect.poll(async () => (await storedData(page)).stocks[0].price).toBe(1050);
});

test('上櫃股自動改用 .TWO，之後直接使用記住的代號', async ({ page, mock }) => {
  await openApp(page, { data: { stocks: [{ id: 'o1', symbol: '6488', label: '環球晶', shares: 1000, price: 0, change: 0, dividend: 0, divMonth: '' }] } });
  await unlock(page);
  await waitForSync(page);
  const stock = (await storedData(page)).stocks[0];
  expect(stock.quoteSymbol).toBe('6488.TWO');
  expect(stock.price).toBe(500);

  await toggleValues(page);
  await openTab(page, '股票');
  expect(await textOf(row(page, '環球晶'))).toContain('NT$ 500,000'); // 台股不乘美元匯率

  const before = mock.log.length;
  await refreshButton(page).click();
  await waitForSync(page);
  const second = mock.log.slice(before).filter(l => l.target.includes('/chart/'));
  expect(second.length).toBeGreaterThan(0);
  expect(second.every(l => l.target.includes('6488.TWO'))).toBe(true);
});

test('股利資料一天只抓一次', async ({ page, mock }) => {
  await openApp(page, { data: { stocks: [tsmc, apple] } });
  await unlock(page);
  await waitForSync(page);
  const [dividends, prices] = [chartRequests(mock, '1mo'), chartRequests(mock, '1d')];
  await refreshButton(page).click();
  await waitForSync(page);
  expect(chartRequests(mock, '1mo')).toBe(dividends);
  expect(chartRequests(mock, '1d')).toBeGreaterThan(prices);
});

test('修改股數立即存檔，不重新抓資料', async ({ page, mock }) => {
  await openApp(page, { data: { stocks: [tsmc, apple] } });
  await unlock(page);
  await waitForSync(page);
  await openTab(page, '股票');
  await row(page, '我的台積電').getByRole('button', { name: '編輯' }).click();
  await entryModal(page).locator('input[placeholder="0.00"]').fill('2000');
  const requestsBefore = mock.log.length;
  await commitButton(page).click();
  await expect(entryModal(page)).toHaveCount(0, { timeout: 1000 });
  const stock = (await storedData(page)).stocks[0];
  expect(mock.log.length).toBe(requestsBefore);
  expect(stock.shares).toBe(2000);
  expect(stock.amount).toBe(2000 * 1050);
  expect(stock.quoteSymbol).toBe('2330.TW');
  expect(stock.priceUpdatedAt).toBeTruthy();
  expect(stock.divUpdatedAt).toBeTruthy();
});

test('新增股票後表單立即關閉，在列表上顯示更新進度', async ({ page, mock }) => {
  mock.delay = { AAPL: 2000 };
  await openApp(page, { data: {} });
  await unlock(page);
  await openNewEntry(page, '股票');
  await expect(commitButton(page)).toBeDisabled(); // 代號空白時不能送出
  await entryModal(page).locator('input[placeholder="0050 / TSLA"]').fill('aapl');
  await entryModal(page).locator('input[placeholder="0.00"]').fill('10');
  await commitButton(page).click();
  await expect(entryModal(page)).toHaveCount(0, { timeout: 1000 });
  await expect(row(page, 'AAPL')).toContainText('更新中'); // 自動切到股票分頁
  await expect(row(page, 'Apple Inc.')).toContainText('更新', { timeout: 10_000 });
  await expect(row(page, 'Apple Inc.')).not.toContainText('更新中');
  const stock = (await storedData(page)).stocks[0];
  expect(stock.price).toBe(200);
  expect(stock.label).toBe('Apple Inc.');
});

test('查不到的代號顯示「更新失敗」', async ({ page }) => {
  await openApp(page, { data: {} });
  await unlock(page);
  await openNewEntry(page, '股票');
  await entryModal(page).locator('input[placeholder="0050 / TSLA"]').fill('ZZZZ');
  await commitButton(page).click();
  await expect(row(page, 'ZZZZ')).toContainText('更新失敗', { timeout: 10_000 });
});

test('同步進行中仍可立即新增其他項目', async ({ page, mock }) => {
  mock.delay = { '2330.TW': 4000, AAPL: 4000 };
  await openApp(page, { data: { stocks: [tsmc, apple] } });
  await unlock(page);
  await expect(page.locator('.animate-spin').first()).toBeVisible();
  await openNewEntry(page, '現金');
  await entryModal(page).locator('input[placeholder="項目說明..."]').fill('NEWCASH');
  await entryModal(page).locator('input[placeholder="0.00"]').fill('500');
  await expect(commitButton(page)).toBeEnabled();
  await commitButton(page).click();
  await expect(entryModal(page)).toHaveCount(0, { timeout: 1000 });
  expect((await storedData(page)).cash).toEqual([expect.objectContaining({ label: 'NEWCASH', amount: 500 })]);
  await expect(page.locator('.animate-spin').first()).toBeVisible(); // 同步還在進行
  await waitForSync(page);
  const data = await storedData(page);
  expect(data.cash).toHaveLength(1);
  expect(data.stocks[0].price).toBe(1050);
});

test('同步中改代號，舊代號的結果不會蓋掉新代號', async ({ page, mock }) => {
  mock.delay = { '2330.TW': 2500 };
  await openApp(page, { data: { stocks: [tsmc] } });
  await unlock(page);
  await openTab(page, '股票');
  await row(page, '我的台積電').getByRole('button', { name: '編輯' }).click();
  await entryModal(page).locator('input[placeholder="0050 / TSLA"]').fill('AAPL');
  await commitButton(page).click();
  await waitForSync(page);
  expect((await storedData(page)).stocks[0]).toMatchObject({ symbol: 'AAPL', price: 200, quoteSymbol: 'AAPL' });
});

test('同步中刪除的股票不會復活', async ({ page, mock }) => {
  mock.delay = { AAPL: 2000, '2330.TW': 2000 };
  await openApp(page, { data: { stocks: [tsmc, apple] } });
  await unlock(page);
  await openTab(page, '股票');
  await row(page, 'AAPL').getByRole('button', { name: '刪除' }).click();
  await waitForSync(page);
  expect((await storedData(page)).stocks.map(s => s.id)).toEqual(['s1']);
});

test('切回 App 與每 5 分鐘自動更新，上鎖後停止', async ({ page, mock }) => {
  await page.clock.install();
  await openApp(page, { data: { stocks: [tsmc] }, storage: { money_god_auto_lock: '-1' } });
  await unlock(page);
  await waitForSync(page);
  const visible = () => page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

  const afterUnlock = chartRequests(mock);
  await visible();
  await page.waitForTimeout(500);
  expect(chartRequests(mock)).toBe(afterUnlock); // 剛同步完不重複更新

  await page.clock.fastForward('01:05');
  await visible();
  await waitForSync(page);
  const afterResume = chartRequests(mock);
  expect(afterResume).toBeGreaterThan(afterUnlock);

  await page.clock.fastForward('05:01');
  await waitForSync(page);
  expect(chartRequests(mock)).toBeGreaterThan(afterResume);

  await lockButton(page).click();
  const afterLock = chartRequests(mock);
  await page.clock.fastForward('10:00');
  await page.waitForTimeout(500);
  expect(chartRequests(mock)).toBe(afterLock);
});
