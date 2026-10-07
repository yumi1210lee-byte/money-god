// localStorage 的 key、預設值與讀取

export const DATA_KEY = 'money_god_v55';

export const DEFAULT_DATA = {
  cash: [{ id: 'c1', label: '主要活期儲蓄', amount: 1250000, currency: 'TWD' }],
  stocks: [{ id: 's1', symbol: '2330.TW', label: '台積電', shares: 1000, price: 1050, change: 15, dividend: 4.5, divMonth: '3,6,9,12' }],
  debts: [{ id: 'd1', label: '房屋貸款本金', amount: 8500000, monthlyPayment: 32000, deductionDay: 5, lastPaidMonth: 0 }],
  monthlyExpenses: [{ id: 'e1', label: '房貸繳納', amount: 32000, day: 5, tag: '貸款', cycle: 'monthly' }]
};

// 在第一次 render 前就讀取已儲存的資料，避免預設資料先寫回 localStorage 蓋掉使用者資料
export const loadData = () => {
  try {
    const saved = localStorage.getItem(DATA_KEY);
    if (saved) return { cash: [], stocks: [], debts: [], monthlyExpenses: [], ...JSON.parse(saved) };
  } catch { /* 資料毀損時改用預設資料 */ }
  return DEFAULT_DATA;
};

export const FX_KEY = 'money_god_fx';

export const DEFAULT_FX_RATES = { USD: 1, TWD: 32.5 };

// 匯率以美元為基準（例如 { USD: 1, TWD: 32.5, JPY: 150 }），保存上次抓到的值，離線或抓取失敗時沿用
export const loadFxRates = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(FX_KEY));
    if (saved?.TWD) return saved;
  } catch { /* 沒有或毀損時用預設值 */ }
  return DEFAULT_FX_RATES;
};

export const AUTO_LOCK_KEY = 'money_god_auto_lock';

// 切到背景多久後自動上鎖（分鐘）；0 = 立即，-1 = 不自動上鎖
export const AUTO_LOCK_OPTIONS = [{ value: 0, label: '立即' }, { value: 1, label: '1 分鐘' }, { value: 5, label: '5 分鐘' }, { value: -1, label: '不自動' }];

export const LAST_BACKUP_KEY = 'money_god_last_backup';

export const PRE_IMPORT_KEY = 'money_god_v55_before_import';

export const readStorage = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
