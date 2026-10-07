// --- 品牌視覺資產：32x32 高精細版藍色像素金幣 ---
export const PixelCoin = ({ size = 24 }) => {
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
