# 家長回饋與學習狀態流程驗收（2026-10-26）

本次完成首頁、歷史教材與閱讀完成頁的狀態／回饋入口修正。沒有變更生成截止時間、claim snapshot、資料庫結構或正式教材。

## 行為

- 同一卡片共用授權提交／草稿狀態；缺少家長回饋不再代表未開始。讀取不確定時保留教材入口與重試，隱藏未開始提示。
- 已提交教材可在首頁、歷史卡片就地新增或修改家長觀察。已申請、已儲存、已略過、申請失敗／取消、服務月上限均保留完成頁回饋入口。
- 提交後儲存觀察只儲存回饋；明確申請下一份仍為獨立動作。歷史紙本維持既有回饋並申請流程。
- 保留家長既有完成比例與其他欄位；首次填寫的完成比例以實際已答題數預填，不將部分提交當作全部完成。
- 移除固定 7 天與固定第 2 週教學方向；不承諾補填資料會改動已凍結的生成輸入。
- 紙本捷徑明示提交的是目前線上記錄、未輸入題目未作答、下一份需另外申請。證據卡只描述線上提交記錄，不宣稱評分了紙本答案。
- 能力與教材調整詳情可展開；開放題標為未自動評分。

## 實際瀏覽器操作

`node scripts/test-feedback-flow-browser.mjs` 使用真實 Chromium、正式元件與應用程式路由，搭配 stateful synthetic RPC。這是可重播的 UI 操作驗收，不是正式資料庫、真人家庭或手機實機驗收。API 故障為刻意注入。

1440×1000、390×844、320×844 均 PASS：

1. 未開始 → 草稿 → 由閱讀器提交部分作答 → 略過回饋 → 申請下一份。
2. 回首頁就地展開觀察 → 輸入 → 模擬儲存失敗保留輸入 → 重試成功。
3. 重新整理讀回 → 修改 → 完成頁讀回並再修改 → 儲存後再開啟 → 歷史卡片讀回。
4. 每個尺寸僅一次申請、三次成功儲存；完成頁編輯保留家長回報的 75% 完成比例。
5. 失敗／取消／上限仍可填寫；提交狀態失敗保留開啟教材與重試；check-in 失敗不顯示未開始提示。
6. 歷史紙本入口、鍵盤 Enter 展開／收起、200% 文字無水平溢出、無 pageerror。

原有 `node scripts/test-online-materials-browser.mjs` 亦通過 320px、390px、820px、1440px；涵蓋草稿儲存、跨分頁衝突、離線恢復、提交鎖定、解答、閱讀／朗讀入口與明確申請。

截圖已實際檢視桌面與手機的首頁、完成頁及回饋表單。腳本會輸出 `.runtime/feedback-flow/results.json`、各尺寸完整頁面 PNG、`*-dashboard-card.png` 與 `*-next-step.png`，均為合成資料。CI 已加入新流程重播。

## 其他驗證與限制

- 全庫 Vitest：210 suites / 1785 tests PASS；後續保留完成比例與展開控制調整再通過 web 73 suites / 411 tests 與跨頁瀏覽器重播。
- web TypeScript、production build、oxlint 通過；既有 Fast Refresh、bundle size 提醒保留。
- Corepack 在沙箱無法下載 pnpm；使用已安裝的本地 TypeScript／Vitest／Vite／oxlint 入口完成同等檢查。瀏覽器測試需要本機網路及已安裝 Chromium。
- 本機 Docker engine 未啟動，Supabase status 無法連線，未執行 test:db 或真實資料庫回寫驗收。沒有任何正式家庭資料、寄信、生成或額度異動。
- 正式環境上線必須另以 CI／部署讀回確認；本地建置與截圖不等於正式部署成功。

一般環境可執行：

```powershell
pnpm test
pnpm --filter @paper-english/web typecheck
pnpm --filter @paper-english/web build
pnpm lint
node scripts/test-online-materials-browser.mjs
node scripts/test-feedback-flow-browser.mjs
```
