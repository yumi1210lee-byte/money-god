import { TrendingUp, TrendingDown, Check, Edit2, Trash2, DollarSign, Calendar } from 'lucide-react';
import { Money } from './Money.jsx';
import { StockSyncBadge } from './StockSyncBadge.jsx';
import { formatTWD, formatSignedTWD, formatPercent, formatPrice } from '../lib/format.js';
import { stockCurrency, stockFxRate, annualDividendPerShare } from '../lib/quotes.js';
import { stockPnl } from '../lib/portfolio.js';
import { isPaidThisMonth } from '../lib/debts.js';

// 現金／股票／負債／支出列表中的一列
export const ItemRow = ({ activeTab, item, showValues, fxRates, usdTwd, status, onQuickPay, onEdit, onDelete }) => {
  const today = new Date();
  const curDay = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const isPaid = activeTab === 'debts' && isPaidThisMonth(item, today);
  // 扣款日 29～31 號在小月份改以月底當天計算
  const isDebtEnabled = activeTab === 'debts' && item.monthlyPayment > 0 && curDay >= Math.min(item.deductionDay || 1, daysInMonth) && !isPaid;
  const stockRate = activeTab === 'stocks' ? stockFxRate(item, fxRates) : 1;
  const currency = activeTab === 'stocks' ? stockCurrency(item) : 'TWD';
  const pnl = activeTab === 'stocks' ? stockPnl(item, fxRates) : null;

  return (
    <div className="bg-[#1f1f21] p-4 rounded-[6px] flex flex-col gap-3 border border-white/[0.03] transition-all overflow-hidden">
     <div className="flex justify-between items-center gap-2 min-h-[68px]">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-11 h-11 rounded-[6px] bg-[#050505] flex items-center justify-center text-[#506384] border border-white/5 shadow-inner font-pixel text-[13px] font-bold overflow-hidden shrink-0">
           {activeTab === 'cash' ? ( <span>{item.currency === 'TWD' ? 'NT' : 'US'}</span> ) : 
            activeTab === 'stocks' ? ( item.change >= 0 ? <TrendingUp size={22} className="text-up" /> : <TrendingDown size={22} className="text-down" /> ) : 
            activeTab === 'debts' ? ( <button aria-label="記錄本月已繳" onClick={() => onQuickPay(item.id)} disabled={!isDebtEnabled} className={`w-full h-full flex items-center justify-center transition-all ${isDebtEnabled ? 'bg-[#ff5b41]/10 text-[#ff5b41] active:bg-[#ff5b41] active:text-white' : 'text-[#333] cursor-not-allowed'}`}><Check size={20} strokeWidth={isDebtEnabled ? 4 : 2} /></button> ) : 
            ( <div className="flex flex-col items-center justify-center leading-none">{item.cycle === 'yearly' ? ( <> <span className="text-[11px] opacity-60 mb-0.5 font-pixel">{String(item.month).padStart(2, '0')}</span> <span className="text-[13px] font-bold font-pixel">{String(item.day).padStart(2, '0')}</span> </> ) : ( <span className="text-[13px] font-bold font-pixel">{String(item.day).padStart(2, '0')}</span> )}</div> )}
        </div>

        <div className="flex flex-col items-start text-left justify-center font-sans min-w-0 flex-1">
          <p className="text-xs font-bold text-white leading-tight font-sans uppercase tracking-tight mb-1 font-sans truncate w-full">{item.label || item.symbol}</p>
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {activeTab !== 'debts' && ( <p className="font-sans text-[11px] font-black text-[#4b5563] uppercase tracking-widest font-sans truncate">{activeTab === 'stocks' ? `${item.symbol}` : activeTab === 'cash' ? `${item.currency} NODE` : (item.tag || '')}</p> )}
            {activeTab === 'stocks' && <StockSyncBadge status={status} updatedAt={item.priceUpdatedAt} />}
            {activeTab === 'expenses' && ( <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-[2px] shrink-0 ${item.cycle === 'yearly' ? 'bg-[#ff5b41] text-white' : 'bg-[#506384] text-white font-black'}`}>{item.cycle === 'yearly' ? '年繳' : '月繳'}</span> )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 h-full font-sans font-bold ml-1">
        <div className="flex flex-col text-right justify-center font-pixel min-w-[70px]">
          <span className={`font-pixel text-sm text-white leading-none font-pixel`}>{showValues ? (activeTab === 'cash' && item.currency === 'USD' ? <Money value={item.amount} currency="US$" /> : <Money value={activeTab === 'stocks' ? (item.shares * item.price * stockRate) : item.amount} />) : 'XXXXX'}</span>
          {activeTab === 'cash' && item.currency === 'USD' && showValues && <span className="text-[11px] font-sans font-black text-[#4b5563] mt-1.5 whitespace-nowrap">≈ {formatTWD(item.amount * usdTwd)}</span>}
          {activeTab === 'stocks' && showValues && ( <div className="flex flex-col items-end gap-0.5 mt-1.5"> <div className="flex items-baseline gap-1"><span className={`text-[11px] font-sans font-black ${item.change >= 0 ? 'text-up' : 'text-down'}`}>{item.change >= 0 ? '+' : ''}{formatTWD(item.shares * item.change * stockRate)}</span></div> <span className="text-[11px] font-sans text-gray-500 uppercase font-black whitespace-nowrap">@ {item.price ? formatPrice(item.price) : '---'}{currency !== 'TWD' ? ` ${currency}` : ''}</span> </div> )}
        </div>
        <div className="flex flex-col gap-1.5 shrink-0"><button aria-label="編輯" onClick={() => onEdit(activeTab, item)} className="w-10 h-10 flex items-center justify-center rounded-[4px] bg-[#050505]/50 text-[#666] active:text-[#506384] transition-colors"><Edit2 size={16} /></button><button aria-label="刪除" onClick={() => onDelete(activeTab, item.id)} className="w-10 h-10 flex items-center justify-center rounded-[4px] bg-[#050505]/50 text-[#666] active:text-rose-600 transition-colors"><Trash2 size={16} /></button></div>
      </div>
     </div>
      {activeTab === 'debts' && item.monthlyPayment > 0 && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 bg-[#050505]/40 rounded-[4px] text-[11px] font-sans font-black">
          <span className="text-[#506384] min-w-0">月付 {formatTWD(item.monthlyPayment)}{item.annualRate > 0 ? ` · 年利率 ${item.annualRate}%` : ''}</span>
          <span className={`uppercase px-1.5 py-0.5 rounded-[2px] shrink-0 ${isPaid ? 'bg-[#d8ef9d] text-black' : 'text-[#4b5563] border border-white/5'}`}>{isPaid ? 'PAID' : `Day ${item.deductionDay}`}</span>
        </div>
      )}
      {/* 損益與股利放在獨立的區塊，避免擠在名稱欄位裡被截斷 */}
      {activeTab === 'stocks' && showValues && (
        <div className="flex flex-col gap-1.5 px-3 py-2 bg-[#050505]/40 rounded-[4px] text-[11px] font-sans font-black tracking-tight">
          {pnl && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#4b5563] min-w-0 truncate">{item.costTotal > 0 ? `總投入 ${formatTWD(item.costTotal)}` : `成本 ${formatPrice(item.costPrice)}${currency !== 'TWD' ? ` ${currency}` : ''}`}</span>
              <span className={`shrink-0 ${pnl.pnl >= 0 ? 'text-up' : 'text-down'}`}>損益 {formatSignedTWD(pnl.pnl)}（{formatPercent(pnl.pct)}）</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[#506384] min-w-0 truncate"><DollarSign size={12} className="shrink-0" />年股利 {formatTWD(item.shares * annualDividendPerShare(item) * stockRate)}</span>
            <span className="flex items-center gap-1.5 text-[#4b5563] shrink-0"><Calendar size={12} />配息月 {item.divMonth || '---'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
