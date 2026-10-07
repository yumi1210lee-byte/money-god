import { test, expect, openApp, unlock, storedItem, settingsPanel, entryModal, toggleValues, openSettings, closeSettings, openNewEntry } from './fixtures.js';

// 讓測試可以模擬 App 切到背景（document.visibilityState = 'hidden'）再回來
const simulateVisibility = `
  window.__visibility = 'visible';
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__visibility });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__visibility === 'hidden' });
`;
const setVisibility = (page, state) => page.evaluate(s => { window.__visibility = s; document.dispatchEvent(new Event('visibilitychange')); }, state);
const lockScreen = page => page.getByText('Start Session');
const optionButton = (page, label) => settingsPanel(page).getByRole('button', { name: label, exact: true });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(simulateVisibility);
  await page.clock.install();
});

test('預設離開超過 1 分鐘回來自動上鎖，並隱藏金額、關閉視窗', async ({ page }) => {
  await openApp(page, { data: { cash: [{ id: 'c', label: 'A', amount: 5, currency: 'TWD' }] } });
  await unlock(page);

  await setVisibility(page, 'hidden');
  await page.clock.fastForward('00:30');
  await setVisibility(page, 'visible');
  await expect(lockScreen(page)).toHaveCount(0);

  await toggleValues(page);
  await openNewEntry(page);
  await setVisibility(page, 'hidden');
  await page.clock.fastForward('01:01');
  await setVisibility(page, 'visible');
  await expect(lockScreen(page)).toBeVisible();

  await unlock(page);
  await expect(entryModal(page)).toHaveCount(0);
  await expect(page.locator('main h2')).toContainText('XXXXX');
});

test('設定「立即」「不自動」「5 分鐘」，並在重新開啟後保留', async ({ page }) => {
  await openApp(page, { data: {} });
  await unlock(page);
  await openSettings(page);
  await expect(optionButton(page, '1 分鐘')).toHaveClass(/bg-\[#506384\]/);

  await optionButton(page, '立即').click();
  expect(await storedItem(page, 'money_god_auto_lock')).toBe('0');
  await closeSettings(page);
  await setVisibility(page, 'hidden');
  await expect(lockScreen(page)).toBeVisible();
  await setVisibility(page, 'visible');

  await unlock(page);
  await openSettings(page);
  await optionButton(page, '不自動').click();
  await closeSettings(page);
  await setVisibility(page, 'hidden');
  await page.clock.fastForward('10:00');
  await setVisibility(page, 'visible');
  await expect(lockScreen(page)).toHaveCount(0);

  await openSettings(page);
  await optionButton(page, '5 分鐘').click();
  await page.reload();
  await unlock(page);
  await openSettings(page);
  await expect(optionButton(page, '5 分鐘')).toHaveClass(/bg-\[#506384\]/);
});
