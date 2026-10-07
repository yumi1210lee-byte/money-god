import { test, expect, openApp, unlock, waitForSync, storedData, storedItem, settingsPanel, openSettings } from './fixtures.js';

const myData = {
  cash: [{ id: 'c1', label: '我的活存', amount: 123456, currency: 'TWD' }],
  stocks: [{ id: 's1', symbol: '2330', label: '我的台積電', shares: 1000, price: 1000, change: 0, dividend: 0, divMonth: '', divUpdatedAt: Date.now() }],
  debts: [{ id: 'd1', label: '房貸', amount: 5000000, monthlyPayment: 30000, deductionDay: 5, lastPaidMonth: 9, lastPaidYM: '2026-09' }],
  monthlyExpenses: [{ id: 'e1', label: '電話費', amount: 999, day: 10, tag: '民生繳費', cycle: 'monthly' }],
};
const otherData = { cash: [{ id: 'x1', label: '另一份備份', amount: 1, currency: 'TWD' }], stocks: [], debts: [], monthlyExpenses: [] };
const backupFile = data => JSON.stringify({ app: 'money-god', version: 1, exportedAt: '2026-10-01T04:00:00.000Z', data });
const exportButton = page => settingsPanel(page).getByRole('button', { name: '匯出備份' });
const confirmButton = page => settingsPanel(page).getByRole('button', { name: '確認取代' });
const chooseFile = (page, name, text) => settingsPanel(page).locator('input[type=file]').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });

// 模擬 iPhone 的系統分享選單：只接受指定的檔案類型，並記下分享出去的檔案
const stubShare = acceptedTypes => `
  window.__shared = null;
  navigator.canShare = data => !!data.files && data.files.every(f => ${JSON.stringify(acceptedTypes)}.includes(f.type));
  navigator.share = async data => { window.__shared = { name: data.files[0].name, type: data.files[0].type, text: await data.files[0].text() }; };
`;

test('不支援分享時改用下載，備份內容等於目前資料且不含密碼', async ({ page }) => {
  await openApp(page, { data: myData });
  await unlock(page);
  await waitForSync(page);
  await openSettings(page);
  await expect(settingsPanel(page)).toContainText('尚未匯出過備份');
  const [download] = await Promise.all([page.waitForEvent('download'), exportButton(page).click()]);
  expect(download.suggestedFilename()).toMatch(/^money-god-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const text = Buffer.concat(await (await download.createReadStream()).toArray()).toString();
  const backup = JSON.parse(text);
  expect(backup).toMatchObject({ app: 'money-god', version: 1 });
  expect(backup.data).toEqual(await storedData(page));
  expect(text).not.toContain('asset_terminal_pass');
  await expect(settingsPanel(page)).toContainText('已匯出備份');
  await expect(settingsPanel(page)).toContainText('上次匯出：');
});

test('支援分享時用系統分享選單分享 .json 檔', async ({ page }) => {
  await page.addInitScript(stubShare(['application/json']));
  await openApp(page, { data: myData });
  await unlock(page);
  await openSettings(page);
  await exportButton(page).click();
  await expect.poll(() => page.evaluate(() => window.__shared?.name)).toMatch(/\.json$/);
  const shared = await page.evaluate(() => window.__shared);
  expect(shared.type).toBe('application/json');
  expect(JSON.parse(shared.text).app).toBe('money-god');
});

test('不能分享 JSON 時改分享 .txt 檔', async ({ page }) => {
  await page.addInitScript(stubShare(['text/plain']));
  await openApp(page, { data: myData });
  await unlock(page);
  await openSettings(page);
  await exportButton(page).click();
  await expect.poll(() => page.evaluate(() => window.__shared?.name)).toMatch(/\.txt$/);
  expect(await page.evaluate(() => window.__shared.type)).toBe('text/plain');
});

test('關掉分享選單不算失敗，也不記錄為已匯出', async ({ page }) => {
  await page.addInitScript(`navigator.canShare = () => true; navigator.share = async () => { throw new DOMException('cancel', 'AbortError'); };`);
  await openApp(page, { data: myData });
  await unlock(page);
  await openSettings(page);
  await exportButton(page).click();
  await page.waitForTimeout(300);
  await expect(settingsPanel(page)).not.toContainText('匯出失敗');
  await expect(settingsPanel(page)).not.toContainText('已匯出備份');
  await expect(settingsPanel(page)).toContainText('尚未匯出過備份');
});

test('匯入前先確認；取代後可以還原（還原也要確認）', async ({ page }) => {
  await openApp(page, { data: myData });
  await unlock(page);
  await openSettings(page);
  await chooseFile(page, 'other.json', backupFile(otherData));
  await expect(settingsPanel(page)).toContainText('匯入「other.json」');
  await expect(settingsPanel(page)).toContainText('現金 1 筆・股票 0 筆・負債 0 筆・支出 0 筆');
  await expect(settingsPanel(page)).toContainText('備份時間：2026/10/1');
  expect((await storedData(page)).cash[0].label).toBe('我的活存');

  await settingsPanel(page).getByRole('button', { name: '取消' }).click();
  await expect(confirmButton(page)).toHaveCount(0);
  expect((await storedData(page)).cash[0].label).toBe('我的活存');

  await chooseFile(page, 'other.json', backupFile(otherData));
  await confirmButton(page).click();
  const replaced = await storedData(page);
  expect(replaced.cash.map(c => c.label)).toEqual(['另一份備份']);
  expect(replaced.stocks).toEqual([]);

  await settingsPanel(page).getByRole('button', { name: '還原上一次匯入前的資料' }).click();
  await expect(settingsPanel(page)).toContainText('現金 1 筆・股票 1 筆・負債 1 筆・支出 1 筆');
  expect((await storedData(page)).cash[0].label).toBe('另一份備份');
  await confirmButton(page).click();
  const restored = await storedData(page);
  expect(restored.debts).toEqual(myData.debts);
  expect(restored.cash[0].label).toBe('我的活存');
  expect(restored.stocks[0].label).toBe('我的台積電');
});

test('無效的檔案顯示錯誤，資料不受影響', async ({ page }) => {
  await openApp(page, { data: myData });
  await unlock(page);
  await openSettings(page);
  for (const [name, text] of [['a.json', 'not json at all'], ['b.json', '{"hello": 1}'], ['c.json', '{"cash": "oops"}'], ['d.json', '[1,2,3]']]) {
    await chooseFile(page, name, text);
    await expect(settingsPanel(page), name).toContainText('這不是有效的 Money God 備份檔');
    await expect(confirmButton(page), name).toHaveCount(0);
  }
  expect((await storedData(page)).cash[0].label).toBe('我的活存');
});

test('也接受直接的資料格式，缺少的分類與 id 會自動補上', async ({ page }) => {
  await openApp(page, { data: myData });
  await unlock(page);
  await openSettings(page);
  await chooseFile(page, 'raw.txt', JSON.stringify({ cash: [{ label: '沒有 id', amount: 5, currency: 'TWD' }] }));
  await confirmButton(page).click();
  const data = await storedData(page);
  expect(data.cash).toHaveLength(1);
  expect(data.cash[0].id).toBeTruthy();
  expect(data.stocks).toEqual([]);
  expect(data.monthlyExpenses).toEqual([]);
});

test('匯出的檔案在另一台裝置匯入後資料一致', async ({ page, browser, baseURL }) => {
  await openApp(page, { data: myData });
  await unlock(page);
  await waitForSync(page);
  await openSettings(page);
  const [download] = await Promise.all([page.waitForEvent('download'), exportButton(page).click()]);
  const exported = Buffer.concat(await (await download.createReadStream()).toArray()).toString();

  // 另一台裝置：全新的瀏覽器環境
  const otherDevice = await browser.newContext({ baseURL });
  const other = await otherDevice.newPage();
  await other.route(/fonts\.googleapis|er-api|allorigins|codetabs/, route => route.abort());
  await openApp(other, { data: {} });
  await unlock(other);
  await openSettings(other);
  await chooseFile(other, 'money-god-backup.json', exported);
  await confirmButton(other).click();
  await other.reload();
  // 股價相關欄位會在匯入後重新抓取，不列入比較
  const withoutQuote = stock => {
    const copy = { ...stock };
    for (const key of ['priceUpdatedAt', 'quoteSymbol', 'quoteCurrency', 'price', 'change', 'amount']) delete copy[key];
    return copy;
  };
  const imported = await storedData(other);
  const original = JSON.parse(exported).data;
  expect({ ...imported, stocks: imported.stocks.map(withoutQuote) }).toEqual({ ...original, stocks: original.stocks.map(withoutQuote) });
  expect(await storedItem(other, 'money_god_v55_before_import')).toBeTruthy();
  await otherDevice.close();
});

test('匯入後會自動更新股價', async ({ page }) => {
  await openApp(page, { data: {} });
  await unlock(page);
  await openSettings(page);
  await chooseFile(page, 'b.json', backupFile(myData));
  await confirmButton(page).click();
  await expect.poll(async () => (await storedData(page)).stocks[0].price).toBe(1050);
});
