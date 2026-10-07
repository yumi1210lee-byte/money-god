// 淨資產走勢：每天一筆，記錄當天最後一次看到的淨資產、總資產、總負債
import { toYearMonth } from './format.js';

export const HISTORY_KEY = 'money_god_history';
const MAX_DAYS = 1500; // 約 4 年

// 本地日期，例如 "2026-10-07"（字串可以直接比大小、排序）
export const toDateKey = (date) => `${toYearMonth(date)}-${String(date.getDate()).padStart(2, '0')}`;

const isSnapshot = (s) => s && typeof s.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.date) && Number.isFinite(s.netWorth);

export const sanitizeHistory = (history) => Array.isArray(history) ? history.filter(isSnapshot) : [];

export const loadHistory = () => {
  try {
    return sanitizeHistory(JSON.parse(localStorage.getItem(HISTORY_KEY)));
  } catch {
    return [];
  }
};

const sortByDate = (history) => [...history].sort((a, b) => a.date.localeCompare(b.date));

// 加入或更新某一天的紀錄；數值沒有改變時回傳原本的陣列
export const upsertSnapshot = (history, date, totals) => {
  const snapshot = { date, netWorth: Math.round(totals.netWorth), assets: Math.round(totals.assets), debts: Math.round(totals.debts) };
  const existing = history.find(h => h.date === date);
  if (existing && existing.netWorth === snapshot.netWorth && existing.assets === snapshot.assets && existing.debts === snapshot.debts) return history;
  return sortByDate([...history.filter(h => h.date !== date), snapshot]).slice(-MAX_DAYS);
};

// 匯入備份時合併兩份紀錄；同一天兩邊都有時保留手機上現有的那筆
export const mergeHistory = (current, imported) => {
  const dates = new Set(current.map(h => h.date));
  return sortByDate([...current, ...sanitizeHistory(imported).filter(h => !dates.has(h.date))]).slice(-MAX_DAYS);
};
