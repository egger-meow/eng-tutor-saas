# S7：營運觀測與全流程收尾

日期：2026-10-01（Asia/Taipei）。本階段交付私有量測、保留清理與恢復文件；整體真機／實際教材教學驗收仍有待辦。

## 變更與邊界

- Relevant SPEC：83、87、109、113–114、116、144–146、149–153、168–173、178–179、182、198–199、204、210；先讀完整 TOC。更新 153／168／173，沒有新增或更名 heading。
- `material_learning_events` 不含作答／回饋文字、PII、URL、token 或任意 metadata；三項 server transition trigger、五項窄 browser 事件。Ownership／release／parent answer gate、RLS、direct grants、內部測試排除與 per-material dedupe。Sample 完全隔離。
- 第二份使用透過 canonical weekly snapshot sequence=2 查詢，不另造可偽造的 browser second-week event。
- service-only 90 天清理，只刪事件；既有 scheduled workflow 新增命令。零變更不輸出訊息、不新增通知供應商。營運 SQL 與保存／提交／PDF／authoring 恢復見 `docs/operations/`。
- 沒有 Edge source 或 generation release/version 變更；Week 1／Week 2+ publication 契約維持。

## 本地驗證

- `pnpm test`：188 files／1632 tests PASS。
- `pnpm typecheck`、`pnpm build` PASS；`pnpm lint` 0 errors，3 項既有 Fast Refresh warnings。
- `pnpm test:db`：15 套 SQL PASS。新增 browser server-event 偽造拒絕、跨家庭、未發布、表與 cleanup privileges、去重、實際提交／回饋／next transaction 記錄，以及 91 天 expired event 清理不刪新事件。
- 最終 migration clean installation 在 local rollback transaction PASS。初次 CLI local push 遇已存在的 S5 schema／缺 migration history，因此改用 local SQL 套用 S7；未 reset 本地 DB。新 migration 起初重複一份 block，clean replay 前已移除，正式檔案只保留一份。
- `node scripts/test-online-materials-browser.mjs` phone／tablet／desktop PASS：mock RPC 完整保存／衝突／提交／回饋／quota／下一份／PDF 流程及 exact telemetry keys。不傳答案，不由 browser 送 server transition。
- `node scripts/test-public-demo-browser.mjs` phone／tablet／desktop PASS；service requests 只有 enrollment 與既有 public funnel，沒有正式學習事件或作答內容。
- Full suite 只改動既有 CAP fixture timestamps，檢查後還原；原始未追蹤交接文件未加入提交。

## 正式 readback 與部署

- 部署前 remote main `8f4869deaa96e6f41398fc47fde1ec1c0a69e19b` 與本機一致。
- S5 scheduler 待辦已有新證據：[run 36797067259](https://github.com/egger-meow/eng-tutor-saas/actions/runs/36797067259)，head `8f4869d`、created `2026-10-01T00:37:04Z`，整體 SUCCESS；`Recover requested PDF artifacts` step SUCCESS。正式 PDF artifact table 為空，這證明新版 recovery step 已跑，仍不證明真實 missing-object rebuild。
- Edge fresh readback：`material-access` ACTIVE v17，ID `8f370c7c-e937-49a0-86d8-0b86b186b2de`；`material-pdf` ACTIVE v1，ID `b25e54ea-864c-498d-b7a0-a2f19f18cf1d`。S7 沒有 Edge 更新。
- Source `1291f1eaf64cd01856e2345392b46a9754a616f6` 正常 push main。Linked CLI dry-run 只列一個 pending migration；套用 `20261001051703_material_learning_observability.sql` 成功，remote history 同名／同版本讀回。
- [CI run 36820100839](https://github.com/egger-meow/eng-tutor-saas/actions/runs/36820100839)：verify job `110233622727` SUCCESS；deploy-production job `110234179724` SUCCESS。
- 正式 `/sample` HTTP 200；asset `/assets/index-CHJKSmC4.js` HTTP 200，包含 `record_material_learning_event`。正式匿名 sample 390×844 browser smoke PASS；只見 enrollment 與 public funnel RPC，沒有 learning event／作答傳送。
- Remote RLS true；四欄精確為 material_id／event_name／origin／created_at。Authenticated direct SELECT、anon event RPC、browser purge 都為 false；三項 transition trigger 存在。
- 正式 rollback 合成 fixture PASS：ownership、release、parent-answer submission gate、server-event browser forgery、duplicate open dedupe、server submission／feedback／next transitions、internal-test exclusion。Rollback 後 synthetic users／materials count 都為 0，沒有留下帳號、教材、提交或事件。沒有 production authoring claim。
- Fresh active contract 仍為 rel_1.9.1／bundle 2.14.1-prod／SHA d72ca08a83b41c34f64d703541f34d6120d629bc2b0d4919037a749808591211，engine 1.9.0／prompt 2.14.1／schema 2.6.0／worker 1.8.0／renderer 1.6.1。
- Security advisors：新表的 [RLS no policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) INFO 與 [authenticated SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) WARN 符合窄 RPC／拒絕 direct access 的設計，已用行為驗證。其他既有 notices 沒有在 S7 修改；assessment_client_items view 的 browser SELECT fresh readback=false，不把 advisor 清單宣稱全站 security PASS。
- 手動執行正式 `purge_expired_material_learning_events()` 被自動審核拒絕：永久廣泛刪除未獲立即執行的明確授權。未執行、未繞過。改用唯讀 expired count，結果為 0；實際 worker retention execution 仍待首次新版排程。此額外手動操作不是部署步驟。

## 仍待驗收

- 真實手機／平板軟鍵盤、TTS、列印；模擬 viewport 不取代真機。
- 正式家長帳號全回圈與第二份實際使用／表現適應，及 S3 實際下一份教材教學證據。
- S5 正式 missing-object rebuild；不為測試刪真實 PDF 或額外 claim／觸發 publisher。
- S7 新 retention workflow step 的首次實際 scheduler execution；設定與 local cleanup PASS 不等於已觀察遠端 runtime。
