import { defineConfig, devices } from '@playwright/test';

// 瀏覽器端到端測試。股價、匯率、字型等外部請求都在 tests/e2e/fixtures.js 以模擬資料回應，不需要網路。
const PREVIEW_URL = 'http://localhost:4173/money-god/';
const DEV_URL = 'http://localhost:5173/money-god/';
const phone = { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } };

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // 打包後的正式版本（與部署到 GitHub Pages 的相同）
    { name: 'app', testIgnore: /\.dev\.spec\.js$/, use: { ...phone, baseURL: PREVIEW_URL } },
    // 開發模式（React StrictMode 會讓 effect 執行兩次）
    { name: 'dev-mode', testMatch: /\.dev\.spec\.js$/, use: { ...phone, baseURL: DEV_URL } },
  ],
  webServer: [
    { command: 'npm run build && npx vite preview --port 4173 --strictPort', url: PREVIEW_URL, reuseExistingServer: false, timeout: 120_000 },
    { command: 'npx vite --port 5173 --strictPort', url: DEV_URL, reuseExistingServer: !process.env.CI, timeout: 120_000 },
  ],
});
