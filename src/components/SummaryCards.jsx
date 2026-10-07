import { RefreshCw } from 'lucide-react';
import { Money } from './Money.jsx';

// 淨資產與資產負債比例
export const SummaryCards = ({ totals, showValues, isBusy, syncStep, lastUpdated, onRefresh }) => (
    <div className="flex flex-col gap-[10px] mb-5 mt-4">
      <div className="bg-[#506384] rounded-[6px] p-8 border border-white/[0.03] shadow-inner relative overflow-hidden">
         <button aria-label="重新整理" onClick={onRefresh} className={`absolute top-4 right-4 text-white/50 hover:text-white transition-all ${isBusy ? 'animate-spin' : ''}`}><RefreshCw size={16} /></button>
        <p className="font-sans text-[13px] font-black text-white/70 uppercase tracking-widest mb-4">Net Worth / 總資產淨值</p>
        <h2 className={`font-pixel text-3xl tracking-tighter text-white leading-none`}>{showValues ? <Money value={totals.netWorth} /> : 'XXXXX'}</h2>
        <div className="flex justify-between items-center mt-6">
           <span className="font-sans text-[11px] font-bold text-white/50 uppercase tracking-widest">LAST SYNC: {lastUpdated}</span>
           <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${syncStep === i ? 'bg-white shadow-[0_0_5px_#fff]' : (isBusy ? 'bg-white/20' : 'bg-[#d8ef9d]')}`}></div>
              ))}
           </div>
        </div>
      </div>
      <div className="bg-[#1f1f21] rounded-[6px] p-6 border border-white/[0.03]">
        <span className="font-sans text-[11px] font-black text-[#506384] uppercase tracking-[0.2em] mb-6 block text-center">Leverage Ratio / 資產負債比例</span>
        <div className="w-full h-2.5 bg-[#050505] rounded-[2px] overflow-hidden mb-6 flex shadow-inner">
          <div className="bg-[#ff5b41] transition-all duration-700" style={{ width: `${totals.assetRatio}%` }}></div>
          <div className="bg-gray-700 transition-all duration-700" style={{ width: `${totals.debtRatio}%` }}></div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-center font-sans font-black">
          <div><p className="text-[11px] text-[#4b5563] uppercase mb-1">Asset 占比</p><p className="font-pixel text-lg text-white leading-none">{Math.round(totals.assetRatio)}%</p></div>
          <div><p className="text-[11px] text-[#4b5563] uppercase mb-1">Debt 占比</p><p className="font-pixel text-lg text-white leading-none">{Math.round(totals.debtRatio)}%</p></div>
        </div>
      </div>
    </div>
);
