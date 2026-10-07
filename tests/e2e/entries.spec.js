import { test, expect, openApp, unlock, waitForSync, storedData, row, entryModal, settingsPanel, commitButton, openTab, toggleValues, openSettings, closeSettings, openNewEntry, closeEntryModal, textOf, undoToast, lockButton } from './fixtures.js';

test('刪除後可以在 6 秒內復原，並放回原本位置', async ({ page }) => {
  const cash = ['第一筆', '第二筆', '第三筆'].map((label, i) => ({ id: `c${i}`, label, amount: i + 1, currency: 'TWD' }));
  await openApp(page, { data: { cash } });
  await unlock(page);
  await openTab(page, '現金');

  // 按鈕至少 40×40，避免誤觸
  for (const name of ['編輯', '刪除']) {
    const box = await row(page, '第二筆').getByRole('button', { name }).boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(40);
    expect(box.height).toBeGreaterThanOrEqual(40);
  }

  await row(page, '第二筆').getByRole('button', { name: '刪除' }).click();
  await expect(undoToast(page)).toContainText('已刪除「第二筆」');
  expect((await storedData(page)).cash).toHaveLength(2);
  await undoToast(page).getByRole('button', { name: '復原' }).click();
  await expect(undoToast(page)).toHaveCount(0);
  expect((await storedData(page)).cash.map(c => c.label)).toEqual(['第一筆', '第二筆', '第三筆']);

  await row(page, '第三筆').getByRole('button', { name: '刪除' }).click();
  await expect(undoToast(page)).toBeVisible();
  await expect(undoToast(page)).toHaveCount(0, { timeout: 8000 });
  expect((await storedData(page)).cash).toHaveLength(2);
});

test('先選 USD 再切到股票，股票不會被存成 USD；舊資料中的 USD 股票仍以台幣顯示', async ({ page }) => {
  await openApp(page, { data: { stocks: [{ id: 'u1', symbol: 'AAPL', label: 'LEAKED', currency: 'USD', shares: 10, price: 200, change: 2, amount: 2000, dividend: 0, divMonth: '', divUpdatedAt: Date.now() }] } });
  await unlock(page);
  await waitForSync(page);
  await toggleValues(page);
  await openTab(page, '股票');
  const text = await textOf(row(page, 'LEAKED'));
  expect(text).toContain('NT$ 60,000');
  expect(text).not.toContain('US$');

  await openNewEntry(page, '現金');
  await entryModal(page).getByRole('button', { name: 'USD' }).click();
  await entryModal(page).getByRole('button', { name: '股票', exact: true }).click();
  await entryModal(page).locator('input[placeholder="0050 / TSLA"]').fill('AAPL');
  await entryModal(page).locator('input[placeholder="0.00"]').fill('5');
  await commitButton(page).click();
  expect((await storedData(page)).stocks[1].currency).toBe('TWD');
});

test('月份、日期、扣款日超出範圍時無法送出', async ({ page }) => {
  await openApp(page, { data: {} });
  await unlock(page);
  await openNewEntry(page, '支出');
  await entryModal(page).locator('input[placeholder="項目說明..."]').fill('保險費');
  await entryModal(page).locator('input[placeholder="0.00"]').fill('12000');
  await entryModal(page).getByRole('button', { name: '年繳' }).click();
  const month = entryModal(page).locator('input[max="12"]');
  const day = entryModal(page).locator('input[max="31"]');

  await month.fill('13');
  await expect(commitButton(page)).toBeDisabled();
  await expect(entryModal(page)).toContainText('請輸入 1–12');
  await month.fill('12');
  await day.fill('40');
  await expect(commitButton(page)).toBeDisabled();
  await expect(entryModal(page)).toContainText('請輸入 1–31');
  await day.fill('');
  await expect(commitButton(page)).toBeDisabled();
  await day.fill('15');
  await expect(commitButton(page)).toBeEnabled();
  await expect(entryModal(page)).not.toContainText('請輸入');
  await commitButton(page).click();
  expect((await storedData(page)).monthlyExpenses[0]).toMatchObject({ month: '12', day: 15, cycle: 'yearly' });

  await openNewEntry(page, '負債');
  await entryModal(page).locator('input[placeholder="項目說明..."]').fill('車貸');
  const payDay = entryModal(page).locator('input[max="31"]');
  await payDay.fill('0');
  await expect(commitButton(page)).toBeDisabled();
  await payDay.fill('31');
  await expect(commitButton(page)).toBeEnabled();
});

test('數字欄位使用數字鍵盤', async ({ page }) => {
  await openApp(page, { data: {} });
  await expect(page.locator('input[type=password]')).toHaveAttribute('inputmode', 'numeric');
  await unlock(page);
  const field = selector => entryModal(page).locator(selector);

  await openNewEntry(page);
  await expect(field('input[placeholder="0.00"]')).toHaveAttribute('inputmode', 'decimal');
  await entryModal(page).getByRole('button', { name: '股票', exact: true }).click();
  await expect(field('input[placeholder="0.00"]')).toHaveAttribute('inputmode', 'decimal');
  await entryModal(page).getByRole('button', { name: '支出', exact: true }).click();
  await expect(field('input[max="31"]')).toHaveAttribute('inputmode', 'numeric');
  await entryModal(page).getByRole('button', { name: '負債', exact: true }).click();
  await expect(field('input[placeholder="0"]')).toHaveAttribute('inputmode', 'decimal');
  await expect(field('input[placeholder="例如 2.1"]')).toHaveAttribute('inputmode', 'decimal');
  await expect(field('input[max="31"]')).toHaveAttribute('inputmode', 'numeric');
  await closeEntryModal(page);

  await openSettings(page);
  await expect(settingsPanel(page).locator('input[placeholder="New Passcode"]')).toHaveAttribute('inputmode', 'numeric');
});

test('密碼含英文字母時保留完整鍵盤；第一次設定用數字鍵盤', async ({ page }) => {
  await openApp(page, { data: {}, passcode: 'abc1' });
  expect(await page.locator('input[type=password]').getAttribute('inputmode')).toBeNull();
  await openApp(page, { data: {}, passcode: null });
  await expect(page.locator('input[type=password]')).toHaveAttribute('inputmode', 'numeric');
});

test('修改密碼：失敗時說明原因，成功後可以用新密碼解鎖', async ({ page }) => {
  await openApp(page, { data: {} });
  await unlock(page);
  await openSettings(page);
  const [oldPass, newPass, confirmPass] = ['Old Passcode', 'New Passcode', 'Confirm New'].map(p => settingsPanel(page).locator(`input[placeholder="${p}"]`));
  const submit = () => settingsPanel(page).getByRole('button', { name: 'Update Security' }).click();

  await oldPass.fill('0000'); await newPass.fill('5678'); await confirmPass.fill('5678'); await submit();
  await expect(settingsPanel(page)).toContainText('舊密碼不正確');
  await oldPass.fill('1234');
  await expect(settingsPanel(page)).not.toContainText('舊密碼不正確');
  await newPass.fill('56'); await confirmPass.fill('56'); await submit();
  await expect(settingsPanel(page)).toContainText('新密碼至少需要 4 碼');
  await newPass.fill('5678'); await confirmPass.fill('5679'); await submit();
  await expect(settingsPanel(page)).toContainText('兩次輸入的新密碼不一致');
  expect(await page.evaluate(() => localStorage.getItem('asset_terminal_pass'))).toBe('1234');

  await confirmPass.fill('5678'); await submit();
  await expect(settingsPanel(page)).toContainText('密碼已更新');
  await expect(oldPass).toHaveValue('');
  await closeSettings(page);
  await lockButton(page).click();
  await unlock(page, '5678');
});
