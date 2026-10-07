// 股票損益與股利（皆換算成台幣）
import { stockFxRate, annualDividendPerShare } from './quotes.js';

// 有填成本、且已經抓到股價時才計算損益；否則回傳 null（避免顯示成 −100%）
export const stockPnl = (stock, fxRates) => {
  if (!(stock.price > 0)) return null;
  const rate = stockFxRate(stock, fxRates);
  // 總投入金額（台幣）：直接和目前台幣市值相比，損益包含匯率變動
  if (stock.costTotal > 0) {
    const pnl = stock.price * stock.shares * rate - stock.costTotal;
    return { cost: stock.costTotal, pnl, pct: (pnl / stock.costTotal) * 100 };
  }
  if (!(stock.costPrice > 0)) return null;
  return {
    cost: stock.costPrice * stock.shares * rate,
    pnl: (stock.price - stock.costPrice) * stock.shares * rate,
    pct: (stock.price / stock.costPrice - 1) * 100,
  };
};

export const portfolioSummary = (stocks, fxRates) => {
  let todayChange = 0, annualDividend = 0, cost = 0, pnl = 0, withCost = 0;
  for (const stock of stocks) {
    const rate = stockFxRate(stock, fxRates);
    todayChange += stock.shares * (stock.change || 0) * rate;
    annualDividend += stock.shares * annualDividendPerShare(stock) * rate;
    const result = stockPnl(stock, fxRates);
    if (result) { cost += result.cost; pnl += result.pnl; withCost++; }
  }
  return { todayChange, annualDividend, cost, pnl, pnlPct: cost > 0 ? (pnl / cost) * 100 : 0, withCost };
};
