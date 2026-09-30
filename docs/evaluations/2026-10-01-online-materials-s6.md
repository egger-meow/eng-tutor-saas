# S6 — 首頁定位與公開互動範例

日期：2026-10-01。此紀錄區分本機驗證、網站部署與仍待真機驗收的範圍。

## 交付範圍

- 首頁、導覽、價格說明、個人化示意、FAQ 與 meta description 統一為「線上閱讀與作答、依已提交表現調整、也可列印」。保留真實招生狀態、Beta、創始月繳 NT$349、標準月繳 NT$499／年繳 NT$4,999；不新增價格或計费動作。
- 清理「填回饋就自動生成下一週」說法，顯示提交、選填回饋、獨立申請下一份與每服務月最多 4 份。
- `/sample` 不需登入，使用公開合成故事與固定學習設定，提供選題、文字作答、裝置朗讀、提交確認、結果、鎖定與清除重做。固定範例明示不是個人化生成，不使用真實孩子資料。
- 正式與範例共用 `StudentLessonRenderer` 及其既有各章元件。正式的伺服器草稿、提交與權限不變。範例不呼叫學生 RPC；使用獨立的 `paper-english:public-synthetic-demo:v1` 本機 key。跨裝置同步不是 demo 能力。
- 客觀選擇題比對選項；開放題不自動判錯；未答與答錯分開。demo 答案為公開合成 fixture，畫面提交前隱藏，不能把這當作正式教材授權機制。
- 四頁空白 A4 PDF 來自同一份 `public-demo.json`，沿用既有 legacy PDF renderer，永不讀取本機草稿或結果。初始輸出在 ignored `output/pdf/`，明確發布副本為 public synthetic asset `samples/demo-student.pdf`。原有公開 PDF 不刪除，首頁改以合成互動範例為主。
- 範例結尾連接既有首頁 questionnaire 與 direct login，未更動 Auth、首次孩子建檔、容量或 generation release。無 migration 或 Edge Function 改動。

## 本機證據

- `pnpm typecheck` PASS；`pnpm build` PASS；`pnpm lint` 0 errors，3 個既有 Fast Refresh warnings。
- 全量 Vitest：185 files／1,626 tests PASS（新增 PDF 與 storage 測試之前）；最終 focused checks：5 files／39 tests PASS，含新 PDF 與 storage checks。最終全工作區 typecheck PASS。更新的 Landing test 原有 CRLF 亦正規化為 LF，`git diff --check` PASS。
- `node scripts/test-public-demo-browser.mjs`：390×844、820×1180、1440×1000 三種模擬尺寸 PASS。使用實際 app routes；合成 service fixture 與模擬裝置語音。涵蓋答案提交前不顯示、鍵盤選題、文字作答、重新整理恢復、朗讀／停止、取消提交、提交、各結果類別、鎖定、刷新保留提交、固定空白 PDF、清除重做、storage unavailable 與登入回程。
- network assertions：只出現 `get_enrollment_state` 與首頁 `record_funnel_event`；無學生／生成／提交 RPC，作答文字未進入 service request。
- `node scripts/test-online-materials-browser.mjs`：正式 reader synthetic RPC 流程 phone／tablet／desktop regression PASS。這是 UI 模擬，不能代替正式帳號或 SQL 授權證據。
- PDF inspection：109,512 bytes，4 頁，每頁約 594.96×841.92 pt（A4）。題幹與合成 source 對應；無 parent guidance 或答案段落。四頁 PNG 目視檢查通過，空白書寫區、段落與頁碼可辨識，無裁切。
- screenshots 留在 ignored `.runtime/s6/`；PDF 視覺檢查用既有 PDF.js／Chromium helper。生成重現：`pnpm exec tsx packages/pdf/src/generate-interactive-demo.ts`。

## 部署驗收

- Source commit `94a60b39c0e840037eb2e83e9b6728255e673e15` 已正常 push `main`；推送前 fresh remote head `a37e4a9` 與本機一致。
- [CI run 36764449374](https://github.com/egger-meow/eng-tutor-saas/actions/runs/36764449374)：verify job `110054953142` SUCCESS；deploy-production job `110055666002` SUCCESS。
- 正式 `https://paperbond.jjmowlab.com/sample` HTTP 200；部署 asset `/assets/index-p-Wc9t9r.js` HTTP 200，包含新提交確認與 demo storage key。
- `https://paperbond.jjmowlab.com/samples/demo-student.pdf` HTTP 200；remote/local SHA-256 一致：`738423460b2f28aca90d6a5623a18bdcc29ac8df00ddbee55884f34aa8f29284`。
- 正式網站匿名 browser smoke（390×844 模擬 viewport）PASS：選題、文字作答、刷新恢復、確認提交、11 題結果、鎖定、無橫向溢出及回到 existing-parent login。只使用合成範例，未建立真實帳號或送出登入郵件。觀察到的 Supabase requests 僅為 `get_enrollment_state`、首頁 `record_funnel_event`，範例作答文字不在 request body；無 page errors。
- 無 migration／Edge Function 變更，generation release 未更動。git 最終只保留原有未追蹤交接文件；不把它誤加入提交。

## 待驗收與邊界

- 真實手機／平板軟鍵盤、音訊與實際列印尚未驗證；上述 viewport 與語音均為模擬。
- 不新增實際家長帳號或發送登入郵件作為測試。既有 auth／onboarding tests 和 UI 回程提供回歸證據，實際帳號學習回圈仍保留先前驗收門檻。
- S5 排程最新 readback 仍為 run `36748221973`，舊 head `7819a8d`（2026-09-30T16:59:41Z）；未觀察新版 recovery step 執行，不手動觸發 publisher 僅供測試。S5 正式缺檔重建驗收持續待辦。
- S3 下一份實際教材如何回應學生表現，仍需在下一次授權生產教材提供教學證據；本範例不冒充該證據。
