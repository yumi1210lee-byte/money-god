import { useCallback, useMemo, useRef, useState } from 'react';
import { Money } from './Money.jsx';
import { formatTWD, formatSignedTWD, formatPercent } from '../lib/format.js';
import { toDateKey } from '../lib/history.js';

// 線條色通過資料視覺化檢查：在深色卡片 #1f1f21 上的亮度、彩度與對比（≥ 3:1）皆合格
const LINE = '#6b8fd6';
const SURFACE = '#1f1f21';
const GRID = '#2c2c30';
const AXIS_TEXT = '#6b7280';
const HEIGHT = 168;
const PAD = { top: 10, right: 10, bottom: 22, left: 50 };
const RANGES = [
  { id: '1M', label: '1 個月', days: 30 },
  { id: '3M', label: '3 個月', days: 91 },
  { id: '1Y', label: '1 年', days: 365 },
  { id: 'ALL', label: '全部', days: null },
];

const parseDateKey = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
const shortDate = (key) => { const [, m, d] = key.split('-').map(Number); return `${m}/${d}`; };

// 軸上的金額以「萬」「億」表示
const formatAxis = (value) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toFixed(1).replace(/\.0$/, '')}億`;
  if (abs >= 1e4) return `${sign}${Math.round(abs / 1e4).toLocaleString('zh-TW')}萬`;
  return `${sign}${Math.round(abs).toLocaleString('zh-TW')}`;
};

// 刻度取 1、2、5 × 10 的次方，約 3 格
const niceTicks = (min, max) => {
  if (min === max) { const pad = Math.max(Math.abs(max) * 0.01, 10000); min -= pad; max += pad; }
  const raw = (max - min) / 3;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].find(u => raw / pow <= u) * pow;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  return { lo, hi, ticks };
};

const changeBetween = (first, last) => {
  const diff = last.netWorth - first.netWorth;
  return { diff, pct: first.netWorth !== 0 ? (diff / Math.abs(first.netWorth)) * 100 : null };
};

// 總覽：淨資產走勢圖（拖曳或左右鍵查看每一天，也可以切換成表格）
export const NetWorthChart = ({ history, showValues }) => {
  const [rangeId, setRangeId] = useState('3M');
  const [activeIndex, setActiveIndex] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [width, setWidth] = useState(300);
  const observerRef = useRef(null);

  // 依實際寬度畫圖，文字才會維持設定的大小
  const measureRef = useCallback((el) => {
    observerRef.current?.disconnect();
    if (!el) return;
    observerRef.current = new ResizeObserver(([entry]) => setWidth(Math.max(200, Math.round(entry.contentRect.width))));
    observerRef.current.observe(el);
  }, []);

  const points = useMemo(() => {
    const range = RANGES.find(r => r.id === rangeId);
    if (!range.days) return history;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - range.days);
    return history.filter(h => h.date >= toDateKey(cutoff));
  }, [history, rangeId]);

  const chart = useMemo(() => {
    if (points.length < 2) return null;
    const t0 = parseDateKey(points[0].date);
    const t1 = parseDateKey(points[points.length - 1].date);
    const values = points.map(p => p.netWorth);
    const { lo, hi, ticks } = niceTicks(Math.min(...values), Math.max(...values));
    const plotW = width - PAD.left - PAD.right;
    const plotH = HEIGHT - PAD.top - PAD.bottom;
    const x = (p) => PAD.left + ((parseDateKey(p.date) - t0) / (t1 - t0)) * plotW;
    const y = (v) => PAD.top + (1 - (v - lo) / (hi - lo)) * plotH;
    const coords = points.map(p => [x(p), y(p.netWorth)]);
    const line = coords.map(([cx, cy], i) => `${i ? 'L' : 'M'}${cx.toFixed(1)},${cy.toFixed(1)}`).join('');
    const baseY = PAD.top + plotH;
    const area = `${line}L${coords[coords.length - 1][0].toFixed(1)},${baseY}L${coords[0][0].toFixed(1)},${baseY}Z`;
    return { coords, line, area, ticks, y, baseY };
  }, [points, width]);

  const shown = activeIndex !== null && points[activeIndex] ? points[activeIndex] : points[points.length - 1];
  const change = points.length >= 2 ? changeBetween(points[0], shown) : null;

  const indexAt = (clientX, target) => {
    const rect = target.getBoundingClientRect();
    const px = clientX - rect.left;
    let best = 0;
    chart.coords.forEach(([cx], i) => { if (Math.abs(cx - px) < Math.abs(chart.coords[best][0] - px)) best = i; });
    return best;
  };

  const handleKeyDown = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const current = activeIndex ?? points.length - 1;
    setActiveIndex(Math.min(points.length - 1, Math.max(0, current + (e.key === 'ArrowRight' ? 1 : -1))));
  };

  return (
    <div className="bg-[#1f1f21] rounded-[6px] p-6 border border-white/[0.03] font-sans">
      <div className="flex justify-between items-center gap-3 mb-4">
        <h3 className="text-[13px] text-[#506384] uppercase tracking-widest font-black">Trend / 淨資產走勢</h3>
        {points.length >= 2 && (
          <button onClick={() => { setShowTable(!showTable); setActiveIndex(null); }} className="text-[11px] font-black text-[#6b7280] underline shrink-0">{showTable ? '看圖表' : '看表格'}</button>
        )}
      </div>

      {history.length < 2 ? (
        <p className="text-[12px] font-bold text-[#6b7280] leading-relaxed">已開始記錄淨資產。之後每天打開 App 都會自動記下一筆，累積兩天以上就能看到走勢。</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-1.5 mb-4" role="group" aria-label="期間">
            {RANGES.map(r => (
              <button key={r.id} onClick={() => { setRangeId(r.id); setActiveIndex(null); }} aria-pressed={rangeId === r.id} className={`h-9 rounded-[4px] text-[11px] font-black transition-all ${rangeId === r.id ? 'bg-[#506384] text-white' : 'bg-[#050505] text-[#6b7280]'}`}>{r.label}</button>
            ))}
          </div>

          {points.length < 2 ? (
            <p className="text-[12px] font-bold text-[#6b7280]">這段期間的紀錄還不到兩天，請選擇較長的期間。</p>
          ) : (
            <>
              <div className="mb-3" aria-live="polite">
                <p className="text-[11px] font-bold text-[#6b7280]">{activeIndex !== null ? shortDate(shown.date) : '目前'}</p>
                <p className="font-pixel text-xl text-white leading-tight">{showValues ? <Money value={shown.netWorth} /> : 'XXXXX'}</p>
                {change && showValues && (
                  <p className={`text-[12px] font-black ${change.diff >= 0 ? 'text-up' : 'text-down'}`}>
                    {formatSignedTWD(change.diff)}{change.pct !== null ? `（${formatPercent(change.pct)}）` : ''}
                    <span className="text-[#6b7280] font-bold"> 與 {shortDate(points[0].date)} 相比</span>
                  </p>
                )}
              </div>

              {showTable ? (
                <div className="max-h-64 overflow-y-auto no-scrollbar">
                  <table className="w-full text-[12px] font-black">
                    <thead><tr className="text-[#6b7280] text-left"><th className="font-bold py-1">日期</th><th className="font-bold py-1 text-right">淨資產</th></tr></thead>
                    <tbody>
                      {[...points].reverse().map(p => (
                        <tr key={p.date} className="border-t border-white/[0.04]"><td className="py-1.5 text-white/70">{p.date}</td><td className="py-1.5 text-right text-white">{showValues ? formatTWD(p.netWorth) : 'XXXXX'}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  ref={measureRef}
                  tabIndex={0}
                  role="group"
                  aria-label={`淨資產走勢圖，${shortDate(points[0].date)} 到 ${shortDate(points[points.length - 1].date)}。可用左右鍵查看每天的數值，或切換成表格。`}
                  onKeyDown={handleKeyDown}
                  onBlur={() => setActiveIndex(null)}
                  className="outline-none focus-visible:ring-1 focus-visible:ring-[#6b8fd6] rounded-[4px]"
                >
                  <svg
                    aria-hidden="true"
                    width={width}
                    height={HEIGHT}
                    className="block select-none"
                    style={{ touchAction: 'pan-y' }}
                    onPointerDown={e => setActiveIndex(indexAt(e.clientX, e.currentTarget))}
                    onPointerMove={e => setActiveIndex(indexAt(e.clientX, e.currentTarget))}
                    onPointerLeave={() => setActiveIndex(null)}
                  >
                    {chart.ticks.map(t => (
                      <g key={t}>
                        <line x1={PAD.left} x2={width - PAD.right} y1={chart.y(t)} y2={chart.y(t)} stroke={GRID} strokeWidth="1" />
                        {showValues && <text x={PAD.left - 6} y={chart.y(t)} dy="0.35em" textAnchor="end" fontSize="11" fill={AXIS_TEXT}>{formatAxis(t)}</text>}
                      </g>
                    ))}
                    <text x={PAD.left} y={HEIGHT - 4} fontSize="11" fill={AXIS_TEXT}>{shortDate(points[0].date)}</text>
                    <text x={width - PAD.right} y={HEIGHT - 4} fontSize="11" fill={AXIS_TEXT} textAnchor="end">{shortDate(points[points.length - 1].date)}</text>
                    <path d={chart.area} fill={LINE} fillOpacity="0.1" />
                    <path d={chart.line} fill="none" stroke={LINE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                    {activeIndex !== null && chart.coords[activeIndex] && (
                      <line x1={chart.coords[activeIndex][0]} x2={chart.coords[activeIndex][0]} y1={PAD.top} y2={chart.baseY} stroke={AXIS_TEXT} strokeWidth="1" />
                    )}
                    {(() => {
                      const [cx, cy] = chart.coords[activeIndex ?? chart.coords.length - 1];
                      return <circle cx={cx} cy={cy} r="4" fill={LINE} stroke={SURFACE} strokeWidth="2" />;
                    })()}
                  </svg>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};
