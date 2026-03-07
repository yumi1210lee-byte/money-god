import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/money-god/', // 這是 GitHub Pages 的路徑，請確保與 Repo 名稱相同
})