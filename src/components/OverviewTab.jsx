import { Money } from './Money.jsx';
import { StockSummaryCard } from './StockSummaryCard.jsx';
import { UpcomingCard } from './UpcomingCard.jsx';
import { NetWorthChart } from './NetWorthChart.jsx';

export const OverviewTab = ({ data, totals, history, showValues }) => (
    <div className="flex flex-col gap-[10px]">
      <div className="grid grid-cols-2 gap-[10px]">
        <div className="bg-[#506384] rounded-[6px] p-5 border border-white/[0.03] shadow-inner font-sans font-black">
          <span className="text-[11px] text-white/70 block mb-2 uppercase tracking-widest">Assets / 總資產</span>
          <span className={`font-pixel text-[13px] tracking-tighter text-white`}>{showValues ? <Money value={totals.assets} /> : 'XXXXX'}</span>
        </div>
        <div className="bg-[#1f1f21] rounded-[6px] p-5 border border-white/[0.03] font-sans font-black">
          <span className="text-[11px] text-[#4b5563] block mb-2 uppercase tracking-widest">Debts / 總負債</span>
          <span className={`font-pixel text-[13px] tracking-tighter text-white`}>{showValues ? <Money value={totals.debts} /> : 'XXXXX'}</span>
        </div>
        <div className="bg-[#506384] rounded-[6px] p-5 border border-white/[0.03] shadow-inner font-sans font-black">
          <span className="text-[11px] text-white/70 block mb-2 uppercase tracking-widest">Cash / 現金總額</span>
          <span className={`font-pixel text-[13px] tracking-tighter text-white`}>{showValues ? <Money value={totals.cashTwd} /> : 'XXXXX'}</span>
        </div>
        <div className="bg-[#1f1f21] rounded-[6px] p-5 border border-white/[0.03] font-sans font-black">
          <span className="text-[11px] text-[#4b5563] block mb-2 uppercase tracking-widest">Stock / 股票總額</span>
          <span className={`font-pixel text-[13px] tracking-tighter text-white`}>{showValues ? <Money value={totals.stockTwd} /> : 'XXXXX'}</span>
        </div>
      </div>
      <NetWorthChart history={history} showValues={showValues} />
      <StockSummaryCard portfolio={totals.portfolio} stockCount={data.stocks.length} showValues={showValues} />
      <UpcomingCard data={data} showValues={showValues} />
      <div className="bg-[#1f1f21] rounded-[6px] p-7 border border-white/[0.03]">
        <div className="flex justify-between items-center mb-6 font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black"><h3 className="text-[13px] text-[#506384] uppercase tracking-widest font-black font-sans font-black">Monthly Expense / 每月支出總額</h3></div>
        <div className="flex items-baseline gap-2 mb-8 font-black">
          <span className={`font-pixel text-4xl tracking-tighter text-white`}>{showValues ? <Money value={totals.monthlyExpenses} /> : 'XXXXX'}</span>
          <span className="text-[11px] text-[#4b5563] uppercase tracking-widest font-black font-sans">/ MO</span>
        </div>
        <div className="space-y-4 pt-4 border-t border-white/[0.03] font-sans">
          {totals.tagRatios.map(tag => (
            <div key={tag.name} className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-black uppercase"><span className="text-white/60">{tag.name}</span><span className="text-white">{Math.round(tag.ratio)}%</span></div>
              <div className="w-full h-1 bg-[#050505] rounded-full overflow-hidden"><div className="h-full bg-[#506384] transition-all duration-1000" style={{ width: `${tag.ratio}%` }}></div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
);
