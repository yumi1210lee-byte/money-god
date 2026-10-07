import { useState } from 'react';
import { PixelCoin } from './PixelCoin.jsx';

// 解鎖畫面；第一次使用時設定密碼
export const LockScreen = ({ isFirstTime, storedPassword, passcodeInputMode, onUnlock, onSetPasscode }) => {
  const [authInput, setAuthInput] = useState('');
  const [authError, setAuthError] = useState(false);

  const handleUnlock = () => {
    if (authInput === storedPassword) { onUnlock(); setAuthInput(''); setAuthError(false); }
    else { setAuthError(true); setAuthInput(''); }
  };
  const handleSetInitialPassword = () => {
    if (authInput.length < 4) return;
    onSetPasscode(authInput);
    setAuthInput('');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#050505] flex flex-col items-center justify-center px-6">
      <div className="mb-6 relative flex items-center justify-center animate-float">
         <div className="absolute w-32 h-32 bg-[#506384]/15 blur-3xl rounded-full"></div>
         <PixelCoin size={120} />
      </div>
      <div className="text-center mb-12">
        <h1 className="font-pixel text-4xl tracking-tighter mb-3 text-white uppercase font-bold">Money God</h1>
        <p className="font-sans text-[#4b5563] text-[11px] tracking-[0.2em] uppercase font-black font-sans">SECURED TERMINAL</p>
      </div>
      <div className="w-full max-w-xs space-y-[10px]">
        {isFirstTime && <p className="font-sans text-[11px] text-[#ff5b41] text-center mb-2 font-bold uppercase tracking-wider animate-pulse italic">Please set a passcode (at least 4 digits) / 請設定 4 位數以上密碼</p>}
        <input type="password" inputMode={passcodeInputMode} placeholder={isFirstTime ? "SET PASSCODE" : "PASSCODE"} className={`font-pixel w-full bg-[#1f1f21] border ${authError ? 'border-[#ff5b41]' : 'border-white/5'} rounded-[6px] px-6 h-14 focus:outline-none text-center text-2xl tracking-[0.5em] placeholder:text-gray-800 font-pixel font-pixel`} value={authInput} onChange={(e) => { setAuthInput(e.target.value); setAuthError(false); }} onKeyDown={(e) => e.key === 'Enter' && (isFirstTime ? handleSetInitialPassword() : handleUnlock())} />
        {authError && !isFirstTime && <p className="font-sans text-[11px] text-[#ff5b41] text-center font-black uppercase tracking-[0.2em] animate-bounce">Incorrect Passcode</p>}
        <button onClick={isFirstTime ? handleSetInitialPassword : handleUnlock} className="font-sans w-full bg-[#506384] text-white h-14 rounded-[6px] font-black text-base active:opacity-80 transition-all uppercase shadow-lg shadow-[#506384]/20 tracking-widest font-sans font-black">{isFirstTime ? 'Confirm Security' : 'Start Session'}</button>
      </div>
    </div>
  );
};
