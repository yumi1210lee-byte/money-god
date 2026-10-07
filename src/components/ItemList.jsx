import { Money } from './Money.jsx';
import { ItemRow } from './ItemRow.jsx';

// 分類總額與該分類的項目列表
export const ItemList = ({ activeTab, items, totals, showValues, fxRates, usdTwd, stockStatus, onQuickPay, onEdit, onDelete }) => (
    <div className="flex flex-col gap-[10px]">
      <div className={`p-6 rounded-[6px] border border-white/[0.03] shadow-inner mb-2 ${activeTab === 'cash' || activeTab === 'stocks' ? 'bg-[#506384]' : 'bg-[#1f1f21]'}`}>
         <span className={`font-sans text-[11px] block mb-2 font-black uppercase tracking-widest ${activeTab === 'cash' || activeTab === 'stocks' ? 'text-white/70' : 'text-[#4b5563]'}`}>
           {activeTab === 'cash' ? 'Cash Total / 現金總額' : activeTab === 'stocks' ? 'Stock Total / 股票總額' : activeTab === 'debts' ? 'Total Debts / 總負債' : 'Monthly Expense / 每月支出總額'}
         </span>
         <span className="font-pixel text-2xl text-white font-black">{showValues ? <Money value={activeTab === 'cash' ? totals.cashTwd : activeTab === 'stocks' ? totals.stockTwd : activeTab === 'debts' ? totals.debts : totals.monthlyExpenses} /> : 'XXXXX'}</span>
      </div>

      {items.map(item => (
        <ItemRow key={item.id} activeTab={activeTab} item={item} showValues={showValues} fxRates={fxRates} usdTwd={usdTwd} status={stockStatus[item.id]} onQuickPay={onQuickPay} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
);
