import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'playwright-report', 'test-results', 'worker/.wrangler']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  // Playwright 測試在 Node 執行（page.evaluate 內的程式則在瀏覽器執行）；fixture 的 use() 不是 React hook
  {
    files: ['tests/**/*.js', 'playwright.config.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  // 股價中繼站在 Cloudflare Workers 執行；測試在 Node 執行
  {
    files: ['worker/**/*.js'],
    languageOptions: {
      globals: { ...globals.serviceworker, ...globals.node },
    },
  },
])
