import { useState, useEffect, useMemo, useRef, useEffectEvent } from 'react';
import { Plus } from 'lucide-react';
import { toYearMonth, formatTWD } from './lib/format.js';
import { DATA_KEY, FX_KEY, AUTO_LOCK_KEY, AUTO_LOCK_OPTIONS, loadData, loadFxRates, readStorage } from './lib/storage.js';
import { STOCK_CONCURRENCY, AUTO_REFRESH_MS, RESUME_REFRESH_MS, runWithLimit, fetchStockQuote, isDividendStale, applyQuote, fetchFxRates } from './lib/quotes.js';
import { principalPaid } from './lib/debts.js';
import { buildEntryForm, buildItem, categoryKey } from './lib/entries.js';
import { computeTotals } from './lib/totals.js';
import { LockScreen } from './components/LockScreen.jsx';
import { Header } from './components/Header.jsx';
import { SummaryCards } from './components/SummaryCards.jsx';
import { TabBar } from './components/TabBar.jsx';
import { OverviewTab } from './components/OverviewTab.jsx';
import { ItemList } from './components/ItemList.jsx';
import { UndoToast } from './components/UndoToast.jsx';
import { SettingsPanel } from './components/SettingsPanel.jsx';
import { EntryModal } from './components/EntryModal.jsx';

const UNDO_MS = 6000;

const App = () => {
  const [storedPassword, setStoredPassword] = useState(localStorage.getItem('asset_terminal_pass') || '');
  const [isLocked, setIsLocked] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(!localStorage.getItem('asset_terminal_pass'));
  const [showValues, setShowValues] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [stockStatus, setStockStatus] = useState({}); // 每檔股票的更新狀態：'loading' | 'ok' | 'error'
  const syncingRef = useRef(false);
  const lastSyncAtRef = useRef(0);
  const stockRequestRef = useRef({});
  const [lastUpdated, setLastUpdated] = useState('--:--:--');
  const [syncStep, setSyncStep] = useState(-1);
  const [editingId, setEditingId] = useState(null);
  const [entryInitialForm, setEntryInitialForm] = useState(() => buildEntryForm());

  const [data, setData] = useState(loadData);

  const [fxRates, setFxRates] = useState(loadFxRates);
  const usdTwd = fxRates.TWD;
  const [undo, setUndo] = useState(null); // 可復原的上一個動作：{ message, restore }
  const undoTimerRef = useRef(null);
  const [autoLockMin, setAutoLockMin] = useState(() => {
    const saved = readStorage(AUTO_LOCK_KEY);
    return AUTO_LOCK_OPTIONS.some(o => String(o.value) === saved) ? Number(saved) : 1;
  });

  const isBusy = isSyncing || Object.values(stockStatus).includes('loading');
  // 密碼是純數字（或第一次設定）時才用數字鍵盤，避免含英文字母的舊密碼打不出來
  const passcodeInputMode = isFirstTime || /^\d+$/.test(storedPassword) ? 'numeric' : undefined;

  useEffect(() => {
    let interval;
    if (isBusy) {
      setSyncStep(0);
      interval = setInterval(() => { setSyncStep(prev => (prev + 1) % 3); }, 400);
    } else { setSyncStep(-1); }
    return () => clearInterval(interval);
  }, [isBusy]);

  // 在背景更新指定股票的報價，每檔抓到就先更新畫面，不會擋住其他操作；回傳成功的檔數
  const refreshStocks = async (stocks) => {
    if (!stocks.length) return 0;
    const token = {};
    stocks.forEach(s => { stockRequestRef.current[s.id] = token; });
    setStockStatus(prev => ({ ...prev, ...Object.fromEntries(stocks.map(s => [s.id, 'loading'])) }));
    let okCount = 0;
    await runWithLimit(stocks, STOCK_CONCURRENCY, async (stock) => {
      const quote = await fetchStockQuote(stock, { withName: !stock.label, withDividend: isDividendStale(stock) });
      if (quote) {
        okCount++;
        // 抓取期間股票被刪除或代號被改掉時，丟棄這筆結果
        setData(prev => ({ ...prev, stocks: prev.stocks.map(s => s.id === stock.id && s.symbol === stock.symbol ? applyQuote(s, quote) : s) }));
      }
      // 同一檔有更新的請求在跑時，以最新那次的結果為準
      if (stockRequestRef.current[stock.id] === token) setStockStatus(prev => ({ ...prev, [stock.id]: quote ? 'ok' : 'error' }));
    });
    return okCount;
  };

  const syncFinanceData = async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    lastSyncAtRef.current = Date.now();
    setIsSyncing(true);
    try {
      const [rates, okCount] = await Promise.all([fetchFxRates(), refreshStocks(data.stocks)]);
      if (rates) {
        setFxRates(rates);
        localStorage.setItem(FX_KEY, JSON.stringify(rates));
      }
      if (okCount > 0 || data.stocks.length === 0) setLastUpdated(new Date().toLocaleTimeString([], { hour12: false }));
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  };

  const onUnlocked = useEffectEvent(() => { syncFinanceData(); });
  const onAutoRefresh = useEffectEvent(() => {
    if (document.visibilityState === 'visible' && Date.now() - lastSyncAtRef.current >= RESUME_REFRESH_MS) syncFinanceData();
  });

  // 解鎖時同步一次；之後每 5 分鐘自動更新，從背景切回 App 時也會更新
  useEffect(() => {
    if (isLocked) return;
    onUnlocked();
    const autoRefresh = () => onAutoRefresh();
    const timer = setInterval(autoRefresh, AUTO_REFRESH_MS);
    document.addEventListener('visibilitychange', autoRefresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', autoRefresh); };
  }, [isLocked]);
  useEffect(() => { localStorage.setItem(DATA_KEY, JSON.stringify(data)); }, [data]);

  const totals = useMemo(() => computeTotals(data, fxRates), [data, fxRates]);

  const handleSetPasscode = (passcode) => {
    localStorage.setItem('asset_terminal_pass', passcode);
    setStoredPassword(passcode);
    setIsFirstTime(false);
  };

  const handleChangePasscode = (passcode) => {
    localStorage.setItem('asset_terminal_pass', passcode);
    setStoredPassword(passcode);
  };

  const handleOpenModal = (cat = 'cash', item = null) => {
    setEditingId(item ? item.id : null);
    setEntryInitialForm(buildEntryForm(cat, item));
    setIsModalOpen(true);
  };

  // 存檔一律立即完成；股票只有新增或改代號時才需要抓報價，且在背景進行
  const handleSaveEntry = (form) => {
    const key = categoryKey(form.type);
    const prevItem = editingId ? data[key].find(i => i.id === editingId) : null;
    const { item, needsQuote } = buildItem(form, prevItem, editingId);
    setData(prev => ({ ...prev, [key]: editingId ? prev[key].map(i => i.id === editingId ? item : i) : [...prev[key], item] }));
    setIsModalOpen(false);
    if (!editingId) setActiveTab(form.type);
    if (needsQuote) refreshStocks([item]);
  };

  const showUndo = (message, restore) => {
    clearTimeout(undoTimerRef.current);
    setUndo({ message, restore });
    undoTimerRef.current = setTimeout(() => setUndo(null), UNDO_MS);
  };

  const handleUndo = () => {
    clearTimeout(undoTimerRef.current);
    undo?.restore();
    setUndo(null);
  };

  const handleQuickPay = (id) => {
    const debt = data.debts.find(d => d.id === id);
    if (!debt) return;
    const today = new Date();
    const before = { amount: debt.amount, lastPaidMonth: debt.lastPaidMonth, lastPaidYM: debt.lastPaidYM };
    // 同時保留 lastPaidMonth，讓舊版程式讀到的資料仍然正確
    setData(prev => ({ ...prev, debts: prev.debts.map(d => d.id === id ? { ...d, amount: d.amount - principalPaid(d), lastPaidMonth: today.getMonth() + 1, lastPaidYM: toYearMonth(today) } : d) }));
    showUndo(`已記錄「${debt.label}」本月還款，本金減少 ${formatTWD(principalPaid(debt))}`, () => {
      setData(prev => ({ ...prev, debts: prev.debts.map(d => d.id === id ? { ...d, ...before } : d) }));
    });
  };

  const deleteItem = (cat, id) => {
    const key = categoryKey(cat);
    const index = data[key].findIndex(i => i.id === id);
    if (index < 0) return;
    const item = data[key][index];
    setData(prev => ({ ...prev, [key]: prev[key].filter(i => i.id !== id) }));
    // 復原時放回原本的位置
    showUndo(`已刪除「${item.label || item.symbol}」`, () => {
      setData(prev => prev[key].some(i => i.id === id) ? prev : { ...prev, [key]: [...prev[key].slice(0, index), item, ...prev[key].slice(index)] });
    });
  };

  // 匯入備份後取代全部資料，並重新抓股價
  const handleReplaceData = (newData) => {
    setData(newData);
    setStockStatus({});
    refreshStocks(newData.stocks);
  };

  // 上鎖時一併隱藏金額、關閉所有視窗
  const lockApp = () => {
    setIsLocked(true);
    setShowValues(false);
    setIsModalOpen(false);
    setIsSettingsOpen(false);
    setUndo(null);
  };

  const handleAutoLockChange = (value) => {
    setAutoLockMin(value);
    localStorage.setItem(AUTO_LOCK_KEY, String(value));
  };

  const onAutoLock = useEffectEvent(() => lockApp());

  // 切到背景超過設定時間，回來時自動上鎖；設定「立即」時一離開就上鎖
  useEffect(() => {
    if (isLocked || autoLockMin < 0) return;
    let hiddenAt = null;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        if (autoLockMin === 0) onAutoLock();
      } else {
        if (hiddenAt !== null && Date.now() - hiddenAt >= autoLockMin * 60 * 1000) onAutoLock();
        hiddenAt = null;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [isLocked, autoLockMin]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#e5e7eb] font-sans selection:bg-[#506384]/30">
      <link href="https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=Noto+Sans+TC:wght@400;500;700;900&display=swap" rel="stylesheet" />
      <style>{`
        .font-pixel { font-family: 'Silkscreen', cursive !important; } 
        .font-sans { font-family: 'Noto Sans TC', sans-serif !important; } 
        .no-scrollbar::-webkit-scrollbar { display: none; } 
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } 
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        @keyframes float-nav { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .animate-spin { animation: spin 1s linear infinite; } 
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-float-nav { animation: float-nav 2.5s ease-in-out infinite; }
        .text-up { color: #ff5b41; } 
        .text-down { color: #d8ef9d; }
      `}</style>

      {isLocked && <LockScreen isFirstTime={isFirstTime} storedPassword={storedPassword} passcodeInputMode={passcodeInputMode} onUnlock={() => setIsLocked(false)} onSetPasscode={handleSetPasscode} />}

      <Header showValues={showValues} onToggleValues={() => setShowValues(!showValues)} onOpenSettings={() => setIsSettingsOpen(true)} onLock={lockApp} />

      <main className="max-w-md mx-auto px-5 pb-48">
        <SummaryCards totals={totals} showValues={showValues} isBusy={isBusy} syncStep={syncStep} lastUpdated={lastUpdated} onRefresh={syncFinanceData} />

        <TabBar activeTab={activeTab} onChange={setActiveTab} />

        <div className="space-y-[10px]">
          {activeTab === 'overview' && <OverviewTab totals={totals} showValues={showValues} />}

          {(['cash', 'stocks', 'debts', 'expenses']).includes(activeTab) && (
            <ItemList activeTab={activeTab} items={data[categoryKey(activeTab)]} totals={totals} showValues={showValues} fxRates={fxRates} usdTwd={usdTwd} stockStatus={stockStatus} onQuickPay={handleQuickPay} onEdit={handleOpenModal} onDelete={deleteItem} />
          )}
        </div>
      </main>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
        <button 
          onClick={() => handleOpenModal(activeTab)} 
          className="bg-[#506384] text-white w-16 h-16 rounded-[8px] shadow-[0_8px_30px_rgb(80,99,132,0.4)] flex items-center justify-center active:scale-95 hover:scale-105 transition-all border border-white/10"
        >
          <Plus size={32} strokeWidth={3} />
        </button>
      </div>

      {undo && !isLocked && <UndoToast message={undo.message} onUndo={handleUndo} />}

      {isSettingsOpen && (
        <SettingsPanel data={data} storedPassword={storedPassword} passcodeInputMode={passcodeInputMode} autoLockMin={autoLockMin} onAutoLockChange={handleAutoLockChange} onReplaceData={handleReplaceData} onChangePasscode={handleChangePasscode} onClose={() => setIsSettingsOpen(false)} />
      )}

      {isModalOpen && <EntryModal initialForm={entryInitialForm} isEditing={!!editingId} onSave={handleSaveEntry} onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

export default App;
