import { Money } from './Money.jsx';
import { ItemRow } from './ItemRow.jsx';
import { cashCurrency, formatCash } from '../lib/currencies.js';
import { formatTWD } from '../lib/format.js';

// 分類總額與該分類的項目列表
export const ItemList = ({ activeTab, items, totals, showValues, fxRates, stockStatus, onQuickPay, onEdit, onDelete }) => (
    <div className="flex flex-col gap-[10px]">
      <div className={`p-6 rounded-[6px] border border-white/[0.03] shadow-inner mb-2 ${activeTab === 'cash' || activeTab === 'stocks' ? 'bg-[#506384]' : 'bg-[#1f1f21]'}`}>
         <span className={`font-sans text-[11px] block mb-2 font-black uppercase tracking-widest ${activeTab === 'cash' || activeTab === 'stocks' ? 'text-white/70' : 'text-[#4b5563]'}`}>
           {activeTab === 'cash' ? 'Cash Total / 現金總額' : activeTab === 'stocks' ? 'Stock Total / 股票總額' : activeTab === 'debts' ? 'Total Debts / 總負債' : 'Monthly Expense / 每月支出總額'}
         </span>
         <span className="font-pixel text-2xl text-white font-black">{showValues ? <Money value={activeTab === 'cash' ? totals.cashTwd : activeTab === 'stocks' ? totals.stockTwd : activeTab === 'debts' ? totals.debts : totals.monthlyExpenses} /> : 'XXXXX'}</span>
         {/* 有外幣帳戶時列出各幣別的合計 */}
         {activeTab === 'cash' && totals.cashByCurrency.some(c => c.code !== 'TWD') && (
           <ul className="mt-4 pt-3 border-t border-white/15 space-y-1.5" aria-label="各幣別合計">
             {totals.cashByCurrency.map(c => (
               <li key={c.code} className="flex items-baseline justify-between gap-3 text-[12px] font-sans font-black">
                 <span className="text-white/70 shrink-0">{cashCurrency(c.code).name}</span>
                 <span className="text-white text-right whitespace-nowrap">{showValues ? <>{formatCash(c.amount, c.code)}{c.code !== 'TWD' && <span className="text-white/60 font-bold"> ≈ {formatTWD(c.twd)}</span>}</> : 'XXXXX'}</span>
               </li>
             ))}
           </ul>
         )}
      </div>

      {items.map(item => (
        <ItemRow key={item.id} activeTab={activeTab} item={item} showValues={showValues} fxRates={fxRates} status={stockStatus[item.id]} onQuickPay={onQuickPay} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
);
