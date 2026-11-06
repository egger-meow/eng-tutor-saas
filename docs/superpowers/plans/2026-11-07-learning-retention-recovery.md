# 孩子持續使用：更新執行計畫

日期：2026-11-07。狀態：待執行；本次只交付分析與計畫。

**Goal:** 降低已註冊孩子從首次開始到再次作答、第二份教材使用之間的阻力。

**Architecture:** 沿用現有教材、草稿、導航、提交與下一份請求。以共同的任務狀態推導支援開始面板與 dashboard，先修真實狀態，再用既有私有事件建立 cohort 指標；不另建學習平台。

**Tech Stack:** 現有 TypeScript／React、Supabase、Vitest 與瀏覽器驗證工具。實作涉及 SDK 或 API 時先用 Context7 核對現行文件。

**Spec:** [分析與設計](../specs/2026-11-07-learning-retention-recovery-design.md)，以及 `docs/SPEC.md` 對應章節。

執行方式：逐項完成後驗證。遵循使用者不採 TDD 的偏好。條件式工作不得自動擴張成全部功能實作；不新增未經要求的子代理或批准流程。

## 全域限制

- 先讀 `docs/SPEC-TOC.md`，再讀各任務相關章節與 §204；涉及課程再讀 §205。
- 學生作答、可選家長回饋、明確請求下一份維持分離；不得自動提交或消耗生成配額。
- 首輪不改生成契約、既有已發布教材、付款、免費權益、每服務月配額或 mastery。
- 私有孩子資料、個別答案、token、登入連結不得寫入 Git、一般事件 metadata 或公開案例。
- 合成測試、真實家庭觀察、正式資料 read-back 與實體裝置驗證分開報告。
- 變更完成後依現有政策 commit／push；若包含 migration／Edge Function，依專案規範部署並確認正式結果，不能以本地測試代替。

## Review focus

1. 結構化、多空格答案的有效作答單位不可漏算，空白值不可算完成。
2. 純閱讀不自動宣稱完成；完成任務與答對／學會分離。
3. 儲存失敗、衝突、斷線、跨裝置不丟草稿或誤報同步成功。
4. 舊教材位置失效、已提交、全部題目填完仍可回看，不自動提交。
5. 觀察窗未成熟、未交付、失聯、紙本與內部測試資料正確分層。

## 任務 1：建立可解讀的留存基線（P0）

修改：`docs/operations/material-learning-signals.sql`。
新增：`docs/operations/learning-retention-pilot.md`，只放定義、空白記錄格式與匿名彙總規範，不放個別家庭資料。
讀取：`docs/SPEC.md` §§24、29、168–171、204；現行事件、job、material、snapshot schema。

- [ ] 確認首次教材可用時間與實際 canonical sequence；排除內部帳號，保留 unknown 分組。
- [ ] 按設計文件實作 48h、7d、28d 成熟 cohort 查詢。48h 分母須滿觀察窗，28d 第二份使用率不能只分母取已請求第二份者。
- [ ] 同時輸出人數、分母、pending、缺失事件與交付狀態，分開紙本自述。
- [ ] 用合成邊界資料驗證：剛發布 1 小時、48h 邊界、未交付、兩個 UTC 日期但相距幾分鐘、第二份未生成、內部帳號。日期代理指標不能命名為獨立 session。
- [ ] 在可用且已授權的正式唯讀環境產生匿名基線；若無權限，交付查詢並明確標示基線未取得，不填推估值。

驗收：能區分交付、首次作答、回訪與第二份使用；報表不包含個別孩子答案或識別資料。

## 任務 2：修正現有分段狀態與下一步（P1，首輪主要修改）

修改：
- `apps/web/src/lib/material-session-plan.ts` 及 `.test.ts`
- `apps/web/src/components/materials/renderer/LearningStartPanel.tsx`
- `apps/web/src/components/materials/renderer/PaperReader.tsx` 及 `.test.tsx`

相關規格：§§8、87、113、179、183–184、194、204、210。

- [ ] 查明所有學生投影題型與既有答案 adapter，沿用實際 response unit 映射，不另猜 ID 規則。
- [ ] 將分段狀態明確表示為 `not_started | in_progress | answered | untracked`。`answered` 只表示所有必要作答單位非空；純閱讀預設 `untracked`，不自動顯示勾選。若加入閱讀確認，另列自述狀態。
- [ ] 更新既有 `getCurrentStep` 或同檔共用推導，讓主行動指向未完成有效任務。全部已作答時回傳可回顧狀態，不退回假裝尚未完成的最後一段。
- [ ] 面板不再固定使用 `plan.steps[0]`。未開始、部分作答、已填完未提交、已提交分別顯示正確主行動。
- [ ] 檢查只有 homework 時的題目分派，避免第一段與第三段重複要求同一題；可回顧但不得重複算未完成工作量。
- [ ] 實作後補 focused tests：傳統題、結構化 response units、空白、無題目、缺章節、homework-only、全填完、已提交。

驗收：回訪不必重新找進度；沒有把填完等同答對，也沒有更動提交與配額。

## 任務 3：讓暫停與接續可信（P1）

修改：`apps/web/src/components/materials/renderer/PaperReader.tsx`、`LearningSessionNav.tsx`；`apps/web/src/hooks/use-material-learning-navigation.ts`；必要時修改 `apps/web/src/lib/material-learning-navigation.ts` 及既有測試。
整合檢查：`apps/web/src/components/dashboard/WeeklyLearningPanel.tsx`、`apps/web/src/components/materials/MaterialActions.tsx`。

- [ ] 沿用導航 RPC 與版本衝突機制，確認保存位置屬於目前教材的有效章節／題目。
- [ ] 在實際作答互動與暫停時更新有意義的位置；如使用 viewport 訊號僅作位置，不推論閱讀完成。節流寫入，避免每次捲動發 RPC。
- [ ] 暫停時先處理未保存狀態；失敗保留草稿並提供重試，不用成功文案掩蓋錯誤。不得盲目覆寫較新跨裝置版本。
- [ ] dashboard 與 reader 使用一致資料；不要為了按鈕再建立不同的進度計算規則。
- [ ] 驗證儲存中離開、失敗重試、衝突、重整、再次登入、兩個瀏覽器 context、失效題目 ID、已提交只讀。
- [ ] 執行桌面與行動尺寸真實點擊、填答、暫停、重新進入並保存截圖。合成資料截圖標示 synthetic；需要正式登入與實體手機驗證時另列結果。

驗收：成功保存後能接續；失敗時使用者知道尚未同步且不丟輸入。

## 任務 4：由觀察決定是否修登入或工作量（條件式 P1）

**4A 登入交接**：只有確認 scoped email → 作答流程流失時執行。

候選檔：`apps/web/src/routes/ScopedMaterialPage.tsx` 及現行 auth callback／安全 return-path helper（實作前定位，不預設另建一套）。

- [ ] 增加清楚的「登入後繼續這份教材」入口，沿用驗證過的站內 return path。
- [ ] 登入後重新檢查 owner；其他家長、失效 token、外部 return URL、不同孩子與登出狀態均需測試。
- [ ] 保留預覽 token 唯讀邊界，不把 token 當家長 session 或作答授權。

**4B 工作量**：只有觀察或障礙回報支持「太長／安排不了」時執行。

候選檔：`apps/web/src/lib/profile-form.ts`、現行 profile AboutStep 及相關測試。

- [ ] 先讓家庭明確看到與選擇目前每週時間；不默默改既有家庭 90 分鐘設定。
- [ ] 預設值變更需記錄產品理由，遵守現有 30–240 分鐘範圍；分次安排與整週總量分開說明。
- [ ] 更新只影響後續未建立的生成快照，不改已 claim 或已發布教材；若涉及生成規則則另走 production release policy。

驗收：可觀察到相關障礙減少；不能只以設定儲存成功宣稱留存改善。

## 任務 5：修正會誤導決策的漏斗（P2，可獨立交付）

候選修改：`apps/admin/src/components/funnel/landing-first-funnel.ts` 與測試、`apps/admin/src/server/landing-funnel-admin-service.ts`；首頁 CTA 元件先搜尋 `trackFreeTrialClick` 呼叫位置再補缺漏。

- [ ] 可選 sample click 呈現為分支，不把它當主路徑 CTA 的必經分母。
- [ ] 檢查各主要 CTA 追蹤一致，避免重複事件；瀏覽器事件與 server-authoritative 事件保持來源區分。
- [ ] 合成測試 100 landing／10 sample／80 CTA：不得呈現 CTA 轉換 800% 或把試閱跳過判為主要流失。

驗收：不同事件群無可靠串接時標示描述性計數，不能畫出假的個人連續漏斗。

## 任務 6：完成兩批真人觀察與決策（產品驗證）

文件：任務 1 的 `docs/operations/learning-retention-pilot.md`。

- [ ] 先填寫基線、版本、觀察窗、招募來源、排除條件、支援上限、停止規則，再開始觀察。
- [ ] 招募或外寄前取得對應授權與家庭同意；計畫本身不代表已聯絡家庭。
- [ ] 分別記錄家長操作與孩子實際作答，保留未完成家庭；只保存必要私有資料。
- [ ] 每批約 10 家庭觀察 28 日，依設計停止規則調整。不同版本分批報告，不宣稱小樣本統計顯著。
- [ ] 詢問家長能否用自己的話說出「孩子做到哪、卡在哪、下次做什麼」，記錄人工協助分鐘。
- [ ] 產出繼續、修正或停止的決策與依據。若高度依賴人工催促，不直接擴大投放。

驗收：有實際家庭證據與成熟觀察窗，不能以自動化瀏覽器通過代替真人留存。

## 後續候選：跨份進步證據（通過留存門檻後另立實作範圍）

讀取：`apps/web/src/components/dashboard/MaterialEvidenceCard.tsx`、`apps/web/src/lib/learning-library.ts`、當前 evidence／submission migrations；§§46–52、113、181、194、205。

先審核跨份技能與題目可比性，規劃 owner-only 只讀比較介面，輸出題數、日期、協助與不足證據。不得把 packet-local target ID 直接 join 為技能、不覆寫 mastery、不把看過答案的重做當獨立新題進步。若需 sidecar schema 或生成更新，另寫 migration／RLS／歷史相容與完整發布計畫後執行。本輪不先建這套系統。

## 驗證與交付清單

- [ ] 依實際變更跑 focused tests；前端共用狀態變動後跑 `pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build`。
- [ ] 若涉及 SQL／RLS，執行相應 `pnpm test:db`；UI 使用既有 `pnpm test:e2e` 與上述操作情境。工具或網路不可用時記錄阻礙，不宣稱通過。
- [ ] 取得桌面／行動尺寸截圖與操作結果，說明是否 synthetic、staging、production、實體裝置。
- [ ] 檢查 git diff，只交付本次任務；commit／push 後分別記錄 CI、部署與正式 read-back 狀態。
- [ ] 若有生成版本變更，完整遵循 `docs/production-release-policy.md`；未完成相容驗證不啟用新 claims。

建議排程：先做任務 1–3，再依資料選任務 4；任務 5 可獨立修正；任務 6 需要完整觀察時間。工程工作天數要在確認現行測試與 auth adapter 後估算，28 日觀察不可用加速測試縮短。
