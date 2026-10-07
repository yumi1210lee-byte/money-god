import { Money } from './Money.jsx';
import { formatTWD } from '../lib/format.js';
import { upcomingPayments } from '../lib/upcoming.js';

// 總覽：本月還要扣款的支出與貸款
export const UpcomingCard = ({ data, showValues }) => {
  const today = new Date();
  const { items, total } = upcomingPayments(data, today);
  const month = today.getMonth() + 1;
  return (
    <div className="bg-[#1f1f21] rounded-[6px] p-6 border border-white/[0.03] font-sans">
      <div className="flex justify-between items-baseline gap-3 mb-4">
        <h3 className="text-[13px] text-[#506384] uppercase tracking-widest font-black">Due / 本月待繳</h3>
        <span className="font-pixel text-sm text-white">{showValues ? <Money value={total} /> : 'XXXXX'}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[12px] font-bold text-[#4b5563]">本月沒有待繳項目</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map(item => (
            <li key={`${item.kind}-${item.id}`} className="flex items-center justify-between gap-3 text-[12px] font-black">
              <span className="flex items-center gap-2 min-w-0">
                <span className={`font-pixel text-[11px] shrink-0 ${item.overdue ? 'text-[#ff5b41]' : 'text-[#506384]'}`}>{String(month).padStart(2, '0')}/{String(item.day).padStart(2, '0')}</span>
                <span className="text-white truncate">{item.label}</span>
                {item.kind === 'debt' && <span className={`text-[11px] shrink-0 ${item.overdue ? 'text-[#ff5b41]' : 'text-[#4b5563]'}`}>{item.overdue ? '尚未記錄已繳' : '貸款'}</span>}
              </span>
              <span className="text-white shrink-0">{showValues ? formatTWD(item.amount) : 'XXXXX'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
