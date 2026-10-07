import { Eye, EyeOff, Settings, Lock } from 'lucide-react';
import { PixelCoin } from './PixelCoin.jsx';

export const Header = ({ showValues, onToggleValues, onOpenSettings, onLock }) => (
    <nav className="sticky top-0 z-40 px-5 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-6 flex justify-between items-center max-w-md mx-auto bg-[#050505]/95 backdrop-blur-md border-b border-white/[0.03]">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center animate-float-nav">
          <PixelCoin size={32} />
        </div>
        <div><span className="font-pixel text-lg block leading-none text-white uppercase tracking-tighter">Money God</span><span className="font-sans text-[11px] text-[#4b5563] font-bold tracking-widest uppercase italic">Terminal Active</span></div>
      </div>
      <div className="flex gap-[10px]">
        <button aria-label={showValues ? '隱藏金額' : '顯示金額'} onClick={onToggleValues} className="w-11 h-11 flex items-center justify-center bg-[#1f1f21] rounded-[6px] text-[#4b5563] border border-white/5">{showValues ? <Eye size={18} /> : <EyeOff size={18} />}</button>
        <button aria-label="設定" onClick={onOpenSettings} className="w-11 h-11 flex items-center justify-center bg-[#1f1f21] rounded-[6px] text-[#4b5563] border border-white/5"><Settings size={18} /></button>
        <button aria-label="上鎖" onClick={onLock} className="w-11 h-11 flex items-center justify-center bg-[#1f1f21] rounded-[6px] text-[#506384] border border-white/5"><Lock size={18} /></button>
      </div>
    </nav>
);
