// 新增／編輯表單：表單初始值、欄位檢查、把表單轉成資料項目
import { isIntInRange } from './format.js';

export const EXPENSE_TAGS = ['民生繳費', '保險', '貸款', '訂閱'];

// 分頁／表單類型對應到資料裡的分類名稱
export const categoryKey = (type) => type === 'expenses' ? 'monthlyExpenses' : type;

// 開啟表單時的初始值：編輯時帶入項目內容，新增時依目前分頁決定類型
export const buildEntryForm = (cat = 'cash', item = null) => item
  ? { type: cat === 'monthlyExpenses' || cat === 'overview' || cat === 'expenses' ? 'expenses' : cat, label: item.label || '', amount: item.amount || '', currency: item.currency || 'TWD', symbol: item.symbol || '', shares: item.shares || '', price: item.price || 0, change: item.change || 0, dividend: item.dividend || '', divMonth: item.divMonth || '', month: item.month || '1', day: item.day || '1', tag: item.tag || '民生繳費', cycle: item.cycle || 'monthly', monthlyPayment: item.monthlyPayment || '', deductionDay: item.deductionDay || '1', annualRate: item.annualRate || '' }
  : { type: cat === 'overview' ? 'cash' : (cat === 'expenses' ? 'expenses' : cat), label: '', amount: '', symbol: '', shares: '', price: 0, change: 0, dividend: '', divMonth: '', currency: 'TWD', month: '1', day: '1', tag: '民生繳費', cycle: 'monthly', monthlyPayment: '', deductionDay: '1', annualRate: '' };

// 月份、日期、利率超出範圍的欄位
export const getInvalidFields = (form) => ({
  month: form.type === 'expenses' && form.cycle === 'yearly' && !isIntInRange(form.month, 1, 12),
  day: form.type === 'expenses' && !isIntInRange(form.day, 1, 31),
  deductionDay: form.type === 'debts' && !isIntInRange(form.deductionDay, 1, 31),
  annualRate: form.type === 'debts' && form.annualRate !== '' && !(Number(form.annualRate) >= 0 && Number(form.annualRate) <= 100),
});

export const canSaveEntry = (form) => (form.type === 'stocks' ? form.symbol.trim() !== '' : form.label.trim() !== '') && !Object.values(getInvalidFields(form)).some(Boolean);

// 把表單轉成要存的項目；股票只有新增或改代號時才需要重新抓報價（needsQuote）
export const buildItem = (form, prevItem, editingId) => {
  const type = form.type;
  const symbol = form.symbol.trim().toUpperCase();
  const needsQuote = type === 'stocks' && (!prevItem || prevItem.symbol !== symbol);
  const price = needsQuote ? 0 : (parseFloat(form.price) || 0);
  const sharesCount = parseFloat(form.shares) || 0;
  const calculatedAmount = type === 'stocks' ? (sharesCount * price) : (parseFloat(form.amount) || 0);
  const item = { ...prevItem, id: editingId || Math.random().toString(36).substr(2, 9), label: form.label, amount: calculatedAmount, currency: type === 'cash' ? form.currency : 'TWD', symbol, shares: sharesCount, price, change: needsQuote ? 0 : (form.change || 0), dividend: needsQuote ? 0 : (parseFloat(form.dividend) || 0), divMonth: needsQuote ? '' : form.divMonth, month: form.month, day: parseInt(form.day) || 1, tag: form.tag, cycle: form.cycle, monthlyPayment: parseFloat(form.monthlyPayment) || 0, deductionDay: parseInt(form.deductionDay) || 1, annualRate: parseFloat(form.annualRate) || 0 };
  // 換了代號就清掉舊代號的報價紀錄
  if (needsQuote) { delete item.quoteSymbol; delete item.priceUpdatedAt; delete item.divUpdatedAt; }
  return { item, needsQuote };
};
