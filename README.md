# Money God

個人資產管理 Web App，記錄現金、股票、負債與每月支出，可以加到 iPhone 主畫面當成 App 使用。

網址：https://yumi1210lee-byte.github.io/money-god/

## 功能

- **總覽**：淨資產、資產負債比例、淨資產走勢圖、股票摘要（今日損益、未實現損益、年股利）、本月待繳、每月支出與類別占比
- **現金**：台幣與美元帳戶，美元依即時匯率換算
- **股票**：台股（上市、上櫃）與外國股票，自動抓取股價、當日漲跌、近 12 個月股利與配息月份；填入成交均價或總投入金額（台幣，含匯差）即顯示未實現損益與報酬率
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
| `money_god_history` | 淨資產走勢：每天一筆 `{ date, netWorth, assets, debts }`，備份時一併匯出，匯入時合併 |
| `money_god_last_backup` | 上次匯出備份的時間 |
| `money_god_auto_lock` | 自動上鎖時間（分鐘；0 = 立即，-1 = 不自動） |
| `money_god_v55_before_import` | 上一次匯入前的資料，供「還原」使用 |
| `asset_terminal_pass` | 開機密碼 |

> 修改程式時，不要更改 `money_god_v55` 的名稱或資料格式；若必須更改，要寫轉換舊資料的程式，否則使用者的資料會看起來像消失了。

## 股價與匯率來源

- 股價來自 Yahoo Finance 的非官方 API。瀏覽器無法直接呼叫，因此先透過自己的股價中繼站（Cloudflare Worker，見下方）取得；中繼站失敗時再依序改用公開 CORS 代理（allorigins、codetabs）。
- 純數字代號（如 `2330`、`00679B`）會先試上市 `.TW`，找不到再試上櫃 `.TWO`。
- 解鎖時同步一次，之後每 5 分鐘自動更新；從背景切回 App 時，距上次同步超過 1 分鐘也會更新。股利資料一天最多更新一次。
- 匯率來自 [open.er-api.com](https://open.er-api.com)。

### 股價中繼站（Cloudflare Worker）

- 程式在 `worker/`，網址是 `https://money-god-quotes.yumi-money.workers.dev`，只有這個 App 在用，不會像公開代理那樣因為太多人使用而被 Yahoo 擋。
- 只轉送 App 用到的兩種查詢（股價／股利圖表、股票名稱搜尋），只接受 App 網站（與本機開發）發出的請求。
- 向 Yahoo 的 `query1` 查詢失敗時改用 `query2`；同一檔股價 1 分鐘內、股利 6 小時內重複查詢時直接用上次的結果。
- `main` 測試通過後，GitHub Actions 會自動部署，並實際查一次台積電與 Apple 的股價確認能用（Yahoo 暫時限流時只顯示警告）。
- 部署需要 repo 的 Actions secrets：`CLOUDFLARE_API_TOKEN`（Cloudflare「Edit Cloudflare Workers」範本建立的 API Token）與 `CLOUDFLARE_ACCOUNT_ID`。
- 使用 Cloudflare Workers 免費方案（每天 10 萬次請求）。

```bash
npm run test:worker   # 中繼站的測試（模擬 Yahoo 回應，不需要網路）
cd worker && npm ci && npx wrangler dev   # 在本機執行中繼站（http://localhost:8787）
```

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
- GitHub Actions 會在每次推送到 `main` 與每個 PR 自動執行 lint、中繼站測試與全部測試（`main` 通過後接著自動部署 App 與中繼站）；失敗時可以在 Actions 頁面下載 `playwright-report`，裡面有失敗畫面的截圖與操作紀錄。

## 部署

- **自動部署**：每次推送或合併到 `main`，GitHub Actions 跑完 lint 與測試、全部通過後，會自動打包並推送到 `gh-pages` 分支，GitHub Pages 約 1～2 分鐘後更新。測試失敗就不會部署，網站維持上一版。
- **重新部署**：在 GitHub 的 Actions 頁面選 CI → Run workflow（分支選 `main`）。
- **手動部署**（備用）：

```bash
npm run deploy   # 在自己的電腦打包後推送到 gh-pages 分支
```

- `vite.config.js` 的 `base: '/money-god/'` 必須與 GitHub repo 名稱相同。
- 部署後，在手機上把 App 從背景完全關閉再重新開啟才會載入新版；GitHub Pages 有約 10 分鐘的快取。
