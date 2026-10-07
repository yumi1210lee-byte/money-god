// 負債：還本金額與本月是否已繳
import { toYearMonth } from './format.js';

// 分期貸款：當月利息 = 剩餘本金 × 年利率 ÷ 12，月付金扣掉利息才是真正還到的本金；沒填利率時整筆月付金都算本金
export const principalPaid = (debt) => {
  const interest = debt.amount * (parseFloat(debt.annualRate) || 0) / 100 / 12;
  return Math.min(debt.amount, Math.max(0, Math.round((debt.monthlyPayment || 0) - interest)));
};

// 舊資料只有 lastPaidMonth（月份數字），沿用舊判斷直到下一次繳款寫入 lastPaidYM
export const isPaidThisMonth = (debt, today) => debt.lastPaidYM ? debt.lastPaidYM === toYearMonth(today) : debt.lastPaidMonth === today.getMonth() + 1;
