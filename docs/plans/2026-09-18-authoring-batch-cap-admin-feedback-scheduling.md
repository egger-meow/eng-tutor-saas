# 作者領取上限、近期 admin 與回饋驅動排程實作計畫

**狀態：僅規劃，未修改程式或 production。**

**Goal:** 先防止作者一次領走整個佇列，再整理營運介面，最後把後續教材改成有回饋才啟動。

**Architecture:** Supabase 保持工作資格、原子領取、租約與入列的唯一權威。各執行器共用作者批次限制；提交後的出版流程保持原有契約。回饋驅動機制另案切換，不把產品改制綁在緊急修補上。

**Tech Stack:** 既有 SQL migrations、worker TypeScript、admin/web React。

**Spec:** `docs/SPEC.md`。已讀相關章節：20、24、109–110、113–116、120、122–125、138、160、172–173、183–184、194、199、204–205、210。實作前須更新衝突的產品條款。

## 已確認事實與證據邊界

- 本次只查本地原始碼與 migration，未查 production 函式定義、實際 scheduler 設定或事故批次。因此以下可解釋失效機制，尚不能斷言事故由哪個部署入口觸發。
- SPEC 122 明文允許 mandatory 工作超過正常 15 的容量。`20260911133000_unify_pilot_entitlement_authority_and_release_safety.sql` 的 `private_generation.claim_due_generation_jobs` 先無上限選 mandatory，再用剩餘容量選 normal，最後全部更新為 claimed。把設定值改成 10 仍不足以修好。
- `20260905220000_week1_fast_lane.sql` 的 `claim_week1_fast_generation_jobs` 另有 `limit 15`。因此「15 只在 Finisher」並不完全符合本地程式。
- SPEC 123 與 normal SQL 允許回饋截止後，即使沒回饋也繼續生成。公測的 14 天家長活躍限制並非教材回饋限制。
- admin `deriveOperationsPipeline` 沒有完成歷史時間篩選；`finisherDone` 還會收到品質退回等其他終態。
- `20260918004500_exclude_submitted_authoring_leases.sql` 已將有本次 submission 的 job 排除於作者活躍租約；新增限制必須保留這項區分。

## 一、P0：作者每批最多 10，逾期也不能突破

### 修改範圍

- 新增 migration，替換 normal `claim_due_generation_jobs` 與 Week 1 `claim_week1_fast_generation_jobs` 的選取邏輯；不修改舊 migration。
- 檢查 `worker_start_authoring_batch`、`worker_claim_local_authoring_batch`、scheduled start、Week 1 start 與 bridge 的呼叫鏈，防止舊入口繞過限制。
- 檢查 `packages/worker/src/authoring-helpers.ts`、`local-codex-authoring.ts`、CLI、`supabase/functions/authoring-bridge/index.ts` 與 executor 文件。
- 更新 SPEC 122–123 與 `docs/production-authoring.md`、`docs/local-codex-production-authoring.md`、`docs/chatgpt-work-daily-schedule.md`。

### 執行步驟

- [ ] 先讀取 deployed function definitions、migration history、scheduler mode、作者未提交租約的聚合數量；不呼叫 claim 來診斷。
- [ ] 新增明確的營運設定 `authoring_batch_limit`，本次值為 10。作者與 publisher 的限制分開，不再以 daily limit 暗示每日只能做 10 份。
- [ ] 合法候選先依逾期優先、到期時間、建立時間、job ID 排序，在鎖定與 UPDATE 前對總集合套用 LIMIT；禁止先 claim 全部再截斷回傳陣列。
- [ ] 正常入口與 Fast Lane 都使用同一批次設定，保留各自資格規則、`SKIP LOCKED`、既有序列化與 immutable snapshot。
- [ ] 每個 executor invocation 只 claim 一次；恢復已持有批次不領新工作。下一輪可處理剩餘 pending，不限制一天只能一批。
- [ ] 作者提交後就不再占作者工作量，不等待 Finisher 完成才允許後續批次。
- [ ] 對超過 10 的既有 active batch 保持可恢復完整快照；不能因新上限靜默丟掉後 40 筆。先盤點，另用有稽核的 recovery 處理，不能粗暴 reset、重寫 fingerprint 或重新 claim。
- [ ] 觀測 pending 數量、最老等待時間、每批 claimedCount、未提交 active 數與實際完成率。10 是批次限制，不是吞吐量保證。

**限制語意：** 本計畫以「每次領取最多 10」為 P0；normal 與 Fast Lane 既有共存不因此取消。若要求全系統合計未提交最多 10，需共用原子容量鎖與名額計算，不能把兩條各 10 說成全域 10；這是獨立待確認決策。

### 驗收

新增 `supabase/tests/authoring-batch-cap.sql`，搭配既有 `authoring-unsubmitted-leases.sql` 與 worker bridge concurrency tests：

- 60 筆全到期：僅 10 筆轉 claimed，其餘 50 筆狀態、attempt 與 snapshot 不變。
- 混合到期／未到期、0／1／9／10／11 筆、正常／Week 1 入口，都不突破 10。
- 兩個同時 start 不重複持有 job；同 worker 重入不追加新批次；有本次 submission 的租約不再阻塞作者。
- 已有超額舊 batch 的 recovery 不截斷、不增加 attempt。
- 每輪只有一個 claim 呼叫；提交 10 筆後下一輪可領下一批。

部署先上資料庫限制，再部署必要的 adapters。驗證遠端 migration 與函式；實際正常執行後只讀回 claimedCount 與 pending 差異，不用真實兒童工作做破壞性測試。不調高 Finisher 到 100；那是另一個容量問題，且現有 submission RPC 還有 25 的參數邊界。

## 二、P1：admin 只展開近期已完成，保留所有待處理事項

**Files:** `apps/admin/src/server/admin-service.ts`、`client/types.ts`、`components/overview/OperationsOverview.tsx`、`server/admin-service.test.ts`、SPEC 172。

- [ ] 預設成功完成欄顯示最近 7 天，依完成時間倒序；可選 3／7／30 天或查歷史。7 天是本計畫建議值。
- [ ] 以本次 submission `processed_at` 或 job `completed_at` 判定完成時間，不用 job 建立時間；缺乏可信時間的資料保留可查，不捏造日期。
- [ ] 成功終態才進「近期完成」。品質退回、重試耗盡等未解決事項留在待處理區；等待 release 的教材保留可見。
- [ ] active、failed、awaiting publication 不受近期篩選排除。不要直接對整份 jobs 查詢加日期 where。
- [ ] 數字與清單同一範圍，標題寫明「近 7 天完成」；历史保留 Debug Inspector 存取，絕不刪除。
- [ ] 若來源查詢有筆數上限，分開取得 active 集合和分頁歷史，避免歷史資料擠掉 active 工作。

**驗收：** 100 筆舊成功資料不擠在首頁；8 天前失敗仍可見；剛完成的老 job 可見；期間邊界與時區正確；切換範圍不改資料。執行 admin focused tests、typecheck，人工查看三欄空／多筆狀態。

## 三、P2：回饋後才啟動下一份，保留既有內容 pipeline

此階段是產品契約變更，不應當成 P0 附帶 bug fix。建議流程：

`首次註冊 → 第一份 → 學習 → 快速回饋並申請下一份 → 權益／額度檢查 → 明確 job → 既有作者與出版流程`

### 建議規則，尚非已核定契約

- 第一份保留自動入列；後續必須針對上一份 canonical material 有有效回饋。
- 回饋很少也有效，不強迫寫長文或完成 100%。0% 回饋不等於已使用；按鈕需明確表示「送出回饋並申請下一份」，避免只回報未開始就意外生教材。
- 每個孩子、每份來源教材最多啟動一份下一教材。編輯、重送回饋、跨頁重按不產生額外 job 或扣額。
- 月額度以孩子為單位，建議每服務月最多 4 份，第一份也計入；不能沿用「使用者」而打破 per-child 訂閱。
- 建議月額度不累積；入列時原子保留額度，成功出版轉使用，技術重試沿用同一保留。永久失敗／取消的釋放須冪等。
- 額度不足仍保存回饋。建議下一期由家長再次申請，不在重置日把所有候補自動塞回 queue。
- 準備完成後開放，不再對新制工作套七天 release 等待；教材序號仍連續，未使用的日曆週不補產。

### 實作工作包

- [ ] 先定義額度週期：付費月訂閱以帳務週期；年訂阅與公測以服務啟用日分月，明確規定月底／閏日／時區。保留正式權益與額度不同概念。
- [ ] 新增 owner-scoped transactional feedback/request RPC，原子保存回饋、檢查來源教材／entitlement／額度、建立唯一 job 與額度保留；所有 trigger、scheduler、管理員重試也須尊重同一權威。
- [ ] 找出兩個完成入口 `worker_complete_generation_job`、`worker_complete_week1_fast_submission` 及訂閱 re-anchor 路徑的最新部署定義：移除新制自動 +7 天產生下一 job，不讓付款事件繞過回饋 gate。
- [ ] claim 端對新制 Week 2+ 做防禦性回饋／保留額度檢查，移除以 cutoff 經過作為免回饋通行證。既有 retry 保持原 snapshot。
- [ ] 調整 `FeedbackForm.tsx`、`ChildCard.tsx`、`DeliveryStatus.tsx` 及實際 data adapter：顯示待回饋、已入列、製作中、可下載、剩餘次數與重置日，不顯示不存在的固定交付日期。
- [ ] 更新 SPEC 24、113–116、122–123、138、160、194、199 及對外每週交付承諾；確認是否影響收費條款後才切換已付費用戶。

### 舊資料切換與驗收

- 完成的 PDF 不變；已 claim、有 immutable submission 或正在出版的工作保留舊契約完成。
- 舊 pending 無回饋、無 snapshot/submission 的工作先盤點，再按明確規則停用自動生成；保留稽核與家長原有可見承諾，不大量刪除。
- 切換採可辨識的排程 policy，讓既有工作與新工作分流。回退停止新制入列，不恢復已消耗額度、不重播已完成工作。
- 測試無回饋跨月仍不入列；正確回饋只建立一個下一 job；同時請求不超 4；失敗重試不重扣；月底和 entitlement lapse/resume；舊制在途完成不再偷偷排新制下一週；不同孩子權益隔離。
- 若更動 authoring payload/schema 或 generation release，完整遵守 `docs/production-release-policy.md`；不能靠本地搜尋聲稱線上相容。

## 實作順序與待確認決策

順序：P0 上限 → P1 近期營運畫面 → 核定 P2 產品規則 → P2 實作與分批切換。

P0 不應等待月額度設計。P2 需明確確認：每孩子還是每帳號、第一份是否計次、服務月還是日曆月、是否可短期用完 4 次、未用額度是否累積、額度不足後是否自動排下期，以及已付費用戶的切換承諾。以上建議不是默認取得的實作授權。

本次不執行測試、claim、release、部署、commit 或 push；僅保存這份規劃。實作時直接修改後做針對性驗證，不使用 TDD 流程。
