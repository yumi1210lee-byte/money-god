import { test, expect, openApp, storedData } from './fixtures.js';

// 開發模式下 React StrictMode 會讓 effect 執行兩次；曾經因此在重新整理時用範例資料蓋掉使用者資料
test('開發模式重新整理後保留使用者的資料', async ({ page }) => {
  await openApp(page, { data: { cash: [{ id: 'mine', label: 'MY OWN CASH', amount: 777, currency: 'TWD' }] } });
  await page.waitForTimeout(1000);
  expect((await storedData(page)).cash.map(c => c.label)).toEqual(['MY OWN CASH']);
});
