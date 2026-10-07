// 刪除或記錄已繳後的「復原」提示
export const UndoToast = ({ message, onUndo }) => (
    <div role="status" className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-40px)] max-w-sm bg-[#1f1f21] border border-white/10 rounded-[6px] shadow-2xl flex items-center justify-between gap-3 pl-4 pr-1 py-1 font-sans">
      <span className="text-xs font-bold text-white leading-snug py-2">{message}</span>
      <button onClick={onUndo} className="h-10 px-4 text-[13px] font-black text-[#d8ef9d] shrink-0">復原</button>
    </div>
);
