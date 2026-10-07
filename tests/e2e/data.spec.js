import { test, expect, openApp, unlock, storedData } from './fixtures.js';

test('重新整理後保留使用者的資料', async ({ page }) => {
  await openApp(page, { data: { cash: [{ id: 'mine', label: 'MY OWN CASH', amount: 777, currency: 'TWD' }] } });
  await page.reload();
  await page.waitForTimeout(500);
  expect((await storedData(page)).cash.map(c => c.label)).toEqual(['MY OWN CASH']);
});

test('舊格式資料缺少分類時不會白畫面', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('./');
  await page.evaluate(() => {
    localStorage.setItem('asset_terminal_pass', '1234');
    localStorage.setItem('money_god_v55', JSON.stringify({ cash: [{ id: 'x', label: 'OLD', amount: 1, currency: 'TWD' }] }));
  });
  await page.reload();
  await unlock(page);
  expect(errors).toEqual([]);
  expect((await storedData(page)).monthlyExpenses).toEqual([]);
});
