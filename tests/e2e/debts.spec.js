import { test, expect, openApp, unlock, storedData, row, entryModal, commitButton, openTab, toggleValues, openNewEntry, textOf, undoToast } from './fixtures.js';

const payButton = (page, label) => row(page, label).getByRole('button', { name: '記錄本月已繳' });

test('扣款日 31 號在小月（11/30）可以記錄已繳，並記下年月', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-30T12:00:00+08:00'));
  await openApp(page, { data: { debts: [
    { id: 'd1', label: 'LOAN31', amount: 10000, monthlyPayment: 1000, deductionDay: 31, lastPaidMonth: 0 },
    { id: 'd2', label: 'LEGACYPAID', amount: 5000, monthlyPayment: 500, deductionDay: 1, lastPaidMonth: 11 },
  ] } });
  await unlock(page);
  await openTab(page, '負債');
  await expect(payButton(page, 'LOAN31')).toBeEnabled();
  await payButton(page, 'LOAN31').click();
  // 同時保留舊欄位 lastPaidMonth，讓舊版程式也讀得懂
  expect((await storedData(page)).debts[0]).toMatchObject({ amount: 9000, lastPaidYM: '2026-11', lastPaidMonth: 11 });
  // 舊資料只有 lastPaidMonth：本月已繳仍顯示 PAID，不能重複扣款
  await expect(row(page, 'LEGACYPAID')).toContainText('PAID');
  await expect(payButton(page, 'LEGACYPAID')).toBeDisabled();
});

test('去年同月繳過，今年不會被當成已繳', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-11-30T12:00:00+08:00'));
  await openApp(page, { data: { debts: [{ id: 'd1', label: 'LOAN31', amount: 9000, monthlyPayment: 1000, deductionDay: 31, lastPaidMonth: 11, lastPaidYM: '2026-11' }] } });
  await unlock(page);
  await openTab(page, '負債');
  await expect(row(page, 'LOAN31')).not.toContainText('PAID');
  await expect(payButton(page, 'LOAN31')).toBeEnabled();
});

test('有年利率時已繳只扣本金，且可以復原', async ({ page }) => {
  await openApp(page, { data: { debts: [
    { id: 'd1', label: '房貸', amount: 8500000, monthlyPayment: 32000, deductionDay: 1, annualRate: 2.1 },
    { id: 'd2', label: '車貸', amount: 100000, monthlyPayment: 10000, deductionDay: 1 },
  ] } });
  await unlock(page);
  await toggleValues(page);
  await openTab(page, '負債');
  await expect(row(page, '房貸')).toContainText('年利率 2.1%');

  await payButton(page, '房貸').click();
  // 利息 8,500,000 × 2.1% ÷ 12 = 14,875；本金 32,000 − 14,875 = 17,125
  expect((await storedData(page)).debts[0].amount).toBe(8482875);
  await expect(undoToast(page)).toContainText('本金減少 NT$ 17,125');

  await undoToast(page).getByRole('button', { name: '復原' }).click();
  const restored = (await storedData(page)).debts[0];
  expect(restored.amount).toBe(8500000);
  expect(restored.lastPaidYM).toBeFalsy();
  expect(restored.lastPaidMonth).toBeFalsy();
  await expect(payButton(page, '房貸')).toBeEnabled();

  // 沒填利率時整筆月付金都算本金
  await payButton(page, '車貸').click();
  expect((await storedData(page)).debts[1].amount).toBe(90000);
});

test('年利率欄位：範圍檢查、存檔、編輯時帶出', async ({ page }) => {
  await openApp(page, { data: {} });
  await unlock(page);
  await openNewEntry(page, '負債');
  await entryModal(page).locator('input[placeholder="項目說明..."]').fill('信貸');
  await entryModal(page).locator('input[placeholder="0.00"]').fill('300000');
  await entryModal(page).locator('input[placeholder="0"]').fill('10000');
  const rate = entryModal(page).locator('input[placeholder="例如 2.1"]');
  await rate.fill('150');
  await expect(commitButton(page)).toBeDisabled();
  await expect(entryModal(page)).toContainText('請輸入 0–100');
  await rate.fill('3.5');
  await commitButton(page).click();
  expect((await storedData(page)).debts[0].annualRate).toBe(3.5);
  await row(page, '信貸').getByRole('button', { name: '編輯' }).click();
  await expect(entryModal(page).locator('input[placeholder="例如 2.1"]')).toHaveValue('3.5');
});

test('編輯負債金額會保留繳款紀錄', async ({ page }) => {
  await openApp(page, { data: { debts: [{ id: 'd1', label: 'LOAN', amount: 10000, monthlyPayment: 1000, deductionDay: 1, lastPaidMonth: 3, lastPaidYM: '2026-03' }] } });
  await unlock(page);
  await openTab(page, '負債');
  await row(page, 'LOAN').getByRole('button', { name: '編輯' }).click();
  await entryModal(page).locator('input[placeholder="0.00"]').fill('8000');
  await commitButton(page).click();
  expect((await storedData(page)).debts[0]).toMatchObject({ amount: 8000, lastPaidYM: '2026-03', lastPaidMonth: 3 });
  expect(await textOf(row(page, 'LOAN'))).toContain('LOAN');
});
