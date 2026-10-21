// 現金帳戶的幣別：顯示名稱、金額前綴、小數位數，以及換算台幣
import { DEFAULT_FX_RATES } from './storage.js';
import { formatAmount, isNegative } from './format.js';

// badge 顯示在列表左側的方塊裡
export const CASH_CURRENCIES = [
  { code: 'TWD', name: '台幣', prefix: 'NT$', badge: 'NT', decimals: 0 },
  { code: 'USD', name: '美元', prefix: 'US$', badge: 'US', decimals: 2 },
  { code: 'EUR', name: '歐元', prefix: 'EUR', badge: 'EU', decimals: 2 },
  { code: 'JPY', name: '日圓', prefix: 'JPY', badge: 'JP', decimals: 0 },
  { code: 'CNY', name: '人民幣', prefix: 'CNY', badge: 'CN', decimals: 2 },
  { code: 'SGD', name: '新加坡幣', prefix: 'SGD', badge: 'SG', decimals: 2 },
];

// 不認得的幣別當作台幣
export const cashCurrency = (code) => CASH_CURRENCIES.find(c => c.code === code) || CASH_CURRENCIES[0];

// 1 單位外幣等於多少台幣；匯率以美元為基準，還沒抓到某個幣別時改用預設的概略匯率
export const twdPerUnit = (code, fxRates) => {
  if (code === 'TWD') return 1;
  const rate = fxRates[code] || DEFAULT_FX_RATES[code];
  return rate ? fxRates.TWD / rate : 1;
};

export const cashToTwd = (item, fxRates) => item.amount * twdPerUnit(cashCurrency(item.currency).code, fxRates);

// 以原幣顯示，例如 "US$ 1,234.50"、"JPY 500,000"
export const formatCash = (amount, code) => {
  const { prefix, decimals } = cashCurrency(code);
  return `${isNegative(amount) ? '-' : ''}${prefix} ${formatAmount(amount, decimals)}`;
};
