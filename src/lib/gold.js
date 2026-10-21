// 期貨分頁的黃金：用國際金價（紐約黃金期貨 GC=F，美元／金衡盎司）換算成每公克、每錢的台幣
import { fetchYahoo, getPreviousClose } from './quotes.js';
import { twdPerUnit } from './currencies.js';
import { formatAmount } from './format.js';

export const GOLD_SYMBOL = 'GC=F';
export const GRAMS_PER_TROY_OUNCE = 31.1034768;

// 重量單位：公克、錢（台錢 = 3.75 公克）
export const GRAMS_PER_QIAN = 3.75;
export const WEIGHT_UNITS = [{ id: 'g', label: '公克', grams: 1 }, { id: 'qian', label: '錢', grams: GRAMS_PER_QIAN }];
const unitOf = (id) => WEIGHT_UNITS.find(u => u.id === id) || WEIGHT_UNITS[0];

export const toGrams = (value, unit) => value * unitOf(unit).grams;
// 換回原單位時去掉浮點誤差（例如 0.10000000000000002），但保留使用者填的精確度
export const fromGrams = (grams, unit) => Number((grams / unitOf(unit).grams).toFixed(10));

const formatWeightValue = (value) => new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(value);

// 先顯示填寫時用的單位，括號內換算另一個單位，例如「10 錢（37.5 公克）」
export const formatWeight = (grams, unit = 'g') => {
  const [main, other] = unit === 'qian' ? [WEIGHT_UNITS[1], WEIGHT_UNITS[0]] : WEIGHT_UNITS;
  return `${formatWeightValue(fromGrams(grams, main.id))} ${main.label}（${formatWeightValue(fromGrams(grams, other.id))} ${other.label}）`;
};

// 國際金價（美元／盎司）的顯示，例如「3,110.35」
export const formatGoldQuote = (usdPerOunce) => formatAmount(usdPerOunce, 2);

// 每公克的台幣價格
export const goldTwdPerGram = (usdPerOunce, fxRates) => (usdPerOunce / GRAMS_PER_TROY_OUNCE) * twdPerUnit('USD', fxRates);

export const goldValue = (item, fxRates) => item.grams * goldTwdPerGram(item.price || 0, fxRates);

export const goldChange = (item, fxRates) => item.grams * goldTwdPerGram(item.change || 0, fxRates);

// 有填總投入金額、且已經抓到金價時才計算損益（含匯率變動）
export const goldPnl = (item, fxRates) => {
  if (!(item.costTotal > 0) || !(item.price > 0)) return null;
  const pnl = goldValue(item, fxRates) - item.costTotal;
  return { cost: item.costTotal, pnl, pct: (pnl / item.costTotal) * 100 };
};

// 期貨分頁的合計：總重量（公克）、今日漲跌、最新金價
export const futuresSummary = (futures, fxRates) => ({
  grams: futures.reduce((sum, f) => sum + f.grams, 0),
  value: futures.reduce((sum, f) => sum + goldValue(f, fxRates), 0),
  todayChange: futures.reduce((sum, f) => sum + goldChange(f, fxRates), 0),
  price: futures.find(f => f.price > 0)?.price || 0,
});

// 抓國際金價；網路失敗時回傳 null
export const fetchGoldQuote = async () => {
  const chart = await fetchYahoo(`/v8/finance/chart/${encodeURIComponent(GOLD_SYMBOL)}?interval=1d&range=5d`);
  const result = chart?.chart?.result?.[0];
  const price = result?.meta?.regularMarketPrice;
  if (price == null) return null;
  const prevClose = getPreviousClose(result);
  return { price, change: prevClose != null ? price - prevClose : 0 };
};

export const applyGoldQuote = (item, quote) => ({ ...item, price: quote.price, change: quote.change, priceUpdatedAt: Date.now() });
