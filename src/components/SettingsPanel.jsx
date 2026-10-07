import { useState } from 'react';
import { X, Download, Upload } from 'lucide-react';
import { formatDateTime, toYearMonth } from '../lib/format.js';
import { AUTO_LOCK_OPTIONS, LAST_BACKUP_KEY, PRE_IMPORT_KEY, readStorage } from '../lib/storage.js';
import { BACKUP_APP, parseBackup, countItems, saveBackupFile } from '../lib/backup.js';

// 設定：資料備份、自動上鎖、更改密碼
export const SettingsPanel = ({ data, storedPassword, passcodeInputMode, autoLockMin, onAutoLockChange, onReplaceData, onChangePasscode, onClose }) => {
  const [passForm, setPassForm] = useState({ old: '', new: '', confirm: '' });
  const [passMsg, setPassMsg] = useState(null);
  const [lastBackupAt, setLastBackupAt] = useState(() => readStorage(LAST_BACKUP_KEY));
  const [hasPreImport, setHasPreImport] = useState(() => !!readStorage(PRE_IMPORT_KEY));
  const [pendingImport, setPendingImport] = useState(null); // 等待確認的匯入：{ data, exportedAt, title }
  const [backupMsg, setBackupMsg] = useState(null);

  const handleExportBackup = async () => {
    const now = new Date();
    const json = JSON.stringify({ app: BACKUP_APP, version: 1, exportedAt: now.toISOString(), data }, null, 2);
    try {
      await saveBackupFile(json, `money-god-backup-${toYearMonth(now)}-${String(now.getDate()).padStart(2, '0')}`);
      localStorage.setItem(LAST_BACKUP_KEY, now.toISOString());
      setLastBackupAt(now.toISOString());
      setBackupMsg({ type: 'ok', text: '已匯出備份' });
    } catch (err) {
      // 使用者關掉分享選單不算失敗
      if (err?.name !== 'AbortError') setBackupMsg({ type: 'error', text: '匯出失敗，請再試一次' });
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 讓同一個檔案可以再選一次
    if (!file) return;
    try {
      const { data: imported, exportedAt } = parseBackup(await file.text());
      setPendingImport({ data: imported, exportedAt, title: `匯入「${file.name}」` });
      setBackupMsg(null);
    } catch {
      setPendingImport(null);
      setBackupMsg({ type: 'error', text: '這不是有效的 Money God 備份檔' });
    }
  };

  const handleRequestUndoImport = () => {
    try {
      const { data: previous } = parseBackup(readStorage(PRE_IMPORT_KEY));
      setPendingImport({ data: previous, exportedAt: null, title: '還原上一次匯入前的資料' });
      setBackupMsg(null);
    } catch {
      setBackupMsg({ type: 'error', text: '找不到可以還原的資料' });
    }
  };

  // 取代前先保留目前的資料，之後可以用「還原」換回來
  const handleConfirmImport = () => {
    localStorage.setItem(PRE_IMPORT_KEY, JSON.stringify(data));
    setHasPreImport(true);
    onReplaceData(pendingImport.data);
    setPendingImport(null);
    setBackupMsg({ type: 'ok', text: '資料已取代' });
  };

  const handleChangePassword = () => {
    if (passForm.old !== storedPassword) return setPassMsg({ type: 'error', text: '舊密碼不正確' });
    if (passForm.new.length < 4) return setPassMsg({ type: 'error', text: '新密碼至少需要 4 碼' });
    if (passForm.new !== passForm.confirm) return setPassMsg({ type: 'error', text: '兩次輸入的新密碼不一致' });
    onChangePasscode(passForm.new);
    setPassForm({ old: '', new: '', confirm: '' });
    setPassMsg({ type: 'ok', text: '密碼已更新' });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/95 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#050505] rounded-t-[6px] p-5 border-t border-white/10 h-[75vh] flex flex-col shadow-2xl font-sans">
        <div className="flex justify-between items-center mb-8 shrink-0 px-2 font-pixel">
          <div className="font-pixel">
            <h2 className="text-2xl text-white uppercase tracking-tighter leading-none">Settings</h2>
            <p className="text-[11px] text-[#506384] font-bold tracking-[0.1em] mt-2 font-sans uppercase font-black font-sans">Configuration</p>
          </div>
          <button aria-label="關閉設定" onClick={onClose} className="w-12 h-12 bg-[#1f1f21] rounded-[6px] flex items-center justify-center text-[#4b5563] border border-white/5 shadow-inner"><X size={24}/></button>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-[10px] font-sans">
          <div className="bg-[#1f1f21] p-6 rounded-[6px] space-y-4 border border-white/[0.03]">
            <label className="text-[14px] font-black text-[#506384] uppercase tracking-widest px-1 font-sans">Backup / 資料備份</label>
            <p className="text-[11px] text-[#4b5563] font-bold px-1 leading-relaxed">資料只存在這支手機的 App 裡，建議定期匯出備份。<br />{lastBackupAt ? `上次匯出：${formatDateTime(lastBackupAt)}` : '尚未匯出過備份'}</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleExportBackup} className="h-12 bg-[#506384] text-white rounded-[6px] font-black text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg"><Download size={14} />匯出備份</button>
              <label className="h-12 bg-[#050505] text-[#506384] border border-white/5 rounded-[6px] font-black text-xs tracking-widest flex items-center justify-center gap-2 cursor-pointer"><Upload size={14} />匯入備份<input type="file" accept=".json,.txt,application/json,text/plain" className="hidden" onChange={handleImportFile} /></label>
            </div>
            {pendingImport && (
              <div className="bg-[#050505] rounded-[6px] p-4 space-y-2 border border-[#ff5b41]/30">
                <p className="text-xs font-black text-white">{pendingImport.title}</p>
                {pendingImport.exportedAt && <p className="text-[11px] font-bold text-[#4b5563]">備份時間：{formatDateTime(pendingImport.exportedAt)}</p>}
                <p className="text-[11px] font-bold text-[#4b5563]">{countItems(pendingImport.data)}</p>
                <p className="text-[11px] font-black text-[#ff5b41]">目前的資料會被取代（之後可以用「還原」換回來）</p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={() => setPendingImport(null)} className="h-10 bg-[#1f1f21] text-[#4b5563] rounded-[4px] font-black text-xs">取消</button>
                  <button onClick={handleConfirmImport} className="h-10 bg-[#ff5b41] text-white rounded-[4px] font-black text-xs">確認取代</button>
                </div>
              </div>
            )}
            {backupMsg && <p className={`text-[11px] font-black px-1 ${backupMsg.type === 'error' ? 'text-[#ff5b41]' : 'text-[#d8ef9d]'}`}>{backupMsg.text}</p>}
            {hasPreImport && !pendingImport && <button onClick={handleRequestUndoImport} className="text-[11px] text-[#4b5563] underline font-bold px-1">還原上一次匯入前的資料</button>}
          </div>
          <div className="bg-[#1f1f21] p-6 rounded-[6px] space-y-4 border border-white/[0.03]">
            <label className="text-[14px] font-black text-[#506384] uppercase tracking-widest px-1 font-sans">Auto Lock / 自動上鎖</label>
            <p className="text-[11px] text-[#4b5563] font-bold px-1 leading-relaxed">切到其他 App 超過這段時間，回來時需要重新輸入密碼。上鎖時會自動隱藏金額。</p>
            <div className="grid grid-cols-4 gap-2">
              {AUTO_LOCK_OPTIONS.map(o => (
                <button key={o.value} onClick={() => onAutoLockChange(o.value)} className={`h-11 rounded-[4px] font-black text-xs transition-all ${autoLockMin === o.value ? 'bg-[#506384] text-white' : 'bg-[#050505] text-[#4b5563]'}`}>{o.label}</button>
              ))}
            </div>
          </div>
          <div className="bg-[#1f1f21] p-6 rounded-[6px] space-y-4 border border-white/[0.03]">
            <label className="text-[14px] font-black text-[#506384] uppercase tracking-widest px-1 font-sans">Change Passcode / 更改密碼</label>
            <div className="space-y-2">
              <input type="password" inputMode={passcodeInputMode} placeholder="Old Passcode" className="w-full bg-[#050505] border border-white/5 rounded-[6px] px-5 h-12 text-white text-sm shadow-inner font-bold" value={passForm.old} onChange={e => { setPassForm({...passForm, old: e.target.value}); setPassMsg(null); }} />
              <input type="password" inputMode={passcodeInputMode} placeholder="New Passcode" className="w-full bg-[#050505] border border-white/5 rounded-[6px] px-5 h-12 text-white text-sm shadow-inner font-bold" value={passForm.new} onChange={e => { setPassForm({...passForm, new: e.target.value}); setPassMsg(null); }} />
              <input type="password" inputMode={passcodeInputMode} placeholder="Confirm New" className="w-full bg-[#050505] border border-white/5 rounded-[6px] px-5 h-12 text-white text-sm shadow-inner font-bold" value={passForm.confirm} onChange={e => { setPassForm({...passForm, confirm: e.target.value}); setPassMsg(null); }} />
            </div>
            {passMsg && <p className={`text-[11px] font-black px-1 ${passMsg.type === 'error' ? 'text-[#ff5b41]' : 'text-[#d8ef9d]'}`}>{passMsg.text}</p>}
            <button onClick={handleChangePassword} className="w-full h-12 bg-[#506384] text-white rounded-[6px] font-black text-xs uppercase tracking-widest mt-2 shadow-lg font-black font-sans font-black">Update Security</button>
          </div>
        </div>
      </div>
    </div>
  );
};
