// 金額、日期的格式化與輸入檢查

export const formatAmount = (val) => new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 }).format(Math.abs(val));

export const isNegative = (val) => Math.round(val) < 0;

export const formatTWD = (val) => `${isNegative(val) ? '-' : ''}NT$ ${formatAmount(val)}`;

// 損益用：正數加上「+」
export const formatSignedTWD = (val) => `${isNegative(val) ? '' : '+'}${formatTWD(val)}`;
export const formatPercent = (val) => `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;

export const isIntInRange = (value, min, max) => {
  const n = Number(value);
  return value !== '' && Number.isInteger(n) && n >= min && n <= max;
};

// 年月字串，例如 "2026-10"，用來判斷本月是否已繳款
export const toYearMonth = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const formatUpdatedAt = (ts) => {
  const d = new Date(ts);
  const time = d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
  return d.toDateString() === new Date().toDateString() ? time : `${d.getMonth() + 1}/${d.getDate()} ${time}`;
};

export const formatDateTime = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
};
