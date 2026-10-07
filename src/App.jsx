import { useState, useEffect, useMemo, useRef, useEffectEvent } from 'react';
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
  RefreshCw,
  X,
  PieChart,
  Check,
  Edit2,
  DollarSign,
  Settings,
  Download,
  Upload
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

const formatAmount = (val) => new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 }).format(Math.abs(val));
const isNegative = (val) => Math.round(val) < 0;

const formatTWD = (val) => `${isNegative(val) ? '-' : ''}NT$ ${formatAmount(val)}`;

// 大字金額：幣別用小字標示，避免撐寬版面；數字不換行
const Money = ({ value, currency = 'NT$' }) => (
  <span className="whitespace-nowrap"><span className="font-sans font-black text-[max(11px,0.55em)] opacity-70">{isNegative(value) ? '-' : ''}{currency} </span>{formatAmount(value)}</span>
);

const DATA_KEY = 'money_god_v55';
const DEFAULT_DATA = {
  cash: [{ id: 'c1', label: '主要活期儲蓄', amount: 1250000, currency: 'TWD' }],
  stocks: [{ id: 's1', symbol: '2330.TW', label: '台積電', shares: 1000, price: 1050, change: 15, dividend: 4.5, divMonth: '3,6,9,12' }],
  debts: [{ id: 'd1', label: '房屋貸款本金', amount: 8500000, monthlyPayment: 32000, deductionDay: 5, lastPaidMonth: 0 }],
  monthlyExpenses: [{ id: 'e1', label: '房貸繳納', amount: 32000, day: 5, tag: '貸款', cycle: 'monthly' }]
};

// 在第一次 render 前就讀取已儲存的資料，避免預設資料先寫回 localStorage 蓋掉使用者資料
const loadData = () => {
  try {
    const saved = localStorage.getItem(DATA_KEY);
    if (saved) return { cash: [], stocks: [], debts: [], monthlyExpenses: [], ...JSON.parse(saved) };
  } catch { /* 資料毀損時改用預設資料 */ }
  return DEFAULT_DATA;
};

const isTwStock = (symbol) => {
  const sym = String(symbol || '').trim().toUpperCase();
  return sym.includes('.TW') || /^\d+[A-Z]?$/.test(sym);
};

const FX_KEY = 'money_god_fx';
const DEFAULT_FX_RATES = { USD: 1, TWD: 32.5 };

// 匯率以美元為基準（例如 { USD: 1, TWD: 32.5, JPY: 150 }），保存上次抓到的值，離線或抓取失敗時沿用
const loadFxRates = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(FX_KEY));
    if (saved?.TWD) return saved;
  } catch { /* 沒有或毀損時用預設值 */ }
  return DEFAULT_FX_RATES;
};

// Yahoo 有些市場以輔幣報價，例如倫敦 GBp 是便士
const SUBUNIT_CURRENCIES = { GBp: ['GBP', 100], ZAc: ['ZAR', 100], ILA: ['ILS', 100] };

// 股票的報價幣別；舊資料還沒有幣別時，台股視為台幣、其他視為美元
const stockCurrency = (stock) => stock.quoteCurrency || (isTwStock(stock.quoteSymbol || stock.symbol) ? 'TWD' : 'USD');

// 股價換算成台幣的匯率
const stockFxRate = (stock, fxRates) => {
  const [base, divisor] = SUBUNIT_CURRENCIES[stockCurrency(stock)] || [stockCurrency(stock), 1];
  if (base === 'TWD') return 1 / divisor;
  return (fxRates[base] ? fxRates.TWD / fxRates[base] : fxRates.TWD) / divisor;
};

const isIntInRange = (value, min, max) => {
  const n = Number(value);
  return value !== '' && Number.isInteger(n) && n >= min && n <= max;
};

// 年月字串，例如 "2026-10"，用來判斷本月是否已繳款
const toYearMonth = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

// 分期貸款：當月利息 = 剩餘本金 × 年利率 ÷ 12，月付金扣掉利息才是真正還到的本金；沒填利率時整筆月付金都算本金
const principalPaid = (debt) => {
  const interest = debt.amount * (parseFloat(debt.annualRate) || 0) / 100 / 12;
  return Math.min(debt.amount, Math.max(0, Math.round((debt.monthlyPayment || 0) - interest)));
};

// 舊資料只有 lastPaidMonth（月份數字），沿用舊判斷直到下一次繳款寫入 lastPaidYM
const isPaidThisMonth = (debt, today) => debt.lastPaidYM ? debt.lastPaidYM === toYearMonth(today) : debt.lastPaidMonth === today.getMonth() + 1;

// 取「最新交易日之前」最後一根日 K 的收盤價。
// chartPreviousClose 是整段圖表起點前的收盤價（range=1y 時約為一年前），不能拿來算當日漲跌。
const getPreviousClose = (result) => {
  const { regularMarketTime, gmtoffset = 0 } = result.meta;
  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const toLocalDay = (t) => Math.floor((t + gmtoffset) / 86400);
  const marketDay = toLocalDay(regularMarketTime);
  for (let i = timestamps.length - 1; i >= 0; i--) {
    if (closes[i] != null && toLocalDay(timestamps[i]) < marketDay) return closes[i];
  }
  return null;
};

const FETCH_TIMEOUT_MS = 8000;
const STOCK_CONCURRENCY = 2;                     // 同時最多抓幾檔，避免一次發太多請求被擋
const AUTO_REFRESH_MS = 5 * 60 * 1000;           // App 開著時每 5 分鐘自動更新
const RESUME_REFRESH_MS = 60 * 1000;             // 從背景回到 App 時，距上次同步超過 1 分鐘就更新
const DIVIDEND_REFRESH_MS = 24 * 60 * 60 * 1000; // 股利資料一天最多更新一次

const fetchWithTimeout = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try { return await fetch(url, { signal: controller.signal }); }
  finally { clearTimeout(timer); }
};

// Yahoo 不允許瀏覽器直接跨網域呼叫，需經過 CORS 代理；依序嘗試不同代理與 Yahoo 主機
const YAHOO_ATTEMPTS = [
  { host: 'query1', proxy: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}&_=${Date.now()}` },
  { host: 'query2', proxy: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}` },
  { host: 'query2', proxy: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}&_=${Date.now()}` },
];

// 回傳 Yahoo 的 JSON（查無代號時也是 JSON）；所有代理都失敗、逾時或被限流時回傳 null
const fetchYahoo = async (path) => {
  for (const { host, proxy } of YAHOO_ATTEMPTS) {
    try {
      const res = await fetchWithTimeout(proxy(`https://${host}.finance.yahoo.com${path}`));
      const body = await res.json();
      const payload = typeof body?.contents === 'string' ? JSON.parse(body.contents) : body;
      if (payload?.chart || payload?.quotes) return payload;
    } catch { /* 換下一個代理 */ }
  }
  return null;
};

// 純數字代號（可帶一個字母，如 00679B）先試上市 .TW，找不到再試上櫃 .TWO
const toYahooCandidates = (symbol) => {
  const sym = String(symbol || '').trim().toUpperCase();
  if (!sym) return [];
  return /^\d{4,6}[A-Z]?$/.test(sym) ? [`${sym}.TW`, `${sym}.TWO`] : [sym];
};

const parseDividends = (result) => {
  const divArray = Object.values(result?.events?.dividends || {}).sort((a, b) => b.date - a.date);
  return {
    dividend: divArray[0]?.amount || 0,
    divMonth: [...new Set(divArray.map(d => new Date(d.date * 1000).getMonth() + 1))].sort((a, b) => a - b).join(','),
  };
};

const isDividendStale = (stock) => !stock.divUpdatedAt || Date.now() - stock.divUpdatedAt > DIVIDEND_REFRESH_MS;

// 回傳報價；網路失敗或查無此代號時回傳 null
const fetchStockQuote = async (stock, { withName, withDividend }) => {
  const candidates = [...new Set([stock.quoteSymbol, ...toYahooCandidates(stock.symbol)].filter(Boolean))];
  for (const sym of candidates) {
    const chart = await fetchYahoo(`/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`);
    if (!chart) return null; // 網路問題，不再嘗試其他後綴
    const result = chart.chart?.result?.[0];
    if (result?.meta?.regularMarketPrice == null) continue; // 查無此代號，試下一個
    const price = result.meta.regularMarketPrice;
    const prevClose = getPreviousClose(result);
    const quote = { quoteSymbol: sym, currency: result.meta.currency, price, change: prevClose != null ? price - prevClose : 0 };
    if (withDividend) {
      const divResult = (await fetchYahoo(`/v8/finance/chart/${encodeURIComponent(sym)}?interval=1mo&range=1y&events=div`))?.chart?.result?.[0];
      if (divResult) Object.assign(quote, parseDividends(divResult));
    }
    if (withName) {
      const search = await fetchYahoo(`/v1/finance/search?q=${encodeURIComponent(sym)}&lang=zh-Hant-TW&region=TW`);
      const match = search?.quotes?.find(q => q.symbol === sym) || search?.quotes?.[0];
      quote.name = match?.shortname || match?.longname || result.meta.shortName || result.meta.longName || sym;
    }
    return quote;
  }
  return null;
};

const applyQuote = (stock, quote) => ({
  ...stock,
  quoteSymbol: quote.quoteSymbol,
  ...(quote.currency ? { quoteCurrency: quote.currency } : {}),
  price: quote.price,
  change: quote.change,
  amount: stock.shares * quote.price,
  priceUpdatedAt: Date.now(),
  ...(!stock.label && quote.name ? { label: quote.name } : {}),
  ...(quote.dividend !== undefined ? { dividend: quote.dividend || stock.dividend, divMonth: quote.divMonth || stock.divMonth, divUpdatedAt: Date.now() } : {}),
});

const fetchFxRates = async () => {
  try {
    const res = await fetchWithTimeout('https://open.er-api.com/v6/latest/USD');
    const rates = (await res.json())?.rates;
    return rates?.TWD ? rates : null;
  } catch (err) {
    console.error("Exchange rate sync failed:", err);
    return null;
  }
};

const runWithLimit = async (items, limit, worker) => {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await worker(queue.shift());
  }));
};

const formatUpdatedAt = (ts) => {
  const d = new Date(ts);
  const time = d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
  return d.toDateString() === new Date().toDateString() ? time : `${d.getMonth() + 1}/${d.getDate()} ${time}`;
};

const UNDO_MS = 6000;
const AUTO_LOCK_KEY = 'money_god_auto_lock';
// 切到背景多久後自動上鎖（分鐘）；0 = 立即，-1 = 不自動上鎖
const AUTO_LOCK_OPTIONS = [{ value: 0, label: '立即' }, { value: 1, label: '1 分鐘' }, { value: 5, label: '5 分鐘' }, { value: -1, label: '不自動' }];

const BACKUP_APP = 'money-god';
const LAST_BACKUP_KEY = 'money_god_last_backup';
const PRE_IMPORT_KEY = 'money_god_v55_before_import';
const DATA_KEYS = ['cash', 'stocks', 'debts', 'monthlyExpenses'];

const readStorage = (key) => { try { return localStorage.getItem(key); } catch { return null; } };

const formatDateTime = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
};

// 讀取備份檔：接受本 App 匯出的格式，或直接是資料本身；格式不符時丟出錯誤
const parseBackup = (text) => {
  const parsed = JSON.parse(text);
  const source = parsed?.app === BACKUP_APP ? parsed.data : parsed;
  if (!source || typeof source !== 'object' || !DATA_KEYS.some(k => Array.isArray(source[k]))) throw new Error('invalid backup');
  const data = {};
  for (const k of DATA_KEYS) {
    const items = source[k] ?? [];
    if (!Array.isArray(items) || !items.every(i => i && typeof i === 'object')) throw new Error('invalid backup');
    data[k] = items.map(i => i.id ? i : { ...i, id: Math.random().toString(36).slice(2, 11) });
  }
  return { data, exportedAt: parsed?.exportedAt || null };
};

const countItems = (data) => `現金 ${data.cash.length} 筆・股票 ${data.stocks.length} 筆・負債 ${data.debts.length} 筆・支出 ${data.monthlyExpenses.length} 筆`;

// iPhone 用系統分享選單（可存到「檔案」或傳給自己）；不支援時改為直接下載
const saveBackupFile = async (json, baseName) => {
  const candidates = [new File([json], `${baseName}.json`, { type: 'application/json' }), new File([json], `${baseName}.txt`, { type: 'text/plain' })];
  const shareable = candidates.find(file => navigator.canShare?.({ files: [file] }));
  if (shareable) return navigator.share({ files: [shareable] });
  const url = URL.createObjectURL(candidates[0]);
  const a = document.createElement('a');
  a.href = url;
  a.download = candidates[0].name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const StockSyncBadge = ({ status, updatedAt }) => {
  if (status === 'loading') return <span className="flex items-center gap-1 text-[11px] font-black text-[#506384] shrink-0"><RefreshCw size={8} className="animate-spin" />更新中</span>;
  if (status === 'error') return <span className="text-[11px] font-black text-[#ff5b41] shrink-0">更新失敗{updatedAt ? ` · ${formatUpdatedAt(updatedAt)}` : ''}</span>;
  if (updatedAt) return <span className="text-[11px] font-black text-[#4b5563] shrink-0">{formatUpdatedAt(updatedAt)} 更新</span>;
  return null;
};

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
  const [stockStatus, setStockStatus] = useState({}); // 每檔股票的更新狀態：'loading' | 'ok' | 'error'
  const syncingRef = useRef(false);
  const lastSyncAtRef = useRef(0);
  const stockRequestRef = useRef({});
  const [lastUpdated, setLastUpdated] = useState('--:--:--');
  const [syncStep, setSyncStep] = useState(-1);
  const [editingId, setEditingId] = useState(null);

  const [data, setData] = useState(loadData);

  const [fxRates, setFxRates] = useState(loadFxRates);
  const usdTwd = fxRates.TWD;
  const [entryForm, setEntryForm] = useState({ type: 'cash', label: '', amount: '', currency: 'TWD', symbol: '', shares: '', price: 0, change: 0, dividend: '', divMonth: '', month: '1', day: '1', tag: '民生繳費', cycle: 'monthly', monthlyPayment: '', deductionDay: '1', annualRate: '' });
  const [passForm, setPassForm] = useState({ old: '', new: '', confirm: '' });
  const [lastBackupAt, setLastBackupAt] = useState(() => readStorage(LAST_BACKUP_KEY));
  const [hasPreImport, setHasPreImport] = useState(() => !!readStorage(PRE_IMPORT_KEY));
  const [pendingImport, setPendingImport] = useState(null); // 等待確認的匯入：{ data, exportedAt, title }
  const [backupMsg, setBackupMsg] = useState(null);
  const [passMsg, setPassMsg] = useState(null);
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

  const totals = useMemo(() => {
    const cashTwd = data.cash.reduce((acc, curr) => acc + (curr.currency === 'USD' ? curr.amount * usdTwd : curr.amount), 0);
    const stockTwd = data.stocks.reduce((acc, curr) => acc + (curr.shares * curr.price * stockFxRate(curr, fxRates)), 0);
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
  }, [data, fxRates, usdTwd]);

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
      setEntryForm({ ...entryForm, type: cat === 'monthlyExpenses' || cat === 'overview' || cat === 'expenses' ? 'expenses' : cat, label: item.label || '', amount: item.amount || '', currency: item.currency || 'TWD', symbol: item.symbol || '', shares: item.shares || '', price: item.price || 0, change: item.change || 0, dividend: item.dividend || '', divMonth: item.divMonth || '', month: item.month || '1', day: item.day || '1', tag: item.tag || '民生繳費', cycle: item.cycle || 'monthly', monthlyPayment: item.monthlyPayment || '', deductionDay: item.deductionDay || '1', annualRate: item.annualRate || '' });
    } else {
      setEditingId(null);
      setEntryForm({ type: cat === 'overview' ? 'cash' : (cat === 'expenses' ? 'expenses' : cat), label: '', amount: '', symbol: '', shares: '', price: 0, change: 0, dividend: '', divMonth: '', currency: 'TWD', month: '1', day: '1', tag: '民生繳費', cycle: 'monthly', monthlyPayment: '', deductionDay: '1', annualRate: '' });
    }
    setIsModalOpen(true);
  };

  // 月份、日期超出範圍時標紅並停用送出
  const invalidField = {
    month: entryForm.type === 'expenses' && entryForm.cycle === 'yearly' && !isIntInRange(entryForm.month, 1, 12),
    day: entryForm.type === 'expenses' && !isIntInRange(entryForm.day, 1, 31),
    deductionDay: entryForm.type === 'debts' && !isIntInRange(entryForm.deductionDay, 1, 31),
    annualRate: entryForm.type === 'debts' && entryForm.annualRate !== '' && !(Number(entryForm.annualRate) >= 0 && Number(entryForm.annualRate) <= 100),
  };
  const canSaveEntry = (entryForm.type === 'stocks' ? entryForm.symbol.trim() !== '' : entryForm.label.trim() !== '') && !Object.values(invalidField).some(Boolean);

  // 存檔一律立即完成；股票只有新增或改代號時才需要抓報價，且在背景進行
  const handleSaveEntry = () => {
    if (!canSaveEntry) return;
    const type = entryForm.type;
    const key = type === 'expenses' ? 'monthlyExpenses' : type;
    const prevItem = editingId ? data[key].find(i => i.id === editingId) : null;
    const symbol = entryForm.symbol.trim().toUpperCase();
    const needsQuote = type === 'stocks' && (!prevItem || prevItem.symbol !== symbol);
    const price = needsQuote ? 0 : (parseFloat(entryForm.price) || 0);
    const sharesCount = parseFloat(entryForm.shares) || 0;
    const calculatedAmount = type === 'stocks' ? (sharesCount * price) : (parseFloat(entryForm.amount) || 0);
    const itemData = { ...prevItem, id: editingId || Math.random().toString(36).substr(2, 9), label: entryForm.label, amount: calculatedAmount, currency: type === 'cash' ? entryForm.currency : 'TWD', symbol, shares: sharesCount, price, change: needsQuote ? 0 : (entryForm.change || 0), dividend: needsQuote ? 0 : (parseFloat(entryForm.dividend) || 0), divMonth: needsQuote ? '' : entryForm.divMonth, month: entryForm.month, day: parseInt(entryForm.day) || 1, tag: entryForm.tag, cycle: entryForm.cycle, monthlyPayment: parseFloat(entryForm.monthlyPayment) || 0, deductionDay: parseInt(entryForm.deductionDay) || 1, annualRate: parseFloat(entryForm.annualRate) || 0 };
    // 換了代號就清掉舊代號的報價紀錄
    if (needsQuote) { delete itemData.quoteSymbol; delete itemData.priceUpdatedAt; delete itemData.divUpdatedAt; }
    setData(prev => ({ ...prev, [key]: editingId ? prev[key].map(i => i.id === editingId ? itemData : i) : [...prev[key], itemData] }));
    setIsModalOpen(false);
    if (!editingId) setActiveTab(type);
    if (needsQuote) refreshStocks([itemData]);
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
    const key = cat === 'expenses' ? 'monthlyExpenses' : cat;
    const index = data[key].findIndex(i => i.id === id);
    if (index < 0) return;
    const item = data[key][index];
    setData(prev => ({ ...prev, [key]: prev[key].filter(i => i.id !== id) }));
    // 復原時放回原本的位置
    showUndo(`已刪除「${item.label || item.symbol}」`, () => {
      setData(prev => prev[key].some(i => i.id === id) ? prev : { ...prev, [key]: [...prev[key].slice(0, index), item, ...prev[key].slice(index)] });
    });
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
    setPendingImport(null);
    setBackupMsg(null);
    setPassMsg(null);
  };

  // 上鎖時一併隱藏金額、關閉所有視窗
  const lockApp = () => {
    setIsLocked(true);
    setShowValues(false);
    setIsModalOpen(false);
    closeSettings();
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
    setData(pendingImport.data);
    setStockStatus({});
    refreshStocks(pendingImport.data.stocks);
    setPendingImport(null);
    setBackupMsg({ type: 'ok', text: '資料已取代' });
  };

  const handleChangePassword = () => {
    if (passForm.old !== storedPassword) return setPassMsg({ type: 'error', text: '舊密碼不正確' });
    if (passForm.new.length < 4) return setPassMsg({ type: 'error', text: '新密碼至少需要 4 碼' });
    if (passForm.new !== passForm.confirm) return setPassMsg({ type: 'error', text: '兩次輸入的新密碼不一致' });
    localStorage.setItem('asset_terminal_pass', passForm.new);
    setStoredPassword(passForm.new); setPassForm({ old: '', new: '', confirm: '' });
    setPassMsg({ type: 'ok', text: '密碼已更新' });
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
            <p className="font-sans text-[#4b5563] text-[11px] tracking-[0.2em] uppercase font-black font-sans">SECURED TERMINAL</p>
          </div>
          <div className="w-full max-w-xs space-y-[10px]">
            {isFirstTime && <p className="font-sans text-[11px] text-[#ff5b41] text-center mb-2 font-bold uppercase tracking-wider animate-pulse italic">Please set a passcode (at least 4 digits) / 請設定 4 位數以上密碼</p>}
            <input type="password" inputMode={passcodeInputMode} placeholder={isFirstTime ? "SET PASSCODE" : "PASSCODE"} className={`font-pixel w-full bg-[#1f1f21] border ${authError ? 'border-[#ff5b41]' : 'border-white/5'} rounded-[6px] px-6 h-14 focus:outline-none text-center text-2xl tracking-[0.5em] placeholder:text-gray-800 font-pixel font-pixel`} value={authInput} onChange={(e) => { setAuthInput(e.target.value); setAuthError(false); }} onKeyDown={(e) => e.key === 'Enter' && (isFirstTime ? handleSetInitialPassword() : handleUnlock())} />
            {authError && !isFirstTime && <p className="font-sans text-[11px] text-[#ff5b41] text-center font-black uppercase tracking-[0.2em] animate-bounce">Incorrect Passcode</p>}
            <button onClick={isFirstTime ? handleSetInitialPassword : handleUnlock} className="font-sans w-full bg-[#506384] text-white h-14 rounded-[6px] font-black text-base active:opacity-80 transition-all uppercase shadow-lg shadow-[#506384]/20 tracking-widest font-sans font-black">{isFirstTime ? 'Confirm Security' : 'Start Session'}</button>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-40 px-5 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-6 flex justify-between items-center max-w-md mx-auto bg-[#050505]/95 backdrop-blur-md border-b border-white/[0.03]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center animate-float-nav">
            <PixelCoin size={32} />
          </div>
          <div><span className="font-pixel text-lg block leading-none text-white uppercase tracking-tighter">Money God</span><span className="font-sans text-[11px] text-[#4b5563] font-bold tracking-widest uppercase italic">Terminal Active</span></div>
        </div>
        <div className="flex gap-[10px]">
          <button onClick={() => setShowValues(!showValues)} className="w-11 h-11 flex items-center justify-center bg-[#1f1f21] rounded-[6px] text-[#4b5563] border border-white/5">{showValues ? <Eye size={18} /> : <EyeOff size={18} />}</button>
          <button onClick={() => setIsSettingsOpen(true)} className="w-11 h-11 flex items-center justify-center bg-[#1f1f21] rounded-[6px] text-[#4b5563] border border-white/5"><Settings size={18} /></button>
          <button aria-label="上鎖" onClick={lockApp} className="w-11 h-11 flex items-center justify-center bg-[#1f1f21] rounded-[6px] text-[#506384] border border-white/5"><Lock size={18} /></button>
        </div>
      </nav>

      <main className="max-w-md mx-auto px-5 pb-48">
        <div className="flex flex-col gap-[10px] mb-5 mt-4">
          <div className="bg-[#506384] rounded-[6px] p-8 border border-white/[0.03] shadow-inner relative overflow-hidden">
             <button onClick={syncFinanceData} className={`absolute top-4 right-4 text-white/50 hover:text-white transition-all ${isBusy ? 'animate-spin' : ''}`}><RefreshCw size={16} /></button>
            <p className="font-sans text-[13px] font-black text-white/70 uppercase tracking-widest mb-4">Net Worth / 總資產淨值</p>
            <h2 className={`font-pixel text-3xl tracking-tighter text-white leading-none`}>{showValues ? <Money value={totals.netWorth} /> : 'XXXXX'}</h2>
            <div className="flex justify-between items-center mt-6">
               <span className="font-sans text-[11px] font-bold text-white/50 uppercase tracking-widest">LAST SYNC: {lastUpdated}</span>
               <div className="flex gap-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${syncStep === i ? 'bg-white shadow-[0_0_5px_#fff]' : (isBusy ? 'bg-white/20' : 'bg-[#d8ef9d]')}`}></div>
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
              <div><p className="text-[11px] text-[#4b5563] uppercase mb-1">Asset 占比</p><p className="font-pixel text-lg text-white leading-none">{Math.round(totals.assetRatio)}%</p></div>
              <div><p className="text-[11px] text-[#4b5563] uppercase mb-1">Debt 占比</p><p className="font-pixel text-lg text-white leading-none">{Math.round(totals.debtRatio)}%</p></div>
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

        <div className="space-y-[10px]">
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-[10px]">
              <div className="grid grid-cols-2 gap-[10px]">
                <div className="bg-[#506384] rounded-[6px] p-5 border border-white/[0.03] shadow-inner font-sans font-black">
                  <span className="text-[11px] text-white/70 block mb-2 uppercase tracking-widest">Assets / 總資產</span>
                  <span className={`font-pixel text-[13px] tracking-tighter text-white`}>{showValues ? <Money value={totals.assets} /> : 'XXXXX'}</span>
                </div>
                <div className="bg-[#1f1f21] rounded-[6px] p-5 border border-white/[0.03] font-sans font-black">
                  <span className="text-[11px] text-[#4b5563] block mb-2 uppercase tracking-widest">Debts / 總負債</span>
                  <span className={`font-pixel text-[13px] tracking-tighter text-white`}>{showValues ? <Money value={totals.debts} /> : 'XXXXX'}</span>
                </div>
                <div className="bg-[#506384] rounded-[6px] p-5 border border-white/[0.03] shadow-inner font-sans font-black">
                  <span className="text-[11px] text-white/70 block mb-2 uppercase tracking-widest">Cash / 現金總額</span>
                  <span className={`font-pixel text-[13px] tracking-tighter text-white`}>{showValues ? <Money value={totals.cashTwd} /> : 'XXXXX'}</span>
                </div>
                <div className="bg-[#1f1f21] rounded-[6px] p-5 border border-white/[0.03] font-sans font-black">
                  <span className="text-[11px] text-[#4b5563] block mb-2 uppercase tracking-widest">Stock / 股票總額</span>
                  <span className={`font-pixel text-[13px] tracking-tighter text-white`}>{showValues ? <Money value={totals.stockTwd} /> : 'XXXXX'}</span>
                </div>
              </div>
              <div className="bg-[#1f1f21] rounded-[6px] p-7 border border-white/[0.03]">
                <div className="flex justify-between items-center mb-6 font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black font-sans font-black"><h3 className="text-[13px] text-[#506384] uppercase tracking-widest font-black font-sans font-black">Monthly Expense / 每月支出總額</h3></div>
                <div className="flex items-baseline gap-2 mb-8 font-black">
                  <span className={`font-pixel text-4xl tracking-tighter text-white`}>{showValues ? <Money value={totals.monthlyExpenses} /> : 'XXXXX'}</span>
                  <span className="text-[11px] text-[#4b5563] uppercase tracking-widest font-black font-sans">/ MO</span>
                </div>
                <div className="space-y-4 pt-4 border-t border-white/[0.03] font-sans">
                  {totals.tagRatios.map(tag => (
                    <div key={tag.name} className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-black uppercase"><span className="text-white/60">{tag.name}</span><span className="text-white">{Math.round(tag.ratio)}%</span></div>
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
                 <span className="font-pixel text-2xl text-white font-black">{showValues ? <Money value={activeTab === 'cash' ? totals.cashTwd : activeTab === 'stocks' ? totals.stockTwd : activeTab === 'debts' ? totals.debts : totals.monthlyExpenses} /> : 'XXXXX'}</span>
              </div>

              {data[activeTab === 'expenses' ? 'monthlyExpenses' : activeTab].map(item => {
                const today = new Date();
                const curDay = today.getDate();
                const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                const isPaid = activeTab === 'debts' && isPaidThisMonth(item, today);
                // 扣款日 29～31 號在小月份改以月底當天計算
                const isDebtEnabled = activeTab === 'debts' && item.monthlyPayment > 0 && curDay >= Math.min(item.deductionDay || 1, daysInMonth) && !isPaid;
                const stockRate = activeTab === 'stocks' ? stockFxRate(item, fxRates) : 1;

                return (
                  <div key={item.id} className="bg-[#1f1f21] p-4 rounded-[6px] flex flex-col gap-3 border border-white/[0.03] transition-all overflow-hidden">
                   <div className="flex justify-between items-center gap-2 min-h-[68px]">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-[6px] bg-[#050505] flex items-center justify-center text-[#506384] border border-white/5 shadow-inner font-pixel text-[13px] font-bold overflow-hidden shrink-0">
                         {activeTab === 'cash' ? ( <span>{item.currency === 'TWD' ? 'NT' : 'US'}</span> ) : 
                          activeTab === 'stocks' ? ( item.change >= 0 ? <TrendingUp size={22} className="text-up" /> : <TrendingDown size={22} className="text-down" /> ) : 
                          activeTab === 'debts' ? ( <button aria-label="記錄本月已繳" onClick={() => handleQuickPay(item.id)} disabled={!isDebtEnabled} className={`w-full h-full flex items-center justify-center transition-all ${isDebtEnabled ? 'bg-[#ff5b41]/10 text-[#ff5b41] active:bg-[#ff5b41] active:text-white' : 'text-[#333] cursor-not-allowed'}`}><Check size={20} strokeWidth={isDebtEnabled ? 4 : 2} /></button> ) : 
                          ( <div className="flex flex-col items-center justify-center leading-none">{item.cycle === 'yearly' ? ( <> <span className="text-[11px] opacity-60 mb-0.5 font-pixel">{String(item.month).padStart(2, '0')}</span> <span className="text-[13px] font-bold font-pixel">{String(item.day).padStart(2, '0')}</span> </> ) : ( <span className="text-[13px] font-bold font-pixel">{String(item.day).padStart(2, '0')}</span> )}</div> )}
                      </div>
                      
                      <div className="flex flex-col items-start text-left justify-center font-sans min-w-0 flex-1">
                        <p className="text-xs font-bold text-white leading-tight font-sans uppercase tracking-tight mb-1 font-sans truncate w-full">{item.label || item.symbol}</p>
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          {activeTab !== 'debts' && ( <p className="font-sans text-[11px] font-black text-[#4b5563] uppercase tracking-widest font-sans truncate">{activeTab === 'stocks' ? `${item.symbol}` : activeTab === 'cash' ? `${item.currency} NODE` : (item.tag || '')}</p> )}
                          {activeTab === 'stocks' && <StockSyncBadge status={stockStatus[item.id]} updatedAt={item.priceUpdatedAt} />}
                          {activeTab === 'expenses' && ( <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-[2px] shrink-0 ${item.cycle === 'yearly' ? 'bg-[#ff5b41] text-white' : 'bg-[#506384] text-white font-black'}`}>{item.cycle === 'yearly' ? '年繳' : '月繳'}</span> )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 h-full font-sans font-bold ml-1">
                      <div className="flex flex-col text-right justify-center font-pixel min-w-[70px]">
                        <span className={`font-pixel text-sm text-white leading-none font-pixel`}>{showValues ? (activeTab === 'cash' && item.currency === 'USD' ? <Money value={item.amount} currency="US$" /> : <Money value={activeTab === 'stocks' ? (item.shares * item.price * stockRate) : item.amount} />) : 'XXXXX'}</span>
                        {activeTab === 'cash' && item.currency === 'USD' && showValues && <span className="text-[11px] font-sans font-black text-[#4b5563] mt-1.5 whitespace-nowrap">≈ {formatTWD(item.amount * usdTwd)}</span>}
                        {activeTab === 'stocks' && showValues && ( <div className="flex flex-col items-end gap-0.5 mt-1.5"> <div className="flex items-baseline gap-1"><span className={`text-[11px] font-sans font-black ${item.change >= 0 ? 'text-up' : 'text-down'}`}>{item.change >= 0 ? '+' : ''}{formatTWD(item.shares * item.change * stockRate)}</span></div> <span className="text-[11px] font-sans text-gray-500 uppercase font-black whitespace-nowrap">@ {item.price?.toFixed(stockCurrency(item) === 'TWD' ? 1 : 2) || '---'}{stockCurrency(item) !== 'TWD' ? ` ${stockCurrency(item)}` : ''}</span> </div> )}
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0"><button aria-label="編輯" onClick={() => handleOpenModal(activeTab, item)} className="w-10 h-10 flex items-center justify-center rounded-[4px] bg-[#050505]/50 text-[#666] active:text-[#506384] transition-colors"><Edit2 size={16} /></button><button aria-label="刪除" onClick={() => deleteItem(activeTab, item.id)} className="w-10 h-10 flex items-center justify-center rounded-[4px] bg-[#050505]/50 text-[#666] active:text-rose-600 transition-colors"><Trash2 size={16} /></button></div>
                    </div>
                   </div>
                    {activeTab === 'debts' && item.monthlyPayment > 0 && (
                      <div className="flex items-center justify-between gap-3 px-3 py-2 bg-[#050505]/40 rounded-[4px] text-[11px] font-sans font-black">
                        <span className="text-[#506384] min-w-0">月付 {formatTWD(item.monthlyPayment)}{item.annualRate > 0 ? ` · 年利率 ${item.annualRate}%` : ''}</span>
                        <span className={`uppercase px-1.5 py-0.5 rounded-[2px] shrink-0 ${isPaid ? 'bg-[#d8ef9d] text-black' : 'text-[#4b5563] border border-white/5'}`}>{isPaid ? 'PAID' : `Day ${item.deductionDay}`}</span>
                      </div>
                    )}
                    {/* 股利資訊放在獨立一行，避免擠在名稱欄位裡被截斷 */}
                    {activeTab === 'stocks' && showValues && (
                      <div className="flex items-center justify-between gap-3 px-3 py-2 bg-[#050505]/40 rounded-[4px] text-[11px] font-sans font-black uppercase tracking-tight">
                        <span className="flex items-center gap-1.5 text-[#506384] min-w-0 truncate"><DollarSign size={12} className="shrink-0" />Div: {formatTWD(item.shares * item.dividend * stockRate)}</span>
                        <span className="flex items-center gap-1.5 text-[#4b5563] shrink-0"><Calendar size={12} />Mo: {item.divMonth || '---'}</span>
                      </div>
                    )}
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

      {undo && !isLocked && (
        <div role="status" className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-40px)] max-w-sm bg-[#1f1f21] border border-white/10 rounded-[6px] shadow-2xl flex items-center justify-between gap-3 pl-4 pr-1 py-1 font-sans">
          <span className="text-xs font-bold text-white leading-snug py-2">{undo.message}</span>
          <button onClick={handleUndo} className="h-10 px-4 text-[13px] font-black text-[#d8ef9d] shrink-0">復原</button>
        </div>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/95 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#050505] rounded-t-[6px] p-5 border-t border-white/10 h-[75vh] flex flex-col shadow-2xl font-sans">
            <div className="flex justify-between items-center mb-8 shrink-0 px-2 font-pixel">
              <div className="font-pixel">
                <h2 className="text-2xl text-white uppercase tracking-tighter leading-none">Settings</h2>
                <p className="text-[11px] text-[#506384] font-bold tracking-[0.1em] mt-2 font-sans uppercase font-black font-sans">Configuration</p>
              </div>
              <button onClick={closeSettings} className="w-12 h-12 bg-[#1f1f21] rounded-[6px] flex items-center justify-center text-[#4b5563] border border-white/5 shadow-inner"><X size={24}/></button>
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
                    <button key={o.value} onClick={() => handleAutoLockChange(o.value)} className={`h-11 rounded-[4px] font-black text-xs transition-all ${autoLockMin === o.value ? 'bg-[#506384] text-white' : 'bg-[#050505] text-[#4b5563]'}`}>{o.label}</button>
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
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/95 backdrop-blur-md font-sans">
           <div className="w-full max-w-md bg-[#050505] rounded-t-[6px] p-5 border-t border-white/10 h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans">
              <div className="flex justify-between items-center mb-8 shrink-0 px-2 font-pixel">
                <div><h2 className="text-2xl text-white uppercase tracking-tighter leading-none font-pixel">{editingId ? 'EDIT ENTRY' : 'NEW ENTRY'}</h2><p className="text-[11px] text-[#506384] font-bold mt-2 uppercase">Transaction Module Enabled</p></div>
                <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-[#1f1f21] rounded-[6px] flex items-center justify-center text-[#4b5563] border border-white/5 shadow-inner"><X size={24}/></button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar pb-10 space-y-[10px] px-1 font-sans">
                {!editingId && (
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
                     <div className="bg-[#1f1f21] p-6 rounded-[6px] space-y-3 border border-white/[0.03] font-sans">
                       <label className="text-[14px] font-black text-[#506384] uppercase leading-none font-black">Shares / 持有股數</label>
                       <input type="number" inputMode="decimal" placeholder="0.00" className="font-pixel w-full bg-[#050505] border border-white/5 rounded-[6px] px-6 h-14 text-white text-lg shadow-inner font-pixel" value={entryForm.shares} onChange={e => setEntryForm({...entryForm, shares: e.target.value})} />
                     </div>
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
              <div className="pt-6 pb-12 shrink-0 font-sans"><button onClick={handleSaveEntry} disabled={!canSaveEntry} className="w-full h-16 rounded-[6px] bg-[#506384] text-white font-black text-lg transition-all disabled:opacity-40 shadow-xl flex items-center justify-center gap-3 font-black">COMMIT CHANGES</button></div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;