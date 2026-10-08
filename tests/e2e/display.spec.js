import { test, expect, openApp, unlock, waitForSync, storedData, storedItem, row, openTab, toggleValues, openSettings, closeSettings, openNewEntry, closeEntryModal, textOf } from './fixtures.js';

test('金額標示 NT$ / US$，美元帳戶顯示換算台幣，外國股價標示幣別', async ({ page }) => {
  await openApp(page, { data: {
    cash: [{ id: 'c1', label: '台幣', amount: 1000, currency: 'TWD' }, { id: 'c2', label: '美元帳戶', amount: 100, currency: 'USD' }],
    stocks: [{ id: 's', symbol: 'AAPL', label: 'APPLE', shares: 1, price: 0, change: 0, dividend: 0, divMonth: '' }],
  } });
  await unlock(page);
  await waitForSync(page);
  await toggleValues(page);
  expect(await textOf(page.locator('main h2'))).toMatch(/^NT\$/);
  await openTab(page, '現金');
  const usd = await textOf(row(page, '美元帳戶'));
  expect(usd).toContain('US$ 100');
  expect(usd).toContain('≈ NT$ 3,000');
  expect(await textOf(row(page, '台幣'))).toContain('NT$ 1,000');
  await openTab(page, '股票');
  expect(await textOf(row(page, 'APPLE'))).toContain('@ 200.00 USD');
});

test('股價與每股成本至少顯示 2 位小數，台股不會被四捨五入到 1 位', async ({ page }) => {
  await openApp(page, { data: { stocks: [
    { id: 'b1', symbol: '00679B', label: '美債ETF', shares: 1000, price: 0, change: 0, dividend: 0, divMonth: '', costPrice: 27.8532 },
    { id: 't1', symbol: '2330', label: '台積電', shares: 1, price: 0, change: 0, dividend: 0, divMonth: '', costPrice: 620 },
  ] } });
  await unlock(page);
  await waitForSync(page);
  await toggleValues(page);
  await openTab(page, '股票');
  const bond = await textOf(row(page, '美債ETF'));
  expect(bond).toContain('@ 27.85');
  expect(bond).not.toContain('27.9');
  expect(bond).toContain('成本 27.8532');
  const tsmc = await textOf(row(page, '台積電'));
  expect(tsmc).toContain('@ 1,050.00');
  expect(tsmc).toContain('成本 620.00');
});

test('外國股票依報價幣別換算（日圓、英鎊便士）', async ({ page }) => {
  await openApp(page, { data: { stocks: [
    { id: 'j1', symbol: '7203.T', label: 'TOYOTA', shares: 100, price: 0, change: 0, dividend: 0, divMonth: '' },
    { id: 'g1', symbol: 'VOD.L', label: 'VODAFONE', shares: 1000, price: 0, change: 0, dividend: 0, divMonth: '' },
  ] } });
  await unlock(page);
  await waitForSync(page);
  expect((await storedData(page)).stocks.map(s => s.quoteCurrency)).toEqual(['JPY', 'GBp']);
  await toggleValues(page);
  await openTab(page, '股票');
  const toyota = await textOf(row(page, 'TOYOTA'));
  expect(toyota).toContain('NT$ 60,000');  // 100 × 3000 × 30 / 150
  expect(toyota).toContain('+NT$ 1,000');  // 100 × 50 × 0.2
  expect(await textOf(row(page, 'VODAFONE'))).toContain('NT$ 28,000'); // 1000 × 70 ÷ 100 × 30 / 0.75
});

test('匯率會存起來，抓取失敗時沿用上次的匯率', async ({ page, mock }) => {
  const usdCash = { cash: [{ id: 'c1', label: 'USD帳戶', amount: 100, currency: 'USD' }] };
  await openApp(page, { data: usdCash });
  await unlock(page);
  await waitForSync(page);
  expect(JSON.parse(await storedItem(page, 'money_god_fx'))).toMatchObject({ TWD: 30, JPY: 150 });

  mock.rateFails = true;
  await openApp(page, { data: usdCash, storage: { money_god_fx: JSON.stringify({ USD: 1, TWD: 30 }) } });
  await unlock(page);
  await waitForSync(page);
  await toggleValues(page);
  await openTab(page, '現金');
  // 100 × 30 = 3,000，而不是預設匯率 32.5 的 3,250
  await expect(page.locator('main div.p-6', { hasText: 'Cash Total' })).toContainText('NT$ 3,000');
});

test('所有畫面的文字至少 11 px，長名稱不會蓋到金額', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await openApp(page, { data: {
    cash: [{ id: 'c2', label: '美元帳戶', amount: 100, currency: 'USD' }],
    stocks: [{ id: 's', symbol: '2330', label: '台積電', shares: 12000, price: 1085, change: 15, dividend: 5, divMonth: '1,4,7,10', divUpdatedAt: Date.now() }],
    debts: [{ id: 'd', label: '這是一個名稱非常非常長的房屋貸款項目', amount: 18500000, monthlyPayment: 32000, deductionDay: 5, annualRate: 2.1 }],
    monthlyExpenses: [{ id: 'e', label: '保險', amount: 18000, day: 20, month: '3', tag: '保險', cycle: 'yearly' }],
  } });
  await unlock(page);
  await waitForSync(page);
  await toggleValues(page);

  const smallestText = () => page.evaluate(() => {
    let min = { size: 99, text: '' };
    document.querySelectorAll('body *').forEach(el => {
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < min.size) min = { size, text: el.textContent.trim().slice(0, 20) };
    });
    return min;
  });
  const screens = [];
  for (const tab of ['總覽', '現金', '股票', '負債', '支出']) {
    await openTab(page, tab);
    screens.push({ screen: tab, ...(await smallestText()) });
  }
  await openSettings(page);
  screens.push({ screen: '設定', ...(await smallestText()) });
  await closeSettings(page);
  for (const type of ['現金', '股票', '負債', '支出']) {
    await openNewEntry(page, type);
    screens.push({ screen: `新增${type}`, ...(await smallestText()) });
    await closeEntryModal(page);
  }
  expect(screens.filter(s => s.size < 11)).toEqual([]);
  expect(errors).toEqual([]);

  await openTab(page, '負債');
  const debtRow = row(page, '這是一個名稱');
  const name = await debtRow.locator('p').first().boundingBox();
  const value = await debtRow.locator('.font-pixel.text-sm').first().boundingBox();
  expect(name.x + name.width).toBeLessThanOrEqual(value.x);
});

test('只有圖示的按鈕都有名稱（VoiceOver 讀得出來）', async ({ page }) => {
  await openApp(page, { data: {
    cash: [{ id: 'c', label: 'A', amount: 1, currency: 'TWD' }],
    stocks: [{ id: 's', symbol: '2330', label: '台積電', shares: 1, price: 1, change: 0, dividend: 0, divMonth: '' }],
    debts: [{ id: 'd', label: '房貸', amount: 100, monthlyPayment: 10, deductionDay: 1 }],
    monthlyExpenses: [{ id: 'e', label: '保險', amount: 1, day: 1, tag: '保險', cycle: 'monthly' }],
  } });
  const unnamedButtons = () => page.evaluate(() => [...document.querySelectorAll('button')]
    .filter(b => !b.textContent.trim() && !b.getAttribute('aria-label'))
    .map(b => b.outerHTML.slice(0, 80)));
  const found = [];
  await unlock(page);
  for (const tab of ['總覽', '現金', '股票', '負債', '支出']) {
    await openTab(page, tab);
    found.push(...await unnamedButtons());
  }
  await openSettings(page);
  found.push(...await unnamedButtons());
  await closeSettings(page);
  await openNewEntry(page);
  found.push(...await unnamedButtons());
  expect(found).toEqual([]);
});
