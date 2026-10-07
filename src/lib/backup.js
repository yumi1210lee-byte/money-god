// 資料備份：匯出檔案、讀取與檢查匯入的備份

export const BACKUP_APP = 'money-god';

export const DATA_KEYS = ['cash', 'stocks', 'debts', 'monthlyExpenses'];

// 讀取備份檔：接受本 App 匯出的格式，或直接是資料本身；格式不符時丟出錯誤
export const parseBackup = (text) => {
  const parsed = JSON.parse(text);
  const source = parsed?.app === BACKUP_APP ? parsed.data : parsed;
  if (!source || typeof source !== 'object' || !DATA_KEYS.some(k => Array.isArray(source[k]))) throw new Error('invalid backup');
  const data = {};
  for (const k of DATA_KEYS) {
    const items = source[k] ?? [];
    if (!Array.isArray(items) || !items.every(i => i && typeof i === 'object')) throw new Error('invalid backup');
    data[k] = items.map(i => i.id ? i : { ...i, id: Math.random().toString(36).slice(2, 11) });
  }
  return { data, exportedAt: parsed?.exportedAt || null };
};

export const countItems = (data) => `現金 ${data.cash.length} 筆・股票 ${data.stocks.length} 筆・負債 ${data.debts.length} 筆・支出 ${data.monthlyExpenses.length} 筆`;

// iPhone 用系統分享選單（可存到「檔案」或傳給自己）；不支援時改為直接下載
export const saveBackupFile = async (json, baseName) => {
  const candidates = [new File([json], `${baseName}.json`, { type: 'application/json' }), new File([json], `${baseName}.txt`, { type: 'text/plain' })];
  const shareable = candidates.find(file => navigator.canShare?.({ files: [file] }));
  if (shareable) return navigator.share({ files: [shareable] });
  const url = URL.createObjectURL(candidates[0]);
  const a = document.createElement('a');
  a.href = url;
  a.download = candidates[0].name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
