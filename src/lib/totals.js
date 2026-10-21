// 總覽用的各項總額（皆換算成台幣）
import { stockFxRate } from './quotes.js';
import { EXPENSE_TAGS } from './entries.js';
import { portfolioSummary } from './portfolio.js';
import { CASH_CURRENCIES, cashCurrency, cashToTwd } from './currencies.js';

// 現金依幣別加總（只列出有帳戶的幣別），amount 是原幣、twd 是換算後
const cashByCurrency = (cash, fxRates) => CASH_CURRENCIES
  .map(({ code }) => {
    const items = cash.filter(c => cashCurrency(c.currency).code === code);
    return { code, count: items.length, amount: items.reduce((sum, c) => sum + c.amount, 0), twd: items.reduce((sum, c) => sum + cashToTwd(c, fxRates), 0) };
  })
  .filter(c => c.count > 0);

export const computeTotals = (data, fxRates) => {
  const cashTwd = data.cash.reduce((acc, curr) => acc + cashToTwd(curr, fxRates), 0);
  const stockTwd = data.stocks.reduce((acc, curr) => acc + (curr.shares * curr.price * stockFxRate(curr, fxRates)), 0);
  const debtTotal = data.debts.reduce((acc, curr) => acc + curr.amount, 0);
  const totalAssets = cashTwd + stockTwd;
  const tagStats = Object.fromEntries(EXPENSE_TAGS.map(tag => [tag, 0]));
  const expenseTotal = data.monthlyExpenses.reduce((acc, curr) => {
    const monthlyAmount = curr.cycle === 'yearly' ? (curr.amount / 12) : curr.amount;
    if (tagStats[curr.tag] !== undefined) tagStats[curr.tag] += monthlyAmount;
    return acc + monthlyAmount;
  }, 0);
  const tagRatios = Object.keys(tagStats).map(key => ({
    name: key,
    amount: tagStats[key],
    ratio: expenseTotal > 0 ? (tagStats[key] / expenseTotal) * 100 : 0
  }));
  return { assets: totalAssets, debts: debtTotal, netWorth: totalAssets - debtTotal, cashTwd, stockTwd, monthlyExpenses: expenseTotal, assetRatio: (totalAssets + debtTotal) > 0 ? (totalAssets / (totalAssets + debtTotal)) * 100 : 0, debtRatio: (totalAssets + debtTotal) > 0 ? (debtTotal / (totalAssets + debtTotal)) * 100 : 0, tagRatios, portfolio: portfolioSummary(data.stocks, fxRates), cashByCurrency: cashByCurrency(data.cash, fxRates) };
};
