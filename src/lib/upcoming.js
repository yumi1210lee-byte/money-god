// 本月待繳：本月還沒到期的支出，以及本月還沒記錄已繳的貸款
import { isPaidThisMonth } from './debts.js';

export const upcomingPayments = (data, today) => {
  const month = today.getMonth() + 1;
  const daysInMonth = new Date(today.getFullYear(), month, 0).getDate();
  // 扣款日 29～31 號在小月份以月底計算
  const dueDay = (day) => Math.min(Math.max(parseInt(day) || 1, 1), daysInMonth);
  const loans = data.debts.filter(d => d.monthlyPayment > 0);
  const items = [];

  for (const debt of loans) {
    if (isPaidThisMonth(debt, today)) continue;
    const day = dueDay(debt.deductionDay);
    items.push({ id: debt.id, kind: 'debt', label: debt.label, amount: debt.monthlyPayment, day, overdue: day < today.getDate() });
  }

  for (const expense of data.monthlyExpenses) {
    if (expense.cycle === 'yearly' && parseInt(expense.month) !== month) continue;
    const day = dueDay(expense.day);
    if (day < today.getDate()) continue;
    // 同一筆貸款同時記在「支出」和「負債」時只列一次：同金額、同扣款日的貸款類支出交給負債那筆處理
    const sameLoan = expense.tag === '貸款' && loans.some(d => d.monthlyPayment === expense.amount && dueDay(d.deductionDay) === day);
    if (sameLoan) continue;
    items.push({ id: expense.id, kind: 'expense', label: expense.label, amount: expense.amount, day, overdue: false });
  }

  items.sort((a, b) => a.day - b.day);
  return { items, total: items.reduce((sum, item) => sum + item.amount, 0) };
};
