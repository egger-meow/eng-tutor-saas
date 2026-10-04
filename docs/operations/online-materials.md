# 線上教材營運與恢復

更新：2026-10-01。使用現有 Supabase Dashboard、Admin Inspector 與 GitHub Actions，不新增監控供應商或自動對外訊息。

## 使用指標與隱私

`material_learning_events` 獨立於招生漏斗。只儲存 opaque material ID、固定 event、browser/server origin 與首次時間，沒有自由 metadata、作答、題幹、姓名、Email、URL、token、IP 或家長回饋文字。ID 仍可由受權操作員連回教材，因此不是匿名資料。公開合成 sample 不呼叫這個 RPC，內部測試孩子排除；沒有回填上線前的使用歷史。

| 事件 | 來源／意義 |
| --- | --- |
| `material_opened` | 正式 PaperReader 掛載，browser 觀測 |
| `answer_started` | 本次 reader 首次非空文字／選項輸入，不含輸入內容 |
| `save_failed` | 保存狀態進入 error，包含離線；不含原始錯誤 |
| `material_submitted` | submission INSERT 同一交易，由 server 確認 |
| `feedback_saved` | 真正 feedback INSERT／UPDATE 同一交易；略過不產生 |
| `next_requested` | generation request INSERT 同一交易；拒絕／quota 用盡不產生 |
| `student_downloaded` / `parent_downloaded` | PDF bytes 成功取得且觸發瀏覽器下載；不保證使用者存檔或列印 |

每教材每事件只保留一次，重載／雙分頁／重複 RPC 不灌高次數；90 天清除後再次觀測可形成新紀錄。Browser 事件是 best effort、可被家長端申報，不能當計費、配額、評分或教學成效依據。離線／阻擋請求／舊頁面可能漏記，不推斷零事件等於沒學習。Server 事件隨原交易一起成功或回滾，瀏覽器不能偽造。新回饋編輯的首次時間不是最後更新時間。

執行 [material-learning-signals.sql](./material-learning-signals.sql) 看最近 90 天描述統計、48小時啟動、跨日作答接續、阻礙回報分佈及第二份教材使用。第二份以 `child_weekly_learning_snapshots.sequence_number=2` 為準，缺少序號不猜測。分母／時間窗不同的數量不直接算轉換率，不把開啟當完成。實際下一份是否更適合，仍需檢視受權教學證據。

## RLS 與保留

事件表啟用 RLS，`anon`／`authenticated` 不可直接 SELECT／寫入。受權 browser RPC 只接受 material ID 與五種 browser 事件；檢查家長 ownership、completed、實際 release_at；家長解答下載事件另檢查提交門檻。沒有查詢或通用 metadata RPC。Server trigger helper 不授予 browser execute；service role 保留內部查詢與清理權限。

事件保留 90 天，`pnpm worker purge-learning-events` 呼叫 service-only `purge_expired_material_learning_events()`，只刪逾期事件，不刪教材、草稿、提交、回饋或歷史 PDF。既有 fast-publisher workflow 在未取消時執行清理，零刪除不輸出訊息；排程間隔不是 SLA。用查詢確認 expired count=0 與最新 workflow step success。排程失效時以受權 service worker 執行同一命令。禁止從瀏覽器暴露 service key。

## 保存／提交恢復

1. 保存失敗：先保留頁面與輸入；恢復連線後自動重試，或按重試。未保存時不要刷新。Telemetry 失敗不阻止保存。
2. 跨分頁衝突：載入伺服器草稿，或明確選保留本機；用 server version 重試。不要直接改草稿表或重置版本。
3. 保存中無法提交：等最新 revision 保存完成。提交回應不確定時，重新讀 submission；不要改 canonical／提交快照。既有 RPC 保持整份提交、部分完成、未答不算錯、開放题未評分。
4. 下一份回應不確定：重新讀 submission 的 next_requested 與 request/job 關聯；來源教材冪等，不重建 request、不繞過每服務月四份。略過回饋不補假記錄。

## PDF／authoring 恢復

PDF missing/cache 過期會排隊；未確定排程已跑之前只說準備中。檢查 `material_pdf_artifacts` state、lease_until、attempts、render_ms 與 workflow `Recover requested PDF artifacts`。同一 material revision／renderer／kind 共用冪等 key；過期 rendering lease 可重新 claim，failed 在授權下載重試並遵守冷卻期。Render 使用 immutable canonical，沒有草稿／提交；不手動覆寫 storage path 或刪歷史 PDF。

Authoring 維持 [production-authoring.md](../production-authoring.md) recovery-first 流程及 [production-release-policy.md](../production-release-policy.md)。Week 1 Fast Publisher 與 Week 2+ Finisher 保持原契約。對不確定的 claim／submit 先 readback，不為 smoke 額外 claim，不手動呼叫 publisher 來宣稱排程正常。

## 首波失敗監控

使用現有 workflow failure 狀態與上述查詢；零工作／零事件／排程未變不另外發通知。沒有新增 Email、Slack 或 Codex heartbeat。需要處理的訊號：新發生的跨家庭／解答門檻漏洞、保存後無法恢復、PDF render failure 或逾期 lease／長時間 queued、retention step failure，以及預期 consumer 缺部署。一次事故保留 opaque ID、版本、時間與恢復結果，避免每五分鐘重複報相同狀態。GitHub 通知是否送達依帳號既有設定，不能宣稱已建立通知服務。

## 部署與驗收

每次檢查 source SHA、CI deploy SHA、正式 web asset，remote migration history、相關 Edge deployment ID、active generation contract 與實際 scheduler head/step。記錄在 `docs/evaluations/`。完整回圈：讀取 → 填答 → 保存 → 提交 → 正解／未答／開放題 → 選填或略過回饋 → 明確申請下一份 → 第二份使用／表現適應 → 空白列印。

模擬 viewport、mock RPC、local SQL、production readback 與真機是不同證據。尚未有真機鍵盤／TTS／列印、正式帳號完整回圈或新實際教材適應證據時保留待驗收，不把 S7 程式部署當全部學習驗收完成。
