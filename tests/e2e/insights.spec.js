import { test, expect, openApp, unlock, waitForSync, storedData, storedItem, row, entryModal, commitButton, openTab, toggleValues, openSettings, settingsPanel, openNewEntry, textOf } from './fixtures.js';

const tsmc = { id: 's1', symbol: '2330', label: '台積電', shares: 1000, price: 900, change: 0, dividend: 0, divMonth: '' };
const apple = { id: 's2', symbol: 'AAPL', label: 'APPLE', shares: 10, price: 100, change: 0, dividend: 0, divMonth: '' };
const card = (page, title) => page.locator('main div.p-6', { hasText: title });

// ---------- #4 年度股利 ----------

test('年度股利：近 12 個月配息合計，同一個月份只算一次', async ({ page, mock }) => {
  await openApp(page, { data: { stocks: [{ id: 'h', symbol: '0056', label: '高股息', shares: 1000, price: 0, change: 0, dividend: 0, divMonth: '', divUpdatedAt: Date.now() }] } });
  await unlock(page);
  await waitForSync(page);
  const stock = (await storedData(page)).stocks[0];
  // 1.0 + 0.8 + 0.7 + 0.6 + 0.5；2025/9 的 0.4 和 2026/9 同月份，不列入
  expect(stock.annualDividend).toBeCloseTo(3.6, 6);
  // 舊資料沒有年度股利時，即使股利剛更新過也會重新抓
  expect(mock.log.some(l => l.target.includes('0056.TW') && l.target.includes('interval=1mo'))).toBe(true);

  await toggleValues(page);
  await openTab(page, '股票');
  await expect(row(page, '高股息')).toContainText('年股利 NT$ 3,600');
  await openTab(page, '總覽');
  await expect(card(page, '股票摘要')).toContainText('NT$ 3,600');
  await expect(card(page, '股票摘要')).toContainText('每月平均 NT$ 300');
});

test('還沒抓到年度股利時，用最近一次配息 × 每年配息次數估計', async ({ page, mock }) => {
  mock.fail = { worker: true, raw: true, codetabs: true, get: true };
  await openApp(page, { data: { stocks: [{ id: 'x', symbol: '9999', label: '季配股', shares: 1000, price: 50, change: 0, dividend: 1, divMonth: '3,6,9,12' }] } });
  await unlock(page);
  await waitForSync(page);
  await toggleValues(page);
  await openTab(page, '股票');
  await expect(row(page, '季配股')).toContainText('年股利 NT$ 4,000');
});

// ---------- #7 成本與損益 ----------

test('填入平均成本後顯示未實現損益與報酬率', async ({ page }) => {
  await openApp(page, { data: {} });
  await unlock(page);
  await openNewEntry(page, '股票');
  await entryModal(page).locator('input[placeholder="0050 / TSLA"]').fill('2330');
  await entryModal(page).locator('input[placeholder="0.00"]').fill('1000');
  const cost = entryModal(page).locator('input[placeholder="每股買進均價"]');
  await expect(cost).toHaveAttribute('inputmode', 'decimal');
  await cost.fill('-5');
  await expect(commitButton(page)).toBeDisabled();
  await expect(entryModal(page)).toContainText('請輸入 0 以上的數字');
  await cost.fill('900');
  await commitButton(page).click();
  await waitForSync(page);
  expect((await storedData(page)).stocks[0].costPrice).toBe(900);

  await toggleValues(page);
  const text = await textOf(row(page, '台積電'));
  expect(text).toContain('成本 900.00');
  expect(text).toContain('損益 +NT$ 150,000（+16.7%）'); // (1050 − 900) × 1000
  await expect(row(page, '台積電').getByText('損益', { exact: false })).toHaveClass(/text-up/);

  await row(page, '台積電').getByRole('button', { name: '編輯' }).click();
  await expect(entryModal(page).locator('input[placeholder="每股買進均價"]')).toHaveValue('900');
});

test('外國股票以報價幣別計算成本，虧損以跌色顯示；沒填成本不顯示損益', async ({ page }) => {
  await openApp(page, { data: { stocks: [
    { ...apple, costPrice: 150 },
    { ...tsmc, costPrice: 1200 },
    { id: 's3', symbol: '6488', label: '環球晶', shares: 100, price: 0, change: 0, dividend: 0, divMonth: '' },
  ] } });
  await unlock(page);
  await waitForSync(page);
  await toggleValues(page);
  await openTab(page, '股票');
  const appleText = await textOf(row(page, 'APPLE'));
  expect(appleText).toContain('成本 150.00 USD');
  expect(appleText).toContain('損益 +NT$ 15,000（+33.3%）'); // (200 − 150) × 10 × 30
  const loss = row(page, '台積電');
  await expect(loss).toContainText('損益 -NT$ 150,000（-12.5%）'); // (1050 − 1200) × 1000
  await expect(loss.getByText('損益', { exact: false })).toHaveClass(/text-down/);
  await expect(row(page, '環球晶')).not.toContainText('損益');

  await openTab(page, '總覽');
  const summary = card(page, '股票摘要');
  // 15,000 − 150,000 = −135,000；成本 45,000 + 1,200,000 = 1,245,000 → −10.8%
  await expect(summary).toContainText('-NT$ 135,000');
  await expect(summary).toContainText('-10.8%');
  await expect(summary).toContainText('已填成本 2／3 檔');
});

test('成本可改填台幣總投入金額，損益包含匯率變動；可以切回成交均價', async ({ page }) => {
  await openApp(page, { data: { stocks: [{ ...apple, costPrice: 150 }] } });
  await unlock(page);
  await waitForSync(page);
  await toggleValues(page);
  await openTab(page, '股票');
  await row(page, 'APPLE').getByRole('button', { name: '編輯' }).click();
  const modes = entryModal(page).getByRole('group', { name: '成本填法' });
  await expect(modes.getByRole('button', { name: '成交均價' })).toHaveAttribute('aria-pressed', 'true');
  await modes.getByRole('button', { name: '總投入金額' }).click();
  await expect(modes.getByRole('button', { name: '總投入金額' })).toHaveAttribute('aria-pressed', 'true');
  const total = entryModal(page).locator('input[placeholder="投入的台幣總額"]');
  await expect(total).toHaveAttribute('inputmode', 'decimal');
  await total.fill('-1');
  await expect(commitButton(page)).toBeDisabled();
  await expect(entryModal(page)).toContainText('請輸入 0 以上的數字');
  await total.fill('66000');
  await commitButton(page).click();

  const saved = (await storedData(page)).stocks[0];
  expect(saved.costTotal).toBe(66000);
  expect(saved.costPrice).toBe(0);
  // 市值 200 × 10 × 30 = 60,000；60,000 − 66,000 = −6,000（−9.1%）
  const text = await textOf(row(page, 'APPLE'));
  expect(text).toContain('總投入 NT$ 66,000');
  expect(text).toContain('損益 -NT$ 6,000（-9.1%）');
  await openTab(page, '總覽');
  await expect(card(page, '股票摘要')).toContainText('-NT$ 6,000');
  await expect(card(page, '股票摘要')).toContainText('已填成本 1／1 檔');

  // 再次編輯時停在總投入金額；切回成交均價存檔後只留成交均價
  await openTab(page, '股票');
  await row(page, 'APPLE').getByRole('button', { name: '編輯' }).click();
  await expect(modes.getByRole('button', { name: '總投入金額' })).toHaveAttribute('aria-pressed', 'true');
  await expect(total).toHaveValue('66000');
  await modes.getByRole('button', { name: '成交均價' }).click();
  await entryModal(page).locator('input[placeholder="每股買進均價"]').fill('180');
  await commitButton(page).click();
  const back = (await storedData(page)).stocks[0];
  expect(back.costPrice).toBe(180);
  expect(back.costTotal).toBe(0);
  const backText = await textOf(row(page, 'APPLE'));
  expect(backText).toContain('成本 180.00 USD');
  expect(backText).toContain('損益 +NT$ 6,000（+11.1%）'); // (200 − 180) × 10 × 30
});

// ---------- #8 今日損益與本月待繳 ----------

test('總覽顯示今日股票損益', async ({ page }) => {
  await openApp(page, { data: { stocks: [tsmc, apple] } });
  await unlock(page);
  await waitForSync(page);
  await toggleValues(page);
  // 1000 × 50 + 10 × 2 × 30 = 50,600
  await expect(card(page, '股票摘要')).toContainText('+NT$ 50,600');
  await expect(card(page, '股票摘要')).toContainText('在股票的編輯畫面填入成交均價或總投入金額即可計算');
});

test('本月待繳：列出還沒到期的支出與還沒記錄已繳的貸款，同一筆貸款只列一次', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-15T12:00:00+08:00'));
  await openApp(page, { data: {
    debts: [
      { id: 'd1', label: '房貸', amount: 8000000, monthlyPayment: 32000, deductionDay: 5 },
      { id: 'd2', label: '車貸', amount: 300000, monthlyPayment: 10000, deductionDay: 20, lastPaidYM: '2026-10', lastPaidMonth: 10 },
    ],
    monthlyExpenses: [
      { id: 'e1', label: '電話費', amount: 999, day: 20, tag: '民生繳費', cycle: 'monthly' },
      { id: 'e2', label: '水費', amount: 500, day: 10, tag: '民生繳費', cycle: 'monthly' },
      { id: 'e3', label: '汽車保險', amount: 18000, day: 25, month: '10', tag: '保險', cycle: 'yearly' },
      { id: 'e4', label: '火險', amount: 3000, day: 1, month: '3', tag: '保險', cycle: 'yearly' },
      { id: 'e5', label: '房貸繳納', amount: 32000, day: 5, tag: '貸款', cycle: 'monthly' },
    ],
  } });
  await unlock(page);
  const due = card(page, '本月待繳');
  const items = due.locator('li');
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText('10/05');
  await expect(items.nth(0)).toContainText('房貸');
  await expect(items.nth(0)).toContainText('尚未記錄已繳'); // 扣款日已過但還沒按已繳
  await expect(items.nth(1)).toContainText('10/20');
  await expect(items.nth(1)).toContainText('電話費');
  await expect(items.nth(2)).toContainText('10/25');
  await expect(items.nth(2)).toContainText('汽車保險');
  await expect(items.nth(0)).toContainText('XXXXX'); // 金額隱藏時不顯示
  await toggleValues(page);
  await expect(due).toContainText('NT$ 50,999'); // 32,000 + 999 + 18,000
  await expect(items.nth(1)).toContainText('NT$ 999');
});

test('本月沒有待繳項目時顯示提示', async ({ page }) => {
  await openApp(page, { data: { cash: [{ id: 'c', label: 'A', amount: 1, currency: 'TWD' }] } });
  await unlock(page);
  await expect(card(page, '本月待繳')).toContainText('本月沒有待繳項目');
});

// ---------- #9 淨資產走勢 ----------

const dayKey = (base, offset) => { const d = new Date(base); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

test('每天記錄一筆淨資產，同一天以最後的數值為準', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-07T12:00:00+08:00'));
  await openApp(page, { data: { cash: [{ id: 'c', label: '活存', amount: 100000, currency: 'TWD' }], stocks: [tsmc] } });
  await unlock(page);
  await waitForSync(page);
  const history = JSON.parse(await storedItem(page, 'money_god_history'));
  expect(history).toHaveLength(1);
  // 同步到最新股價後更新今天這筆：100,000 + 1000 × 1050
  expect(history[0]).toEqual({ date: '2026-10-07', netWorth: 1150000, assets: 1150000, debts: 0 });
  await expect(card(page, '淨資產走勢')).toContainText('累積兩天以上就能看到走勢');
});

test('走勢圖：期間切換、拖曳與左右鍵查看每天、表格檢視', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-07T12:00:00+08:00'));
  const base = new Date(2026, 9, 7);
  // 過去 60 天每天增加 1 萬，從 90 萬到 149 萬
  const seeded = Array.from({ length: 60 }, (_, i) => ({ date: dayKey(base, i - 60), netWorth: 900000 + i * 10000, assets: 900000 + i * 10000, debts: 0 }));
  await openApp(page, { data: { cash: [{ id: 'c', label: '活存', amount: 1500000, currency: 'TWD' }] }, storage: { money_god_history: JSON.stringify(seeded) } });
  await unlock(page);
  await toggleValues(page);
  const chart = card(page, '淨資產走勢');
  await expect(chart.locator('svg path')).toHaveCount(2); // 面積與折線

  // 預設 3 個月：從第一筆 8/8（90 萬）到今天（150 萬）
  await expect(chart.getByRole('button', { name: '3 個月' })).toHaveAttribute('aria-pressed', 'true');
  await expect(chart).toContainText('NT$ 1,500,000');
  await expect(chart).toContainText('+NT$ 600,000（+66.7%） 與 8/8 相比');

  // 1 個月：從 9/7（120 萬）開始
  await chart.getByRole('button', { name: '1 個月' }).click();
  await expect(chart).toContainText('+NT$ 300,000（+25.0%） 與 9/7 相比');

  // 左右鍵逐日查看
  await chart.getByRole('group', { name: /淨資產走勢圖/ }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(chart).toContainText('10/6');
  await expect(chart).toContainText('NT$ 1,490,000');

  // 拖曳到最左邊顯示第一天
  const box = await chart.locator('svg').boundingBox();
  await page.mouse.move(box.x + 52, box.y + 60);
  await expect(chart).toContainText('9/7');
  await expect(chart).toContainText('NT$ 1,200,000');

  // 表格：每一天一列，最新的在最上面
  await chart.getByRole('button', { name: '看表格' }).click();
  const rows = chart.locator('tbody tr');
  await expect(rows).toHaveCount(31);
  await expect(rows.first()).toContainText('2026-10-07');
  await expect(rows.first()).toContainText('NT$ 1,500,000');

  // 所有文字至少 11 px
  await chart.getByRole('button', { name: '看圖表' }).click();
  const smallest = await chart.evaluate(el => Math.min(...[...el.querySelectorAll('*')].filter(n => [...n.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())).map(n => parseFloat(getComputedStyle(n).fontSize))));
  expect(smallest).toBeGreaterThanOrEqual(11);
});

test('隱藏金額時走勢圖不顯示數字', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-07T12:00:00+08:00'));
  const seeded = [{ date: '2026-10-01', netWorth: 1000000, assets: 1000000, debts: 0 }, { date: '2026-10-05', netWorth: 1100000, assets: 1100000, debts: 0 }];
  await openApp(page, { data: { cash: [{ id: 'c', label: '活存', amount: 1200000, currency: 'TWD' }] }, storage: { money_god_history: JSON.stringify(seeded) } });
  await unlock(page);
  const chart = card(page, '淨資產走勢');
  await expect(chart).toContainText('XXXXX');
  await expect(chart).not.toContainText('NT$');
  await expect(chart.locator('svg text', { hasText: '萬' })).toHaveCount(0);
});

test('備份包含走勢紀錄，匯入時與現有紀錄合併', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-07T12:00:00+08:00'));
  const current = [{ date: '2026-10-05', netWorth: 500, assets: 500, debts: 0 }];
  await openApp(page, { data: { cash: [{ id: 'c', label: '活存', amount: 1000, currency: 'TWD' }] }, storage: { money_god_history: JSON.stringify(current) } });
  await unlock(page);
  await openSettings(page);
  const [download] = await Promise.all([page.waitForEvent('download'), settingsPanel(page).getByRole('button', { name: '匯出備份' }).click()]);
  const exported = JSON.parse(Buffer.concat(await (await download.createReadStream()).toArray()).toString());
  expect(exported.history.map(h => h.date)).toEqual(['2026-10-05', '2026-10-07']);

  const backup = { ...exported, history: [
    { date: '2026-09-01', netWorth: 100, assets: 100, debts: 0 },
    { date: '2026-10-05', netWorth: 999, assets: 999, debts: 0 },
  ] };
  await settingsPanel(page).locator('input[type=file]').setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await settingsPanel(page).getByRole('button', { name: '確認取代' }).click();
  const merged = JSON.parse(await storedItem(page, 'money_god_history'));
  expect(merged.map(h => h.date)).toEqual(['2026-09-01', '2026-10-05', '2026-10-07']);
  expect(merged[1].netWorth).toBe(500); // 同一天保留手機上現有的紀錄
});
