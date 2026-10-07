# Money God

個人資產管理 Web App，記錄現金、股票、負債與每月支出，可以加到 iPhone 主畫面當成 App 使用。

網址：https://yumi1210lee-byte.github.io/money-god/

## 功能

- **總覽**：淨資產、資產負債比例、每月支出與類別占比
- **現金**：台幣與美元帳戶，美元依即時匯率換算
- **股票**：台股（上市、上櫃）與外國股票，自動抓取股價、當日漲跌、股利與配息月份
- **負債**：每月扣款金額、扣款日與年利率；到期後可一鍵記錄已繳，有填利率時只扣掉還本金的部分
- **支出**：月繳、年繳項目與類別
- **資料備份**：在設定中匯出／匯入 JSON 備份檔
- **自動上鎖**：切到其他 App 超過設定時間（預設 1 分鐘）自動上鎖並隱藏金額
- **復原**：刪除項目或記錄已繳後，6 秒內可以按「復原」

## 資料儲存

- 所有資料只存在瀏覽器的 `localStorage`，不會上傳到任何伺服器。
- 加到主畫面的 App 與 Safari 的資料是分開存的；刪除主畫面圖示會一併刪除資料。
- **請定期在「設定 → 資料備份」匯出備份。**
- 開機密碼只是畫面鎖，資料本身沒有加密。

| localStorage key | 內容 |
| --- | --- |
| `money_god_v55` | 主要資料：`cash`、`stocks`、`debts`、`monthlyExpenses` |
| `money_god_fx` | 上次抓到的匯率（以美元為基準） |
| `money_god_last_backup` | 上次匯出備份的時間 |
| `money_god_auto_lock` | 自動上鎖時間（分鐘；0 = 立即，-1 = 不自動） |
| `money_god_v55_before_import` | 上一次匯入前的資料，供「還原」使用 |
| `asset_terminal_pass` | 開機密碼 |

> 修改程式時，不要更改 `money_god_v55` 的名稱或資料格式；若必須更改，要寫轉換舊資料的程式，否則使用者的資料會看起來像消失了。

## 股價與匯率來源

- 股價來自 Yahoo Finance 的非官方 API。瀏覽器無法直接呼叫，因此依序透過公開 CORS 代理（allorigins、codetabs）取得，偶爾會失敗或延遲。
- 純數字代號（如 `2330`、`00679B`）會先試上市 `.TW`，找不到再試上櫃 `.TWO`。
- 解鎖時同步一次，之後每 5 分鐘自動更新；從背景切回 App 時，距上次同步超過 1 分鐘也會更新。股利資料一天最多更新一次。
- 匯率來自 [open.er-api.com](https://open.er-api.com)。

## 開發

需要 Node.js 20.19 或 22.12 以上（Vite 7 的需求）。

```bash
npm install
npm run dev      # 開發伺服器：http://localhost:5173/money-god/
npm run lint     # 程式檢查
npm run build    # 打包到 dist/
npm run preview  # 預覽打包結果
```

## 測試

```bash
npx playwright install chromium   # 第一次執行前，安裝測試用的瀏覽器
npm test                          # 打包後在瀏覽器中跑全部測試（約 1 分鐘）
npx playwright test --ui          # 用圖形介面逐項檢視測試過程
```

- 測試放在 `tests/e2e/`，以 iPhone 的螢幕寬度操作打包後的 App；另有一項在開發模式下執行。
- 股價、匯率、字型等外部請求都由 `tests/e2e/fixtures.js` 以模擬資料回應，不需要網路，結果也不受市場變動影響。
- 測試會使用 4173（預覽）與 5173（開發）兩個連接埠。
- GitHub Actions 會在每次推送到 `main` 與每個 PR 自動執行 lint 與全部測試；失敗時可以在 Actions 頁面下載 `playwright-report`，裡面有失敗畫面的截圖與操作紀錄。

## 部署

```bash
npm run deploy   # 打包後推送到 gh-pages 分支，GitHub Pages 約 1～2 分鐘後更新
```

- `vite.config.js` 的 `base: '/money-god/'` 必須與 GitHub repo 名稱相同。
- 部署後，在手機上把 App 從背景完全關閉再重新開啟才會載入新版；GitHub Pages 有約 10 分鐘的快取。
