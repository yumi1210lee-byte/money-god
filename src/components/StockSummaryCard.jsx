import { formatTWD, formatSignedTWD, formatPercent } from '../lib/format.js';

const Row = ({ label, hint, children }) => (
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <p className="text-[12px] font-black text-white/70">{label}</p>
      {hint && <p className="text-[11px] font-bold text-[#4b5563] mt-0.5">{hint}</p>}
    </div>
    <div className="text-right shrink-0 text-[13px] font-black">{children}</div>
  </div>
);

const tone = (value) => value >= 0 ? 'text-up' : 'text-down';

// 總覽：今日損益、未實現損益、年度股利
export const StockSummaryCard = ({ portfolio, stockCount, showValues }) => {
  if (!stockCount) return null;
  const hidden = <span className="text-white">XXXXX</span>;
  return (
    <div className="bg-[#1f1f21] rounded-[6px] p-6 border border-white/[0.03] font-sans space-y-4">
      <h3 className="text-[13px] text-[#506384] uppercase tracking-widest font-black">Stocks / 股票摘要</h3>
      <Row label="今日損益">
        {showValues ? <span className={tone(portfolio.todayChange)}>{formatSignedTWD(portfolio.todayChange)}</span> : hidden}
      </Row>
      <Row label="未實現損益" hint={portfolio.withCost ? `已填成本 ${portfolio.withCost}／${stockCount} 檔` : '在股票的編輯畫面填入平均成本即可計算'}>
        {!portfolio.withCost ? <span className="text-[#4b5563]">—</span>
          : showValues ? <span className={tone(portfolio.pnl)}>{formatSignedTWD(portfolio.pnl)}<span className="block text-[11px]">{formatPercent(portfolio.pnlPct)}</span></span>
          : hidden}
      </Row>
      <Row label="年股利" hint="依近 12 個月的配息估算">
        {showValues ? <span className="text-white">{formatTWD(portfolio.annualDividend)}<span className="block text-[11px] text-[#4b5563]">每月平均 {formatTWD(portfolio.annualDividend / 12)}</span></span> : hidden}
      </Row>
    </div>
  );
};
