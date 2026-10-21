import { test, expect, openApp, unlock, waitForSync, storedData, row, entryModal, commitButton, openTab, toggleValues, openNewEntry, refreshButton, openSettings, settingsPanel, textOf } from './fixtures.js';

// 模擬金價：每公克 100 美元 × 匯率 30 = 3,000 台幣；1 錢 = 3.75 公克 = 11,250 台幣；今日每公克漲 30 台幣
const OUNCE = 31.1034768;
const coin = { id: 'g1', kind: 'gold', label: '金幣', grams: OUNCE, unit: 'g', costTotal: 0, price: 0, change: 0 };
const summary = page => page.getByRole('list', { name: '黃金合計' });

test('以「錢」新增黃金：依國際金價換算台幣，顯示市值、今日漲跌與損益', async ({ page, mock }) => {
  await openApp(page, { data: {} });
  await unlock(page);
  await openNewEntry(page, '期貨');
  const units = entryModal(page).getByRole('group', { name: '重量單位' });
  await expect(units.getByRole('button', { name: '公克' })).toHaveAttribute('aria-pressed', 'true');
  await entryModal(page).locator('input[placeholder="項目說明..."]').fill('台銀金條');
  await units.getByRole('button', { name: '錢' }).click();
  const weight = entryModal(page).locator('input[placeholder="幾錢"]');
  await expect(weight).toHaveAttribute('inputmode', 'decimal');
  await weight.fill('0');
  await expect(commitButton(page)).toBeDisabled();
  await expect(entryModal(page)).toContainText('請輸入大於 0 的數字');
  await weight.fill('10');
  await expect(entryModal(page)).toContainText('＝ 10 錢（37.5 公克）');
  await entryModal(page).locator('input[placeholder="買進花費的台幣總額"]').fill('110000');
  await commitButton(page).click();
  await waitForSync(page);

  const saved = (await storedData(page)).futures[0];
  expect(saved).toMatchObject({ kind: 'gold', label: '台銀金條', grams: 37.5, unit: 'qian', costTotal: 110000 });
  expect(saved.price).toBeCloseTo(100 * OUNCE, 6);
  expect(mock.log.some(l => l.kind === 'worker' && l.target.includes('/chart/GC%3DF?'))).toBe(true);

  await toggleValues(page);
  await expect(page.locator('main').getByRole('button', { name: '期貨', exact: true })).toHaveClass(/bg-\[#506384\]/);
  const text = await textOf(row(page, '台銀金條'));
  expect(text).toContain('10 錢（37.5 公克）');
  expect(text).toContain('NT$ 112,500');          // 37.5 × 3,000
  expect(text).toContain('+NT$ 1,125');           // 37.5 × 30
  expect(text).toContain('@ 3,110.35 USD/OZ');
  expect(text).toContain('總投入 NT$ 110,000');
  expect(text).toContain('損益 +NT$ 2,500（+2.3%）');
  expect(text).not.toContain('年股利');

  const card = await textOf(summary(page));
  expect(card).toContain('黃金合計 37.5 公克（10 錢）');
  expect(card).toContain('今日漲跌 +NT$ 1,125');
  expect(card).toContain('金價 NT$ 3,000 / 公克・NT$ 11,250 / 錢');

  await openTab(page, '總覽');
  await expect(page.locator('main')).toContainText('期貨總額');
  await expect(page.locator('main')).toContainText('黃金 37.5 公克（10 錢）');
  // 總資產只有這筆黃金
  await expect(page.locator('main div', { hasText: /^Assets \/ 總資產/ }).first()).toContainText('NT$ 112,500');
});

test('以公克記錄、沒填成本時不顯示損益；編輯時保留原本的單位與數字', async ({ page }) => {
  await openApp(page, { data: { futures: [coin] } });
  await unlock(page);
  await waitForSync(page);
  await toggleValues(page);
  await openTab(page, '期貨');
  const text = await textOf(row(page, '金幣'));
  expect(text).toContain('31.1 公克（8.29 錢）');
  expect(text).toContain('NT$ 93,310');           // 1 盎司 = 31.1035 公克 × 3,000
  expect(text).not.toContain('損益');

  await row(page, '金幣').getByRole('button', { name: '編輯' }).click();
  const units = entryModal(page).getByRole('group', { name: '重量單位' });
  await expect(units.getByRole('button', { name: '公克' })).toHaveAttribute('aria-pressed', 'true');
  await expect(entryModal(page).locator('input[placeholder="幾公克"]')).toHaveValue(String(OUNCE));
  await commitButton(page).click();
  expect((await storedData(page)).futures[0].grams).toBe(OUNCE);
});

test('沒填名稱時叫「黃金」；抓不到金價時顯示更新失敗並保留上次的價格', async ({ page, mock }) => {
  await openApp(page, { data: { futures: [{ ...coin, price: 90 * OUNCE, change: 0, priceUpdatedAt: Date.now() - 3600_000 }] } });
  await unlock(page);
  await waitForSync(page);
  mock.fail = { worker: true, raw: true, codetabs: true, get: true };
  await openTab(page, '期貨');
  await refreshButton(page).click();
  await waitForSync(page);
  await expect(row(page, '金幣')).toContainText('更新失敗');
  expect((await storedData(page)).futures[0].price).toBeCloseTo(100 * OUNCE, 6);

  await openNewEntry(page, '期貨');
  await entryModal(page).locator('input[placeholder="幾公克"]').fill('5');
  await commitButton(page).click();
  const added = (await storedData(page)).futures.at(-1);
  expect(added).toMatchObject({ label: '黃金', grams: 5, unit: 'g' });
});

test('備份會包含期貨分頁的黃金，匯入時也會還原', async ({ page }) => {
  await openApp(page, { data: { futures: [coin] } });
  await unlock(page);
  await waitForSync(page);
  await openSettings(page);
  const [download] = await Promise.all([page.waitForEvent('download'), settingsPanel(page).getByRole('button', { name: '匯出備份' }).click()]);
  const backup = JSON.parse(Buffer.concat(await (await download.createReadStream()).toArray()).toString());
  expect(backup.data.futures).toEqual((await storedData(page)).futures);
  expect(backup.data.futures[0]).toMatchObject({ label: '金幣', grams: OUNCE });

  const other = { cash: [], stocks: [], futures: [{ ...coin, id: 'g9', label: '另一份金條', grams: 75, unit: 'qian' }], debts: [], monthlyExpenses: [] };
  await settingsPanel(page).locator('input[type=file]').setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ app: 'money-god', version: 1, data: other })) });
  await expect(settingsPanel(page)).toContainText('期貨 1 筆');
  await settingsPanel(page).getByRole('button', { name: '確認取代' }).click();
  await expect.poll(async () => (await storedData(page)).futures.map(f => f.label)).toEqual(['另一份金條']);
});
