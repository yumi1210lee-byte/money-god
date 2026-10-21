import { test, expect, openApp, unlock, waitForSync, storedData, row, entryModal, commitButton, openTab, toggleValues, openNewEntry, textOf } from './fixtures.js';

const cash = [
  { id: 'c1', label: '台幣活存', amount: 1000, currency: 'TWD' },
  { id: 'c2', label: '美元定存', amount: 100.5, currency: 'USD' },
  { id: 'c3', label: '歐元帳戶', amount: 1000, currency: 'EUR' },
  { id: 'c4', label: '日圓帳戶', amount: 500000, currency: 'JPY' },
  { id: 'c5', label: '人民幣帳戶', amount: 2000, currency: 'CNY' },
  { id: 'c6', label: '新幣帳戶', amount: 300, currency: 'SGD' },
];
const breakdown = page => page.getByRole('list', { name: '各幣別合計' });

test('外幣存款以原幣顯示並依匯率換算台幣，列出各幣別合計', async ({ page }) => {
  await openApp(page, { data: { cash } });
  await unlock(page);
  await waitForSync(page);
  await openTab(page, '現金');
  await expect(breakdown(page)).not.toContainText('JPY');
  await toggleValues(page);

  const expected = {
    美元定存: ['US$ 100.50', '≈ NT$ 3,015'],
    歐元帳戶: ['EUR 1,000.00', '≈ NT$ 37,500'],
    日圓帳戶: ['JPY 500,000', '≈ NT$ 100,000'],
    人民幣帳戶: ['CNY 2,000.00', '≈ NT$ 8,000'],
    新幣帳戶: ['SGD 300.00', '≈ NT$ 7,500'],
  };
  for (const [label, parts] of Object.entries(expected)) {
    const text = await textOf(row(page, label));
    for (const part of parts) expect(text, label).toContain(part);
  }
  const twd = await textOf(row(page, '台幣活存'));
  expect(twd).toContain('NT$ 1,000');
  expect(twd).not.toContain('≈');

  // 1,000 + 3,015 + 37,500 + 100,000 + 8,000 + 7,500
  await expect(page.locator('main')).toContainText('NT$ 157,015');
  const list = await textOf(breakdown(page));
  expect(list).toContain('台幣 NT$ 1,000');
  expect(list).toContain('日圓 JPY 500,000 ≈ NT$ 100,000');
  expect(list).toContain('新加坡幣 SGD 300.00 ≈ NT$ 7,500');

  await openTab(page, '總覽');
  await expect(page.locator('main')).toContainText('NT$ 157,015');
});

test('新增與編輯外幣帳戶', async ({ page }) => {
  await openApp(page, { data: {} });
  await unlock(page);
  await openNewEntry(page, '現金');
  const modes = entryModal(page).getByRole('group', { name: '幣別' });
  await expect(modes.getByRole('button')).toHaveCount(6);
  await expect(modes.getByRole('button', { name: /台幣/ })).toHaveAttribute('aria-pressed', 'true');
  await entryModal(page).locator('input[placeholder="項目說明..."]').fill('東京旅費');
  await modes.getByRole('button', { name: /日圓/ }).click();
  await expect(modes.getByRole('button', { name: /日圓/ })).toHaveAttribute('aria-pressed', 'true');
  await entryModal(page).locator('input[placeholder="0.00"]').fill('120000');
  await commitButton(page).click();
  expect((await storedData(page)).cash.at(-1)).toMatchObject({ label: '東京旅費', amount: 120000, currency: 'JPY' });

  await toggleValues(page);
  await openTab(page, '現金');
  expect(await textOf(row(page, '東京旅費'))).toContain('JPY 120,000 ≈ NT$ 24,000');
  await row(page, '東京旅費').getByRole('button', { name: '編輯' }).click();
  await expect(modes.getByRole('button', { name: /日圓/ })).toHaveAttribute('aria-pressed', 'true');
});

test('只有台幣帳戶時不顯示各幣別合計', async ({ page }) => {
  await openApp(page, { data: { cash: [cash[0]] } });
  await unlock(page);
  await openTab(page, '現金');
  await expect(breakdown(page)).toHaveCount(0);
});

test('第一次使用就抓不到匯率時，外幣用預設的概略匯率換算', async ({ page, mock }) => {
  mock.rateFails = true;
  await openApp(page, { data: { cash: [{ id: 'j', label: '日圓帳戶', amount: 100000, currency: 'JPY' }] } });
  await unlock(page);
  await waitForSync(page);
  await toggleValues(page);
  await openTab(page, '現金');
  // 預設 1 USD = 32.5 TWD = 150 JPY，100,000 日圓約 21,667 台幣
  expect(await textOf(row(page, '日圓帳戶'))).toContain('≈ NT$ 21,667');
});
