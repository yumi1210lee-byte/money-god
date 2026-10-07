import { useState } from 'react';
import { X, Wallet, TrendingUp, ArrowDownCircle, Calendar } from 'lucide-react';
import { EXPENSE_TAGS, getInvalidFields, canSaveEntry } from '../lib/entries.js';

// 新增／編輯項目的表單
export const EntryModal = ({ initialForm, isEditing, onSave, onClose }) => {
  const [entryForm, setEntryForm] = useState(initialForm);
  // 月份、日期超出範圍時標紅並停用送出
  const invalidField = getInvalidFields(entryForm);
  const canSave = canSaveEntry(entryForm);
  const handleSave = () => { if (canSave) onSave(entryForm); };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/95 backdrop-blur-md font-sans">
       <div className="w-full max-w-md bg-[#050505] rounded-t-[6px] p-5 border-t border-white/10 h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans">
          <div className="flex justify-between items-center mb-8 shrink-0 px-2 font-pixel">
            <div><h2 className="text-2xl text-white uppercase tracking-tighter leading-none font-pixel">{isEditing ? 'EDIT ENTRY' : 'NEW ENTRY'}</h2><p className="text-[11px] text-[#506384] font-bold mt-2 uppercase">Transaction Module Enabled</p></div>
            <button aria-label="關閉" onClick={onClose} className="w-12 h-12 bg-[#1f1f21] rounded-[6px] flex items-center justify-center text-[#4b5563] border border-white/5 shadow-inner"><X size={24}/></button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar pb-10 space-y-[10px] px-1 font-sans">
            {!isEditing && (
              <div className="grid grid-cols-4 gap-[10px] bg-[#1f1f21] p-1.5 rounded-[6px] mb-4">
                {[{ id: 'cash', icon: Wallet, label: '現金' }, { id: 'stocks', icon: TrendingUp, label: '股票' }, { id: 'debts', icon: ArrowDownCircle, label: '負債' }, { id: 'expenses', icon: Calendar, label: '支出' }].map(t => (
                  <button key={t.id} onClick={() => setEntryForm({...entryForm, type: t.id})} className={`py-5 rounded-[6px] flex flex-col items-center gap-2 border transition-all ${entryForm.type === t.id ? 'bg-[#506384] text-white border-transparent shadow-lg' : 'bg-transparent text-[#4b5563] border-transparent'}`}><t.icon size={18} /><span className="text-[11px] font-sans font-black uppercase font-black font-sans font-black">{t.label}</span></button>
                ))}
              </div>
            )}
            <div className="space-y-[10px] font-black">
              <div className="bg-[#1f1f21] p-6 rounded-[6px] space-y-3 border border-white/[0.03] font-sans"><label className="text-[14px] font-black text-[#506384] uppercase font-sans font-black">Name / 標籤名稱</label><input type="text" placeholder="項目說明..." className="w-full bg-[#050505] border border-white/5 rounded-[6px] px-5 h-14 text-white text-base font-bold shadow-inner font-black" value={entryForm.label} onChange={e => setEntryForm({...entryForm, label: e.target.value})} /></div>

              {entryForm.type === 'stocks' && (
                <div className="bg-[#1f1f21] p-6 rounded-[6px] space-y-3 border border-white/[0.03] font-sans">
                   <label className="text-[14px] font-black text-[#506384] uppercase font-black">Symbol / 代號</label>
                   <input type="text" placeholder="0050 / TSLA" className="font-pixel w-full bg-[#050505] border border-white/5 rounded-[6px] px-4 h-14 text-white text-lg shadow-inner font-pixel" value={entryForm.symbol} onChange={e => setEntryForm({...entryForm, symbol: e.target.value})} />
                </div>
              )}

              {entryForm.type === 'stocks' ? (
                <>
                 <div className="bg-[#1f1f21] p-6 rounded-[6px] space-y-3 border border-white/[0.03] font-sans">
                   <label className="text-[14px] font-black text-[#506384] uppercase leading-none font-black">Shares / 持有股數</label>
                   <input type="number" inputMode="decimal" placeholder="0.00" className="font-pixel w-full bg-[#050505] border border-white/5 rounded-[6px] px-6 h-14 text-white text-lg shadow-inner font-pixel" value={entryForm.shares} onChange={e => setEntryForm({...entryForm, shares: e.target.value})} />
                 </div>
                 <div className="bg-[#1f1f21] p-6 rounded-[6px] space-y-3 border border-white/[0.03] font-sans">
                   <label className="text-[14px] font-black text-[#506384] uppercase leading-none font-black">Cost / 平均成本（選填）</label>
                   <input type="number" inputMode="decimal" placeholder="每股買進均價" className={`font-pixel w-full bg-[#050505] border ${invalidField.costPrice ? 'border-[#ff5b41]' : 'border-white/5'} rounded-[6px] px-6 h-14 text-white text-lg shadow-inner font-pixel`} value={entryForm.costPrice} onChange={e => setEntryForm({...entryForm, costPrice: e.target.value})} />
                   {invalidField.costPrice && <p className="text-[11px] font-black text-[#ff5b41] mt-1">請輸入 0 以上的數字</p>}
                   <p className="text-[11px] font-bold text-[#4b5563] leading-relaxed">以股票報價的幣別填寫（美股填美元）。填寫後會顯示未實現損益與報酬率。</p>
                 </div>
                </>
              ) : (
                 <div className="bg-[#1f1f21] p-6 rounded-[6px] space-y-3 border border-white/[0.03] font-sans">
                   <label className="text-[14px] font-black text-[#506384] uppercase leading-none font-black">Amount / 主要金額</label>
                   <input type="number" inputMode="decimal" placeholder="0.00" className="font-pixel w-full bg-[#050505] border border-white/5 rounded-[6px] px-6 h-14 text-white text-lg shadow-inner font-pixel" value={entryForm.amount} onChange={e => setEntryForm({...entryForm, amount: e.target.value})} />
                 </div>
              )}

              {entryForm.type === 'cash' && (
                <div className="bg-[#1f1f21] p-6 rounded-[6px] flex gap-[10px] border border-white/[0.03] font-sans">
                  {['TWD', 'USD'].map(c => (
                    <button key={c} type="button" onClick={() => setEntryForm({...entryForm, currency: c})} className={`flex-1 h-14 rounded-[4px] font-pixel text-xs font-bold border transition-all ${entryForm.currency === c ? 'bg-[#506384] text-white border-transparent' : 'bg-[#050505] text-[#4b5563] border-transparent'}`}>{c}</button>
                  ))}
                </div>
              )}

              {entryForm.type === 'expenses' && (
                <div className="space-y-[10px] font-sans font-black">
                  <div className="bg-[#1f1f21] p-6 rounded-[6px] space-y-3 border border-white/[0.03]">
                    <label className="text-[14px] font-black text-[#506384] uppercase font-black">Tag / 支出類別</label>
                    <div className="grid grid-cols-2 gap-2 font-sans font-black">
                      {EXPENSE_TAGS.map(tag => (
                        <button key={tag} onClick={() => setEntryForm({...entryForm, tag})} className={`h-12 rounded-[4px] font-black text-xs border border-transparent transition-all ${entryForm.tag === tag ? 'bg-[#506384] text-white' : 'bg-[#050505] text-[#4b5563]'}`}>{tag}</button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-[#1f1f21] p-6 rounded-[6px] space-y-3 border border-white/[0.03]">
                    <label className="text-[14px] font-black text-[#506384] uppercase font-black">Cycle / 週期</label>
                    <div className="flex gap-2 font-sans font-black">
                      <button onClick={() => setEntryForm({...entryForm, cycle: 'monthly'})} className={`flex-1 h-12 rounded-[4px] font-black text-xs border border-transparent transition-all ${entryForm.cycle === 'monthly' ? 'bg-[#506384] text-white' : 'bg-[#050505] text-[#4b5563]'}`}>月繳</button>
                      <button onClick={() => setEntryForm({...entryForm, cycle: 'yearly'})} className={`flex-1 h-12 rounded-[4px] font-black text-xs border border-transparent transition-all ${entryForm.cycle === 'yearly' ? 'bg-[#506384] text-white' : 'bg-[#050505] text-[#4b5563]'}`}>年繳</button>
                    </div>
                  </div>
                  <div className="bg-[#1f1f21] p-6 rounded-[6px] grid grid-cols-2 gap-5 border border-white/[0.03] font-sans">
                    {entryForm.cycle === 'yearly' && (<div><label className="text-[14px] font-black text-[#506384] uppercase font-black">Month / 月</label><input type="number" inputMode="numeric" min="1" max="12" className={`font-pixel w-full bg-[#050505] border ${invalidField.month ? 'border-[#ff5b41]' : 'border-white/5'} rounded-[6px] px-4 h-14 text-white text-lg shadow-inner font-pixel`} value={entryForm.month} onChange={e => setEntryForm({...entryForm, month: e.target.value})} />{invalidField.month && <p className="text-[11px] font-black text-[#ff5b41] mt-1">請輸入 1–12</p>}</div>)}
                    <div className={entryForm.cycle === 'monthly' ? 'col-span-2' : ''}><label className="text-[14px] font-black text-[#506384] uppercase font-black">Day / 日</label><input type="number" inputMode="numeric" min="1" max="31" className={`font-pixel w-full bg-[#050505] border ${invalidField.day ? 'border-[#ff5b41]' : 'border-white/5'} rounded-[6px] px-4 h-14 text-white text-lg shadow-inner font-pixel`} value={entryForm.day} onChange={e => setEntryForm({...entryForm, day: e.target.value})} />{invalidField.day && <p className="text-[11px] font-black text-[#ff5b41] mt-1">請輸入 1–31</p>}</div>
                  </div>
                </div>
              )}

              {entryForm.type === 'debts' && (
                <div className="grid grid-cols-2 gap-4 font-sans font-black">
                   <div className="bg-[#1f1f21] p-6 rounded-[6px] space-y-3 border border-white/[0.03]">
                      <label className="text-[12px] font-black text-[#506384] uppercase">Installment / 月付</label>
                      <input type="number" inputMode="decimal" placeholder="0" className="font-pixel w-full bg-[#050505] border border-white/5 rounded-[6px] px-4 h-12 text-white text-sm font-pixel" value={entryForm.monthlyPayment} onChange={e => setEntryForm({...entryForm, monthlyPayment: e.target.value})} />
                   </div>
                   <div className="bg-[#1f1f21] p-6 rounded-[6px] space-y-3 border border-white/[0.03]">
                      <label className="text-[12px] font-black text-[#506384] uppercase">Pay Day / 扣款日</label>
                      <input type="number" inputMode="numeric" min="1" max="31" className={`font-pixel w-full bg-[#050505] border ${invalidField.deductionDay ? 'border-[#ff5b41]' : 'border-white/5'} rounded-[6px] px-4 h-12 text-white text-sm font-pixel`} value={entryForm.deductionDay} onChange={e => setEntryForm({...entryForm, deductionDay: e.target.value})} />
                      {invalidField.deductionDay && <p className="text-[11px] font-black text-[#ff5b41] mt-1">請輸入 1–31</p>}
                   </div>
                   <div className="col-span-2 bg-[#1f1f21] p-6 rounded-[6px] space-y-3 border border-white/[0.03]">
                      <label className="text-[12px] font-black text-[#506384] uppercase">Rate / 年利率 %（選填）</label>
                      <input type="number" inputMode="decimal" placeholder="例如 2.1" className={`font-pixel w-full bg-[#050505] border ${invalidField.annualRate ? 'border-[#ff5b41]' : 'border-white/5'} rounded-[6px] px-4 h-12 text-white text-sm font-pixel`} value={entryForm.annualRate} onChange={e => setEntryForm({...entryForm, annualRate: e.target.value})} />
                      {invalidField.annualRate && <p className="text-[11px] font-black text-[#ff5b41] mt-1">請輸入 0–100</p>}
                      <p className="text-[11px] font-bold text-[#4b5563] leading-relaxed">填寫後，按「已繳」只會扣掉月付金中還本金的部分（月付金 − 剩餘本金 × 年利率 ÷ 12）。不填則整筆月付金都算本金。</p>
                   </div>
                </div>
              )}
            </div>
          </div>
          <div className="pt-6 pb-12 shrink-0 font-sans"><button onClick={handleSave} disabled={!canSave} className="w-full h-16 rounded-[6px] bg-[#506384] text-white font-black text-lg transition-all disabled:opacity-40 shadow-xl flex items-center justify-center gap-3 font-black">COMMIT CHANGES</button></div>
       </div>
    </div>
  );
};
