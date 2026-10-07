import { formatAmount, isNegative } from '../lib/format.js';

// 大字金額：幣別用小字標示，避免撐寬版面；數字不換行
export const Money = ({ value, currency = 'NT$' }) => (
  <span className="whitespace-nowrap"><span className="font-sans font-black text-[max(11px,0.55em)] opacity-70">{isNegative(value) ? '-' : ''}{currency} </span>{formatAmount(value)}</span>
);
