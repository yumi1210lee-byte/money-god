import { RefreshCw } from 'lucide-react';
import { formatUpdatedAt } from '../lib/format.js';

// 股票列上的更新狀態：更新中／更新失敗／最後更新時間
export const StockSyncBadge = ({ status, updatedAt }) => {
  if (status === 'loading') return <span className="flex items-center gap-1 text-[11px] font-black text-[#506384] shrink-0"><RefreshCw size={8} className="animate-spin" />更新中</span>;
  if (status === 'error') return <span className="text-[11px] font-black text-[#ff5b41] shrink-0">更新失敗{updatedAt ? ` · ${formatUpdatedAt(updatedAt)}` : ''}</span>;
  if (updatedAt) return <span className="text-[11px] font-black text-[#4b5563] shrink-0">{formatUpdatedAt(updatedAt)} 更新</span>;
  return null;
};
