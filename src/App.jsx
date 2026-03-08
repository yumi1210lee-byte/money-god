import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  ArrowDownCircle, 
  Calendar, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Lock,
  Unlock, 
  RefreshCw,
  X,
  PieChart,
  Check,
  Edit2,
  Activity, 
  Search,
  DollarSign,
  Settings,
  AlertTriangle,
  ChevronRight,
  Tag,
  CreditCard,
  Clock
} from 'lucide-react';

// --- 品牌視覺資產：32x32 高精細版藍色像素金幣 ---
const PixelCoin = ({ size = 24 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M10 2h12v2h4v2h2v4h2v12h-2v4h-2v2h-4v2H10v-2H6v-2H4v-4H2V10h2V6h2V4h4V2z" fill="#1A2433" />
      <path d="M10 4h12v2h4v4h2v12h-2v4h-4v2H10v-2H6v-4H4V10h2V6h4V4z" fill="#3A4B66" />
      <path d="M10 6h12v2h4v4h2v10h-2v4h-4v2H10v-2H6v-4H4V12h2V8h4V6z" fill="#506384" />
      <path d="M10 6h12v2H10V6zM8 8h2v2H8V8zM6 10h2v4H6v-4z" fill="#7A8FA6" />
      <path d="M15 9h2v14h-2V9z" fill="#FFFFFF" />
      <path d="M12 11h8v2h-8v-2zM12 13h2v2h-2v-2zM12 15h8v2h-8v-2zM18 17h2v2h-2v-2zM12 19h8v2h-8v-2z" fill="#FFFFFF" />
      <path d="M14 11h4v1h-4v-1zM14 15h4v1h-4v-1zM14 19h4v1h-4v-1z" fill="#DCE4EF" />
      <path d="M22 24h4v2h-4v-2zM26 20h2v4h-2v-4z" fill="#1A2433" opacity="0.4" />
    </svg>
  );
};

const formatTWD = (val) => new Intl.NumberFormat('zh-TW', { 
  style: 'currency', 
  currency: 'TWD', 
  maximumFractionDigits: 0 
}).format(val).replace('$', '$ ');

const App = () => {
  const [storedPassword, setStoredPassword] = useState(localStorage.getItem('asset_terminal_pass') || '');
  const [isLocked, setIsLocked] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(!localStorage.getItem('asset_terminal_pass'));
  const [authInput, setAuthInput] = useState('');
  const [showValues, setShowValues] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('--:--:--');
  const [syncStep, setSyncStep] = useState(-1);
  const [editingId, setEditingId] = useState(null);

  const [data, setData] = useState({
    cash: [{ id: 'c1', label: '主要活期儲蓄', amount: 1250000, currency: 'TWD' }],
    stocks: [{ id: 's1', symbol: '2330.TW', label: '台積電', shares: 1000, price: 1050, change: 15, dividend: 4.5, divMonth: '3,6,9,12' }],
    debts: [{ id: 'd1', label: '房屋貸款本金', amount: 8500000, monthlyPayment: 32000, deductionDay: 5, lastPaidMonth: 0 }],
    monthlyExpenses: [{ id: 'e1', label: '房貸繳納', amount: 32000, day: 5, tag: '貸款', cycle: 'monthly' }]
  });

  const [exchangeRate, setExchangeRate] = useState(32.50); 
  const [entryForm, setEntryForm] = useState({ type: 'cash', label: '', amount: '', currency: 'TWD', symbol: '', shares: '', price: 0, change: 0, dividend: '', divMonth: '', month: '1', day: '1', tag: '民生繳費', cycle: 'monthly', monthlyPayment: '', deductionDay: '1' });
  const [passForm, setPassForm] = useState({ old: '', new: '', confirm: '' });

  // --- iOS PWA 滿版 Web App 支援 ---
  useEffect(() => {
    const metas = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: 'Money God' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }
    ];

    metas.forEach(m => {
      let meta = document.querySelector(`meta[name="${m.name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = m.name;
        document.head.appendChild(meta);
      }
      meta.content = m.content;
    });
  }, []);

  useEffect(() => {
    let interval;
    if (isSyncing) {
      setSyncStep(0);
      interval = setInterval(() => { setSyncStep(prev => (prev + 1) % 3); }, 400);
    } else { setSyncStep(-1); }
    return () => clearInterval(interval);
  }, [isSyncing]);

  const fetchWithProxy = async (url) => {
    const proxies = [(u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}&_=${Date.now()}`, (u) => `https://corsproxy.io/?${encodeURIComponent(u)}` ];
    for (const getProxyUrl of proxies) {
      try {
        const res = await fetch(getProxyUrl(url));
        if (!res.ok) continue;
        const result = await res.json();
        const finalData = typeof result.contents === 'string' ? JSON.parse(result.contents) : (result.contents || result);
        if (finalData) return finalData;
      } catch (e) { continue; }
    }
    return null;
  };

  const fetchStockData = async (symbol) => {
    try {
      let sym = symbol.toUpperCase().trim();
      if (!sym) return null;
      if (/^\d{4,6}$/.test(sym)) { sym += '.TW'; }
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1mo&range=1y&events=div`;
      const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${sym}&lang=zh-Hant-TW&region=TW`;
      const priceData = await fetchWithProxy(yahooUrl);
      const searchData = await fetchWithProxy(searchUrl);
      const result = priceData?.chart?.result?.[0];
      if (!result?.meta) return null;
      const dividends = result?.events?.dividends;
      let lastDiv = 0, divMonths = "";
      if (dividends) {
        const divArray = Object.values(dividends).sort((a, b) => b.date - a.date);
        lastDiv = divArray[0]?.amount || 0;
        divMonths = [...new Set(divArray.map(d => new Date(d.date * 1000).getMonth() + 1))].sort((a, b) => a - b).join(',');
      }
      let cnName = sym;
      if (searchData?.quotes && searchData.quotes.length > 0) {
        const match = searchData.quotes.find(q => q.symbol === sym) || searchData.quotes[0];
        cnName = match.shortname || match.longname || sym;
      }
      return { price: result.meta.regularMarketPrice, change: result.meta.regularMarketPrice - result.meta.chartPreviousClose, name: cnName, dividend: lastDiv, divMonth: divMonths, finalSymbol: sym };
    } catch (e) { return null; }
  };

  const syncFinanceData = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
      const rateD = await rateRes.json();
      if (rateD?.rates?.TWD) setExchangeRate(rateD.rates.TWD);
      const updatedStocks = await Promise.all(data.stocks.map(async (stock) => {
        const fetched = await fetchStockData(stock.symbol);
        if (fetched) return { ...stock, price: fetched.price, change: fetched.change, label: fetched.name, dividend: fetched.dividend || stock.dividend, divMonth: fetched.divMonth || stock.divMonth, amount: stock.shares * fetched.price };
        return stock;
      }));
      setData(prev => ({ ...prev, stocks: updatedStocks }));
      setLastUpdated(new Date().toLocaleTimeString([], { hour12: false }));
    } catch (err) { console.error("Sync failed:", err); } finally { setIsSyncing(false); }
  };

  useEffect(() => {
    const savedData = localStorage.getItem('money_god_v55');
    if (savedData) { try { setData(JSON.parse(savedData)); } catch (e) {} }
  }, []);
  useEffect(() => { if (!isLocked) syncFinanceData(); }, [isLocked]);
  useEffect(() => { localStorage.setItem('money_god_v55', JSON.stringify(data)); }, [data]);

  const totals = useMemo(() => {
    const cashTwd = data.cash.reduce((acc, curr) => acc + (curr.currency === 'USD' ? curr.amount * exchangeRate : curr.amount), 0);
    const stockTwd = data.stocks.reduce((acc, curr) => {
      const isTw = curr.symbol?.includes('.TW') || /^\d+$/.test(curr.symbol);
      return acc + (curr.shares * curr.price * (isTw ? 1 : exchangeRate));
    }, 0);
    const debtTotal = data.debts.reduce((acc, curr) => acc + curr.amount, 0);
    const totalAssets = cashTwd + stockTwd;
    const tagStats = { '民生繳費': 0, '保險': 0, '貸款': 0, '訂閱': 0 };
    const expenseTotal = data.monthlyExpenses.reduce((acc, curr) => {
      const monthlyAmount = curr.cycle === 'yearly' ? (curr.amount / 12) : curr.amount;
      if (tagStats[curr.tag] !== undefined) tagStats[curr.tag] += monthlyAmount;
      return acc + monthlyAmount;
    }, 0);
    const tagRatios = Object.keys(tagStats).map(key => ({
      name: key,
      amount: tagStats[key],
      ratio: expenseTotal > 0 ? (tagStats[key] / expenseTotal) * 100 : 0
    }));
    return { assets: totalAssets, debts: debtTotal, netWorth: totalAssets - debtTotal, cashTwd, stockTwd, monthlyExpenses: expenseTotal, assetRatio: (totalAssets + debtTotal) > 0 ? (totalAssets / (totalAssets + debtTotal)) * 100 : 0, debtRatio: (totalAssets + debtTotal) > 0 ? (debtTotal / (totalAssets + debtTotal)) * 100 : 0, tagRatios };
  }, [data, exchangeRate]);

  const handleUnlock = () => {
    if (authInput === storedPassword) { setIsLocked(false); setAuthInput(''); setAuthError(false); }
    else { setAuthError(true); setAuthInput(''); }
  };
  const handleSetInitialPassword = () => {
    if (authInput.length < 4) return;
    localStorage.setItem('asset_terminal_pass', authInput);
    setStoredPassword(authInput); setIsFirstTime(false); setAuthInput('');
  };
  const handleOpenModal = (cat = 'cash', item = null) => {
    if (item) {
      setEditingId(item.id);
      setEntryForm({ ...entryForm, type: cat === 'monthlyExpenses' || cat === 'overview' || cat === 'expenses' ? 'expenses' : cat, label: item.label, amount: item.amount || '', currency: item.currency || 'TWD', symbol: item.symbol || '', shares: item.shares || '', price: item.price || 0, change: item.change || 0, dividend: item.dividend || '', divMonth: item.divMonth || '', month: item.month || '1', day: item.day || '1', tag: item.tag || '民生繳費', cycle: item.cycle || 'monthly', monthlyPayment: item.monthlyPayment || '', deductionDay: item.deductionDay || '1' });
    } else {
      setEditingId(null);
      setEntryForm({ type: cat === 'overview' ? 'cash' : (cat === 'expenses' ? 'expenses' : cat), label: '', amount: '', symbol: '', shares: '', price: 0, change: 0, dividend: '', divMonth: '', currency: 'TWD', month: '1', day: '1', tag: '民生繳費', cycle: 'monthly', monthlyPayment: '', deductionDay: '1' });
    }
    setIsModalOpen(true);
  };

  const handleSaveEntry = async () => {
    const type = entryForm.type;
    if (type !== 'stocks' && !entryForm.label) return;
    let finalData = { ...entryForm };
    let currentPrice = parseFloat(entryForm.price) || 0;
    if (type === 'stocks') {
       setIsSyncing(true);
       const fetched = await fetchStockData(entryForm.symbol);
       if (fetched) { 
         finalData.price = fetched.price; finalData.change = fetched.change; 
         finalData.label = entryForm.label || fetched.name; 
         finalData.dividend = fetched.dividend; finalData.divMonth = fetched.divMonth; 
         currentPrice = fetched.price;
       }
       setIsSyncing(false);
    }
    const sharesCount = parseFloat(finalData.shares) || 0;
    const calculatedAmount = type === 'stocks' ? (sharesCount * currentPrice) : (parseFloat(finalData.amount) || 0);
    const itemData = { id: editingId || Math.random().toString(36).substr(2, 9), label: finalData.label, amount: calculatedAmount, currency: finalData.currency, symbol: finalData.symbol?.toUpperCase() || '', shares: sharesCount, price: finalData.price || 0, change: finalData.change || 0, dividend: parseFloat(finalData.dividend) || 0, divMonth: finalData.divMonth, month: finalData.month, day: parseInt(finalData.day) || 1, tag: finalData.tag, cycle: finalData.cycle, monthlyPayment: parseFloat(finalData.monthlyPayment) || 0, deductionDay: parseInt(finalData.deductionDay) || 1, lastPaidMonth: editingId ? (data.debts.find(d => d.id === editingId)?.lastPaidMonth || 0) : 0 };
    const key = type === 'expenses' ? 'monthlyExpenses' : type;
    setData(prev => ({ ...prev, [key]: editingId ? prev[key].map(i => i.id === editingId ? itemData : i) : [...prev[key], itemData] }));
    setIsModalOpen(false);
  };

  const handleQuickPay = (id) => {
    const today = new Date();
    const curMonth = today.getMonth() + 1;
    setData(prev => ({ ...prev, debts: prev.debts.map(debt => debt.id === id ? { ...debt, amount: Math.max(0, debt.amount - (debt.monthlyPayment || 0)), lastPaidMonth: curMonth } : debt) }));
  };

  const deleteItem = (cat, id) => {
    const key = cat === 'expenses' ? 'monthlyExpenses' : cat;
    setData(prev => ({ ...prev, [key]: prev[key].filter(i => i.id !== id) }));
  };

  const handleChangePassword = () => {
    if (passForm.old === storedPassword && passForm.new === passForm.confirm && passForm.new.length >= 4) {
      localStorage.setItem('asset_terminal_pass', passForm.new);
      setStoredPassword(passForm.new); setPassForm({ old: '', new: '', confirm: '' }); setIsSettingsOpen(false);
    }
  };

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
      
      {isLocked && (
        <div className="fixed inset-0 z-[100] bg-[#050505] flex flex-col items-center justify-center px-6">
          <div className="mb-6 relative flex items-center justify-center animate-float">
             <div className="absolute w-32 h-32 bg-[#506384]/15 blur-3xl rounded-full"></div>
             <PixelCoin size={120} />
          </div>
          <div className="text-center mb-12">
            <h1 className="font-pixel text-4xl tracking-tighter mb-3 text-white uppercase font-bold">Money God</h1>
            <p className="font-sans text-[#4b5563] text-[10px] tracking-[0.2em] uppercase font-black font-sans">SECURED TERMINAL</p>
          </div>
          <div className="w-full max-w-xs space-y-[10px]">
            {isFirstTime && <p className="font-sans text-[11px] text-[#ff5b41] text-center mb-2 font-bold uppercase tracking-wider animate-pulse italic">Please set a passcode (at least 4 digits) / 請設定 4 位數以上密碼</p>}
            <input type="password" placeholder={isFirstTime ? "SET PASSCODE" : "PASSCODE"} className={`font-pixel w-full bg-[#1f1f21] border ${authError ? 'border-[#ff5b41]' : 'border-white/5'} rounded-[6px] px-6 h-14 focus:outline-none text-center text-2xl tracking-[0.5em] placeholder:text-gray-800 font-pixel font-pixel`} value={authInput} onChange={(e) => { setAuthInput(e.target.value); setAuthError(false); }} onKeyDown={(e) => e.key === 'Enter' && (isFirstTime ? handleSetInitialPassword() : handleUnlock())} />
            {authError && !isFirstTime && <p className="font-sans text-[10px] text-[#ff5b41] text-center font-black uppercase tracking-[0.2em] animate-bounce">Incorrect Passcode</p>}
            <button onClick={isFirstTime ? handleSetInitialPassword : handleUnlock} className="font-sans w-full bg-[#506384] text-white h-14 rounded-[6px] font-black text-base active:opacity-80 transition-all uppercase shadow-lg shadow-[#506384]/20 tracking-widest font-sans font-black">{isFirstTime ? 'Confirm Security' : 'Start Session'}</button>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-40 px-5 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-6 flex justify-between items-center max-w-md mx-auto bg-[#050505]/95 backdrop-blur-md border-b border-white/[0.03]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center animate-float-nav">
            <PixelCoin size={32} />
          </div>
          <div><span className="font-pixel text-lg block leading-none text-white uppercase tracking-tighter">Money God</span><span className="font-sans text-[10px] text-[#4b5563] font-bold tracking-widest uppercase italic">Terminal Active</span></div>
        </div>
        <div className="flex gap-[10px]">
          <button onClick={() => setShowValues(!showValues)} className="w-11 h-11 flex items-center justify-center bg-[#1f1f21] rounded-[6px] text-[#4b5563] border border-white/5">{showValues ? <Eye size={18} /> : <EyeOff size={18} />}</button>
          <button onClick={() => setIsSettingsOpen(true)} className="w-11 h-11 flex items-center justify-center bg-[#1f1f21] rounded-[6px] text-[#4b5563] border border-white/5"><Settings size={18} /></button>
          <button onClick={() => setIsLocked(true)} className="w-11 h-11 flex items-center justify-center bg-[#1f1f21] rounded-[6px] text-[#506384] border border-white/5"><Lock size={18} /></button>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-5 pb-48">
        <div className="flex flex-col gap-[10px] mb-5 mt-4">
          <div className="bg-[#506384] rounded-[6px] p-8 border border-white/[0.03] shadow-inner relative overflow-hidden">
             <button onClick={syncFinanceData} className={`absolute top-4 right-4 text-white/50 hover:text-white transition-all ${isSyncing ? 'animate-spin' : ''}`}><RefreshCw size={16} /></button>
            <p className="font-sans text-[13px] font-black text-white/70 uppercase tracking-widest mb-4">Net Worth / 總資產淨值</p>
            <h2 className={`font-pixel text-3xl tracking-tighter text-white leading-none`}>{showValues ? formatTWD(totals.netWorth) : 'XXXXX'}</h2>
            <div className="flex justify-between items-center mt-6">
               <span className="font-sans text-[9px] font-bold text-white/50 uppercase tracking-widest">LAST SYNC: {lastUpdated}</span>
               <div className="flex gap-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${syncStep === i ? 'bg-white shadow-[0_0_5px_#fff]' : (isSyncing ? 'bg-white/20' : 'bg-[#d8ef9d]')}`}></div>
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
              <div><p className="text-[9px] text-[#4b5563] uppercase mb-1">Asset 占比</p><p className="font-pixel text-lg text-white leading-none">{Math.round(totals.assetRatio)}%</p></div>
              <div><p className="text-[9px] text-[#4b5563] uppercase mb-1">Debt 占比</p><p className="font-pixel text-lg text-white leading-none">{Math.round(totals.debtRatio)}%</p></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-[10px] mb-5 bg-[#1f1f21] p-1.5 rounded-[6px] border border-white/[0.03]">
          {[{ id: 'overview', icon: PieChart, label: '總覽' }, { id: 'cash', icon: Wallet, label: '現金' }, { id: 'stocks', icon: TrendingUp, label: '股票' }, { id: 'debts', icon: ArrowDownCircle, label: '負債' }, { id: 'expenses', icon: Calendar, label: '支出' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center py-4 rounded-[6px] transition-all gap-2 border ${activeTab === tab.id ? 'bg-[#506384] text-white border-[#506384] shadow-lg' : 'bg-transparent text-[#4b5563] border-transparent'}`}>
              <tab.icon size={18} /><span className="font-sans text-[15px] font-black tracking-tighter uppercase">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-[10px] animate-in fade-in duration-300">
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-[10px]">
              <div className="grid grid-cols-2 gap-[10px]">
                <div className="bg-[#506384] rounded-[6px] p-5 border border-white/[0.03] shadow-inner font-sans font-black">
                  <span className="text-[11px] text-white/70 block mb-2 uppercase tracking-widest">Assets / 總資產</span>
                  <span className={`font-pixel text-sm text-white`}>{showValues ? formatTWD(totals.assets) : 'XXXXX'}</span>
                </div>
                <div className="bg-[#1f1f21] rounded-[6px] p-5 border border-white/[0.03] font-sans font-black">
                  <span className="text-[11px] text-[#4b5563] block mb-2 uppercase tracking-widest">Debts / 總負債</span>
                  <span className={`font-pixel text-sm text-white`}>{showValues ? formatTWD(totals.debts) : 'XXXXX'}</span>
                </div>
                <div className="bg-[#506384] rounded-[6px] p-5 border border-white/[0.03] shadow-inner font-sans font-black">
                  <span className="text-[11px] text-white/70 block mb-2 uppercase tracking-widest">Cash / 現金總額</span>
                  <span className={`font-pixel text-sm text-white`}>{showValues ? formatTWD(totals.cashTwd) : 'XXXXX'}</span>
                </div>
                <div className="bg-[#1f1f21] rounded-[6px] p-5 border border-white/[0.03] font-sans font-black">
                  <span className="text-[11px] text-[#4b5563] block mb-2 uppercase tracking-widest">Stock / 股票總額</span>
                  <span className={`font-pixel text-sm text-white`}>{showValues ? formatTWD(totals.stockTwd) : 'XXXXX'}</span>
                </div>
              </div>
              <div className="bg-[#1f1f21] rounded-[6px] p-7 border border-white/[0.03]">
                <div className="flex justify-between items-center mb-6 font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black"><h3 className="text-[13px] text-[#506384] uppercase tracking-widest font-black font-sans font-black">Monthly Expense / 每月支出總額</h3></div>
                <div className="flex items-baseline gap-2 mb-8 font-black">
                  <span className={`font-pixel text-4xl tracking-tighter text-white`}>{showValues ? formatTWD(totals.monthlyExpenses) : 'XXXXX'}</span>
                  <span className="text-[10px] text-[#4b5563] uppercase tracking-widest font-black font-sans">/ MO</span>
                </div>
                <div className="space-y-4 pt-4 border-t border-white/[0.03] font-sans">
                  {totals.tagRatios.map(tag => (
                    <div key={tag.name} className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-white/60">{tag.name}</span><span className="text-white">{Math.round(tag.ratio)}%</span></div>
                      <div className="w-full h-1 bg-[#050505] rounded-full overflow-hidden"><div className="h-full bg-[#506384] transition-all duration-1000" style={{ width: `${tag.ratio}%` }}></div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(['cash', 'stocks', 'debts', 'expenses']).includes(activeTab) && (
            <div className="flex flex-col gap-[10px]">
              <div className={`p-6 rounded-[6px] border border-white/[0.03] shadow-inner mb-2 ${activeTab === 'cash' || activeTab === 'stocks' ? 'bg-[#506384]' : 'bg-[#1f1f21]'}`}>
                 <span className={`font-sans text-[11px] block mb-2 font-black uppercase tracking-widest ${activeTab === 'cash' || activeTab === 'stocks' ? 'text-white/70' : 'text-[#4b5563]'}`}>
                   {activeTab === 'cash' ? 'Cash Total / 現金總額' : activeTab === 'stocks' ? 'Stock Total / 股票總額' : activeTab === 'debts' ? 'Total Debts / 總負債' : 'Monthly Expense / 每月支出總額'}
                 </span>
                 <span className="font-pixel text-2xl text-white font-black">{showValues ? formatTWD(activeTab === 'cash' ? totals.cashTwd : activeTab === 'stocks' ? totals.stockTwd : activeTab === 'debts' ? totals.debts : totals.monthlyExpenses) : 'XXXXX'}</span>
              </div>

              {data[activeTab === 'expenses' ? 'monthlyExpenses' : activeTab].map(item => {
                const today = new Date();
                const curMonth = today.getMonth() + 1;
                const curDay = today.getDate();
                const isDebtEnabled = activeTab === 'debts' && item.monthlyPayment > 0 && curDay >= (item.deductionDay || 1) && item.lastPaidMonth !== curMonth;

                return (
                  <div key={item.id} className="bg-[#1f1f21] p-4 rounded-[6px] flex justify-between items-center border border-white/[0.03] transition-all min-h-[100px] gap-2 overflow-hidden">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-[6px] bg-[#050505] flex items-center justify-center text-[#506384] border border-white/5 shadow-inner font-pixel text-[13px] font-bold overflow-hidden shrink-0">
                         {activeTab === 'cash' ? ( <span>{item.currency === 'TWD' ? 'NT' : 'US'}</span> ) : 
                          activeTab === 'stocks' ? ( item.change >= 0 ? <TrendingUp size={22} className="text-up" /> : <TrendingDown size={22} className="text-down" /> ) : 
                          activeTab === 'debts' ? ( <button onClick={() => handleQuickPay(item.id)} disabled={!isDebtEnabled} className={`w-full h-full flex items-center justify-center transition-all ${isDebtEnabled ? 'bg-[#ff5b41]/10 text-[#ff5b41] active:bg-[#ff5b41] active:text-white' : 'text-[#333] cursor-not-allowed'}`}><Check size={20} strokeWidth={isDebtEnabled ? 4 : 2} /></button> ) : 
                          ( <div className="flex flex-col items-center justify-center leading-none">{item.cycle === 'yearly' ? ( <> <span className="text-[10px] opacity-60 mb-0.5 font-pixel">{String(item.month).padStart(2, '0')}</span> <span className="text-[13px] font-bold font-pixel">{String(item.day).padStart(2, '0')}</span> </> ) : ( <span className="text-[13px] font-bold font-pixel">{String(item.day).padStart(2, '0')}</span> )}</div> )}
                      </div>
                      
                      <div className="flex flex-col items-start text-left justify-center font-sans min-w-0">
                        <p className="text-xs font-bold text-white leading-tight font-sans uppercase tracking-tight mb-1 font-sans truncate w-full">{item.label}</p>
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          {activeTab !== 'debts' && ( <p className="font-sans text-[8px] font-black text-[#4b5563] uppercase tracking-widest font-sans truncate">{activeTab === 'stocks' ? `${item.symbol}` : activeTab === 'cash' ? `${item.currency} NODE` : (item.tag || '')}</p> )}
                          {activeTab === 'expenses' && ( <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-[2px] shrink-0 ${item.cycle === 'yearly' ? 'bg-[#ff5b41] text-white' : 'bg-[#506384] text-white font-black'}`}>{item.cycle === 'yearly' ? '年繳' : '月繳'}</span> )}
                          {activeTab === 'debts' && item.monthlyPayment > 0 && (
                            <div className="flex flex-col items-start gap-1 min-w-0">
                               <span className="text-[8px] font-black text-[#506384] uppercase bg-[#050505]/50 px-1.5 py-0.5 rounded-[2px] font-black truncate">Pay {formatTWD(item.monthlyPayment)}</span>
                               <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-[2px] shrink-0 ${item.lastPaidMonth === curMonth ? 'bg-[#d8ef9d] text-black font-black' : 'bg-[#1f1f21] text-[#4b5563] border border-white/5 font-black'}`}>{item.lastPaidMonth === curMonth ? 'PAID' : `Day ${item.deductionDay}`}</span>
                            </div>
                          )}
                        </div>
                        {activeTab === 'stocks' && showValues && (
                          <div className="flex flex-col gap-0.5 mt-2 p-1.5 bg-[#050505]/40 rounded-[4px] border border-white/[0.02] w-full min-w-0 font-black">
                             <div className="flex items-center gap-1.5 text-[#506384]"><DollarSign size={8} /><span className="text-[8px] font-sans font-black uppercase tracking-tight truncate">Div: {formatTWD(item.shares * item.dividend)}</span></div>
                             <div className="flex items-center gap-1.5 text-[#4b5563] font-sans font-black"><Calendar size={8} /><span className="text-[8px] font-sans font-black uppercase tracking-tight truncate">Mo: {item.divMonth || '---'}</span></div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 h-full font-sans font-bold ml-1">
                      <div className="flex flex-col text-right justify-center font-pixel min-w-[70px]">
                        <span className={`font-pixel text-sm text-white leading-none font-pixel`}>{showValues ? (item.currency === 'USD' ? `$ ${item.amount.toLocaleString()}` : formatTWD(activeTab === 'stocks' ? (item.shares * item.price * (item.symbol?.includes('.TW') || !isNaN(item.symbol) ? 1 : exchangeRate)) : item.amount)) : 'XXXXX'}</span>
                        {activeTab === 'stocks' && showValues && ( <div className="flex flex-col items-end gap-0.5 mt-1.5"> <div className="flex items-baseline gap-1"><span className={`text-[8px] font-sans font-black ${item.change >= 0 ? 'text-up' : 'text-down'}`}>{item.change >= 0 ? '+' : ''}{formatTWD(item.shares * item.change)}</span></div> <span className="text-[7px] font-sans text-gray-700 uppercase font-black">@ {item.price?.toFixed(1) || '---'}</span> </div> )}
                      </div>
                      <div className="flex flex-col gap-1.5 transition-all items-center justify-center bg-[#050505]/50 p-1.5 rounded-[4px] shrink-0 font-bold"><button onClick={() => handleOpenModal(activeTab, item)} className="text-[#444] hover:text-[#506384] transition-colors"><Edit2 size={13} /></button><div className="w-3 h-[1px] bg-white/[0.05]"></div><button onClick={() => deleteItem(activeTab, item.id)} className="text-[#444] hover:text-rose-600 transition-colors"><Trash2 size={13} /></button></div>
                    </div>
                  </div>
                );
              })}
            </div>
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

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#050505] rounded-t-[6px] p-5 border-t border-white/10 h-[60vh] flex flex-col shadow-2xl font-sans">
            <div className="flex justify-between items-center mb-8 shrink-0 px-2 font-pixel">
              <div className="font-pixel">
                <h2 className="text-2xl text-white uppercase tracking-tighter leading-none">Settings</h2>
                <p className="text-[10px] text-[#506384] font-bold tracking-[0.1em] mt-2 font-sans uppercase font-black font-sans">Configuration</p>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="w-12 h-12 bg-[#1f1f21] rounded-[6px] flex items-center justify-center text-[#4b5563] border border-white/5 shadow-inner"><X size={24}/></button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-[10px] font-sans">
              <div className="bg-[#1f1f21] p-6 rounded-[6px] space-y-4 border border-white/[0.03]">
                <label className="text-[14px] font-black text-[#506384] uppercase tracking-widest px-1 font-sans">Change Passcode / 更改密碼</label>
                <div className="space-y-2">
                  <input type="password" placeholder="Old Passcode" className="w-full bg-[#050505] border border-white/5 rounded-[6px] px-5 h-12 text-white text-sm shadow-inner font-bold" value={passForm.old} onChange={e => setPassForm({...passForm, old: e.target.value})} />
                  <input type="password" placeholder="New Passcode" className="w-full bg-[#050505] border border-white/5 rounded-[6px] px-5 h-12 text-white text-sm shadow-inner font-bold" value={passForm.new} onChange={e => setPassForm({...passForm, new: e.target.value})} />
                  <input type="password" placeholder="Confirm New" className="w-full bg-[#050505] border border-white/5 rounded-[6px] px-5 h-12 text-white text-sm shadow-inner font-bold" value={passForm.confirm} onChange={e => setPassForm({...passForm, confirm: e.target.value})} />
                </div>
                <button onClick={handleChangePassword} className="w-full h-12 bg-[#506384] text-white rounded-[6px] font-black text-xs uppercase tracking-widest mt-2 shadow-lg font-black font-sans font-black">Update Security</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200 font-sans">
           <div className="w-full max-w-md bg-[#050505] rounded-t-[6px] p-5 border-t border-white/10 h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans">
              <div className="flex justify-between items-center mb-8 shrink-0 px-2 font-pixel">
                <div><h2 className="text-2xl text-white uppercase tracking-tighter leading-none font-pixel">{editingId ? 'EDIT ENTRY' : 'NEW ENTRY'}</h2><p className="text-[10px] text-[#506384] font-bold mt-2 uppercase">Transaction Module Enabled</p></div>
                <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-[#1f1f21] rounded-[6px] flex items-center justify-center text-[#4b5563] border border-white/5 shadow-inner"><X size={24}/></button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar pb-10 space-y-[10px] px-1 font-sans">
                {!editingId && (
                  <div className="grid grid-cols-4 gap-[10px] bg-[#1f1f21] p-1.5 rounded-[6px] mb-4">
                    {[{ id: 'cash', icon: Wallet, label: '現金' }, { id: 'stocks', icon: TrendingUp, label: '股票' }, { id: 'debts', icon: ArrowDownCircle, label: '負債' }, { id: 'expenses', icon: Calendar, label: '支出' }].map(t => (
                      <button key={t.id} onClick={() => setEntryForm({...entryForm, type: t.id})} className={`py-5 rounded-[6px] flex flex-col items-center gap-2 border transition-all ${entryForm.type === t.id ? 'bg-[#506384] text-white border-transparent shadow-lg' : 'bg-transparent text-[#4b5563] border-transparent'}`}><t.icon size={18} /><span className="text-[10px] font-sans font-black uppercase font-black font-sans font-black">{t.label}</span></button>
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
                     <div className="bg-[#1f1f21] p-6 rounded-[6px] space-y-3 border border-white/[0.03] font-sans">
                       <label className="text-[14px] font-black text-[#506384] uppercase leading-none font-black">Shares / 持有股數</label>
                       <input type="number" placeholder="0.00" className="font-pixel w-full bg-[#050505] border border-white/5 rounded-[6px] px-6 h-14 text-white text-lg shadow-inner font-pixel" value={entryForm.shares} onChange={e => setEntryForm({...entryForm, shares: e.target.value})} />
                     </div>
                  ) : (
                     <div className="bg-[#1f1f21] p-6 rounded-[6px] space-y-3 border border-white/[0.03] font-sans">
                       <label className="text-[14px] font-black text-[#506384] uppercase leading-none font-black">Amount / 主要金額</label>
                       <input type="number" placeholder="0.00" className="font-pixel w-full bg-[#050505] border border-white/5 rounded-[6px] px-6 h-14 text-white text-lg shadow-inner font-pixel" value={entryForm.amount} onChange={e => setEntryForm({...entryForm, amount: e.target.value})} />
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
                    <div className="space-y-[10px] animate-in slide-in-from-right-2 font-sans font-black">
                      <div className="bg-[#1f1f21] p-6 rounded-[6px] space-y-3 border border-white/[0.03]">
                        <label className="text-[14px] font-black text-[#506384] uppercase font-black">Tag / 支出類別</label>
                        <div className="grid grid-cols-2 gap-2 font-sans font-black">
                          {['民生繳費', '保險', '貸款', '訂閱'].map(tag => (
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
                        {entryForm.cycle === 'yearly' && (<div><label className="text-[14px] font-black text-[#506384] uppercase font-black">Month / 月</label><input type="number" min="1" max="12" className="font-pixel w-full bg-[#050505] border border-white/5 rounded-[6px] px-4 h-14 text-white text-lg shadow-inner font-pixel" value={entryForm.month} onChange={e => setEntryForm({...entryForm, month: e.target.value})} /></div>)}
                        <div className={entryForm.cycle === 'monthly' ? 'col-span-2' : ''}><label className="text-[14px] font-black text-[#506384] uppercase font-black">Day / 日</label><input type="number" min="1" max="31" className="font-pixel w-full bg-[#050505] border border-white/5 rounded-[6px] px-4 h-14 text-white text-lg shadow-inner font-pixel" value={entryForm.day} onChange={e => setEntryForm({...entryForm, day: e.target.value})} /></div>
                      </div>
                    </div>
                  )}

                  {entryForm.type === 'debts' && (
                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-right-2 font-sans font-black">
                       <div className="bg-[#1f1f21] p-6 rounded-[6px] space-y-3 border border-white/[0.03]">
                          <label className="text-[12px] font-black text-[#506384] uppercase">Installment / 月付</label>
                          <input type="number" placeholder="0" className="font-pixel w-full bg-[#050505] border border-white/5 rounded-[6px] px-4 h-12 text-white text-sm font-pixel" value={entryForm.monthlyPayment} onChange={e => setEntryForm({...entryForm, monthlyPayment: e.target.value})} />
                       </div>
                       <div className="bg-[#1f1f21] p-6 rounded-[6px] space-y-3 border border-white/[0.03]">
                          <label className="text-[12px] font-black text-[#506384] uppercase">Pay Day / 扣款日</label>
                          <input type="number" min="1" max="31" className="font-pixel w-full bg-[#050505] border border-white/5 rounded-[6px] px-4 h-12 text-white text-sm font-pixel" value={entryForm.deductionDay} onChange={e => setEntryForm({...entryForm, deductionDay: e.target.value})} />
                       </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="pt-6 pb-12 shrink-0 font-sans"><button onClick={handleSaveEntry} disabled={isSyncing} className="w-full h-16 rounded-[6px] bg-[#506384] text-white font-black text-lg transition-all shadow-xl flex items-center justify-center gap-3 font-black">COMMIT CHANGES</button></div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;