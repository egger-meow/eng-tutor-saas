# 家長學習啟動與續用 Implementation Plan

**狀態：** 計畫，尚未實作。2026-10-04。

**Goal:** 修復首次使用與歷史紙本續用，讓家庭可以短時間開始、分次接續、看見可信證據，再明確申請下一份。

**Architecture:** 沿用 parent account、授權學生投影、autosaved drafts、不可變 submission 與既有 feedback/request RPC。新功能只增加學習導航、家長安全摘要、結構化阻礙回報與必要觀測；不改 canonical package、生成配額或發布流程。

**Tech stack:** 現有 TypeScript/React web、Supabase SQL/RPC、worker Email、Vitest 與 repository E2E/DB scripts；不增加套件。

**Spec:** `docs/SPEC.md` §§8,24,26,44,72–73,80,83–84,87,109–113,116,160,168–171,179,183–184,194,200,204–205,210。

**執行方式：** 依本計畫逐項直接實作，之後補必要回歸測試並驗證；依使用者規則不採TDD。本次只交付計畫，不授權執行產品變更。

## 決定與範圍

- 家長仍是唯一登入與擁有者；所有新RPC驗證 owned child/material、release與資料最小化。
- 整份提交才能看新教材解答；部分作答有效、未答不算錯；提交後作答不可改，但閱讀/TTS可用。
- 歷史 `answer_unlock_requires_submission=false` 的紙本feedback維持原本 atomic request path；新線上回饋選填、下一份是獨立明確動作。
- 每服務月最多4份，next request冪等；不因開始10分鐘、暫停、完成分次或提醒產生job。
- 「10分鐘」是建議時間盒，不承諾全文或整份能在10分鐘完成，不減少既有教材工作量，也不改weekly_minutes預設。
- 第一版不做AI新摘要、不新增提示生成、不改generator/schema/release版本、不回填歷史學習證據。
- 提醒採站內低頻卡片與現有「教材ready」信件文案。定時Email/SMS/LINE召回不在這輪，避免先增加通知系統。
- 阻礙回報不當作difficulty/completion/feedback，不會自動更改下一份內容或申請。家長需主動修改設定／填學習回饋。
- 新產品規則同步更新SPEC與必要指引；不用新增獨立設計spec。§24、116尚有固定週期舊文字，按§113及現行權威RPC校正相關段落，不改backend cadence。

## 交付順序與估算

| 階段 | 可獨立上線的成果 | 相依 | 預估工程日* |
|---|---|---|---:|
| A | 首次設定、紙本回報、可信文字與指引修正 | 無 | 2–3 |
| B | 開始10分鐘＋同份教材分次／跨裝置接續 | A | 3–4 |
| C | 真實證據＋下一份調整卡 | A；使用B的導航 | 2–3 |
| D | 結果頂端下一步、一鍵阻礙、站內提醒與通知信 | A–C | 2–3 |
| E | 整合、production read-back、手機驗收、cohort指標 | 各階段 | 1–2 |

*合計約10–15工程日，為單人實作粗估，不是交付承諾；小批家庭觀察另需14–21日。每階段先保證可用，再向後推進。

## Review focus

1. 歷史紙本、歷史線上草稿、新提交gate必須按權威flag與submission分流，不能靠日期或是否已有feedback猜測。
2. 多孩子、多裝置、版本衝突不得導致接續位置或證據串到另一份教材。
3. 初次只做兩題後「暫停」不能被理解為提交；儲存失敗不得說已保存。
4. 無submission、open_review、未答、紙本自報不得被包裝成自動評分或精熟。
5. 網路失敗、配額滿、無權益、重複點擊、next job失敗須保留真實狀態；提醒不得重新建立job。

## Task 1 — 修正首次使用與紙本相容（優先事項1）

**修改：**
- `apps/web/src/components/onboarding/steps/AboutStep.tsx`
- `apps/web/src/components/auth/LandingOnboardingPanel.tsx`
- `apps/web/src/components/dashboard/WeeklyLearningPanel.tsx`
- `apps/web/src/components/materials/MaterialHistoryItem.tsx`
- `apps/web/src/routes/FeedbackPage.tsx`
- `apps/web/src/components/dashboard/LearningJourneySummary.tsx`
- `apps/web/src/components/dashboard/LearningJourneyTimeline.tsx`
- `apps/web/src/routes/ParentGuideFeedbackPage.tsx`, `TermsPage.tsx`
- `docs/SPEC.md` 相關舊cadence與學習歷程文字。

**決定：**
- [ ] 移除程度radio選取後自動前進，統一透過現有「選好了，繼續」驗證最新draft；選取後仍可鍵盤操作。這比timer依賴舊closure穩定，也讓選擇可反悔。
- [ ] 用material的權威answer gate分流：歷史paper path可直接開原FeedbackForm，無feedback也可；submission path導向結果/選填回饋。0%歷史回報只保存，不建立下一份；修改原feedback冪等。
- [ ] 將snapshot `totalWeeks` 顯示為「已記錄X份教材設計」，先不宣稱是已完成或所有歷史教材總數；`improvements`改標「本份教材調整」。日期明確標「設計記錄日期」，不冒稱學習日期。
- [ ] 指引分「線上」與「紙筆」短流程，說清楚暫存、不可變提交、未答、解答、選填回饋及主動申請。
- [ ] 校正terms與SPEC相關產品描述：網頁與PDF、主動申請、每服务月4份、rolling14day100位及永久pilot cutover。法律效果不在此計畫宣稱。

**驗證（實作後）：**
- 擴充 `LandingOnboardingPanel.test.tsx`：第一次選程度再按繼續能到第二步，空白暱稱仍被擋，radio可改選。
- 擴充 `MaterialPages.test.tsx`／新增 `WeeklyLearningPanel.test.tsx`：gatefalse且無feedback可回報；gatetrue未submit仍不可繞過；歷史0%及重複回報在DB測試證明。
- 更新 `LearningJourneyTimeline.test.tsx`、`LearningJourneyPanel.test.tsx` 驗證用語不宣稱完成/精熟。
- 正式窄版與桌面截圖：初次設定、歷史回報、新gate回報引導。

**完成：** 舊家長不需偽造線上submission即可按原規則續用；前端修復不能依賴降低server gate。

## Task 2 — 第一次10分鐘（優先事項2）

**新增：**
- `apps/web/src/lib/material-session-plan.ts` 與 `.test.ts`
- `apps/web/src/components/materials/renderer/LearningStartPanel.tsx`

**修改：** `PaperReader.tsx`、`StudentLessonRenderer.tsx`、`styles/paper-reader.css`、`MaterialLearningStatus.tsx`。

**介面：**
`buildMaterialSessionPlan(lesson: StudentLesson): MaterialSessionPlan`

`MaterialSessionPlan = { firstStep: string; steps: Array<{ id: string; label: string; chapterId: string; questionIds: string[] }> }`

返回的是導航順序，沒有答案、分數、生成配額或精熟判定。

**決定：**
- [ ] 建立最多三個建議階段：①先讀／先試，②理解與練習，③複習與作業。只引用既有章節與stable question IDs，缺少某章節時省略，沒有reading時落到現有opening/practice。
- [ ] 首次panel文案：「今天先安排約10分鐘。先讀這一段，再試前兩題；時間到了可以先停，之後繼續。」只有一題則只引導一題；若沒有題目，只引導閱讀並不記錄作答。
- [ ] 「先讀這一段」跳現有reading；「試前兩題」引用practice中前兩個現存question ID。第一版不判斷兩題足夠診斷、不裁切文章生成新內容。
- [ ] 「先停，之後繼續」只確認草稿保存並離開／返回dashboard；未保存、衝突時沿用retry/conflict流程，不直接離開。
- [ ] 提交按鈕保留明確文案「確認提交這次整份作答」，確認對話列已答/未答數與不可修改說明；不以完成第一階段觸發提交。

**驗證：** `material-session-plan.test.ts`涵蓋完整/缺reading/無題目/只有一題/不明章節；`PaperReader.test.tsx`驗證暫停無submit RPC、保存error不能說已保存、提交後可閱讀/TTS。

**完成：** 新家長不需看長指南即可開始；所有建議都從合法student projection取得。

## Task 3 — 分次與跨裝置接續（優先事項3）

**新增：**
- `supabase/migrations/<execution-timestamp>_material_learning_navigation.sql`
- `supabase/tests/material-learning-navigation.sql`
- `apps/web/src/lib/material-learning-navigation.ts`
- `apps/web/src/hooks/use-material-learning-navigation.ts`
- `apps/web/src/components/materials/renderer/LearningSessionNav.tsx`

**修改：** `PaperReader.tsx`、`MaterialLearningStatus.tsx`、`MaterialActions.tsx`；沿用draft hook，不改answer儲存語意。

**資料／介面（新名稱是本計畫定義）：**
- `material_learning_navigation`：material_id PK/FK、chapter_id固定allowlist、question_id nullable、version、updated_at。只存位置，不存新answer副本、百分比或完成狀態。
- `get_material_learning_navigation(p_material_id uuid)`：owner/release檢查後回傳位置，null代表首次。
- `save_material_learning_navigation(p_material_id uuid,p_chapter_id text,p_question_id text,p_client_version bigint)`：optimistic version，返回saved/conflict/current position；chapter allowlist與question存在性由server依合法材料驗證。新table禁止直接client讀寫，RPC最小權限。
- `material_learning_day_signals`：material_id、UTC date、固定 signal `answer_changed`，三者PK；由成功draft-save的transaction／trigger在answer實際改變時寫入。排除internal_test；不存答案、IP、URL；90日保留且沿用既有purge入口清理。

**決定：**
- [ ] 只有明確章節跳轉／题目操作保存接續位置，不記每次scroll。位置儲存失敗不阻塞閱讀或answer save，但不得假稱跨裝置已保存。
- [ ] 重入顯示「接續上次位置」按鈕，由家長/孩子點擊後跳轉，不自動把頁面拉到深處；找不到舊question時落到章節，找不到章節時回opening/read。
- [ ] 導航冲突採最新server位置並提示可重新選擇，不覆蓋其他裝置的新位置；answer冲突仍按既有流程處理。
- [ ] 已submit只能導航、閱讀、TTS，不開answer controls；siblings/material ID切換清空本地navigation state。
- [ ] dashboard主要CTA沿用「查看／繼續本週教材」；下方以「草稿已保存」「已提交」「已申請」等權威狀態說明，不顯示虛構完成率。
- [ ] 新day signal只度量不同日期有answer變動，命名「跨日作答接續」；不冒稱session數、閱讀時數或有效學習。reading-only使用先由觀察訪談驗證。

**驗證：** DB owner/sibling/anon/unreleased拒絕、valid/invalid question、版本衝突；相同answer重存不新增day signal、跨日保存獨立計數、internal排除；UI重入/位置fallback/submit後navigation/網路失敗。

**完成：** 換裝置仍能回到位置且不覆寫答案；不把分次導航當成學習成果。

## Task 4 — 真實證據與下份調整（優先事項4）

**新增：**
- `supabase/migrations/<execution-timestamp>_parent_material_evidence_summary.sql`
- `supabase/tests/parent-material-evidence-summary.sql`
- `apps/web/src/lib/parent-material-evidence.ts` 與 `.test.ts`
- `apps/web/src/components/dashboard/MaterialEvidenceCard.tsx` 與 `.test.tsx`

**修改：** `WeeklyLearningPanel.tsx`、`LearningJourneyTimeline.tsx`、`LearningJourneySummary.tsx`。

**權威RPC：** `get_parent_material_evidence_summary(p_material_id uuid)` 返回parent-safe DTO：
- `source`: `student_submission | parent_report | none`
- `submittedAt` nullable、`objectiveCorrect`、`objectiveIncorrect`、`unanswered`、`openReview`
- `reportedCompletionRate` nullable（紙本自報），不得映射成正確率。
- `adjustmentNotes: string[]`：沿用owner-safe generation summary，最多3項既有文字，不暴露internal evidence/canonical JSON。
- `targets: Array<{ label: string; state: 'needs_review' | 'observed_correct' | 'ungraded' }>`：只有existing權威skill attribution已知時才顯示；unknown不猜，不從prompt文字推skill。缺少可靠關聯時只顯示題目/總數與「尚無足夠能力證據」。

**決定：**
- [ ] UI分「這次的作答／家長回報」與「這份教材為什麼調整」。未產生下一份時標「申請後依這次證據設計」，不能預告已調整或保證效果。
- [ ] 未答獨立、開放題未評分；不使用總題數當正確率分母，不宣稱完成即可精熟。
- [ ] 無證據顯示「目前只有教材設計記錄，尚無提交作答或家長回報」，給回到教材/紙本回報CTA。
- [ ] submission與feedback並存時以submission客觀結果為主，家長觀察另標來源，不覆蓋結果。
- [ ] task1保留的snapshot設計歷程與這張實際證據卡分開呈現；不回填或修改historical snapshots。

**驗證：** submitted部分完成/全部未答/open_review/unknown skill、paper report/0%、無資料、owner與sibling isolation。UI用實際DTO測試，不靠字串猜測私有內容。

**完成：** 家長能分辨「孩子做了什麼」與「教材做了什麼調整」。

## Task 5 — 清楚下一步、阻礙回報與安靜提醒（優先事項5）

**新增：**
- `apps/web/src/components/materials/renderer/MaterialNextStepPanel.tsx` 與 `.test.tsx`
- `apps/web/src/components/dashboard/LearningBarrierCard.tsx` 與 `.test.tsx`
- `apps/web/src/lib/material-learning-checkin.ts`
- `supabase/migrations/<execution-timestamp>_material_learning_checkins.sql`
- `supabase/tests/material-learning-checkins.sql`

**修改：** `PaperReader.tsx`、`WeeklyLearningPanel.tsx`、`packages/worker/src/material-email.ts`與`.test.ts`。

**資料／介面：**
- `material_learning_checkins`：material_id PK、固定barrier nullable、`paper_started_at` nullable、`dismissed_until` nullable、updated_at。僅owner RPC存取，未公開學員名單。
- barrier enum：`no_time | cannot_print | too_hard | child_not_interested | missed_email`。只接受enum，沒有free text或任意metadata。
- `save_material_learning_checkin(p_material_id uuid,p_action text,p_barrier text default null)`：action固定`barrier | paper_started | dismiss`。paper_started只接受權威gatefalse之歷史紙本，重複確認不重寫first timestamp；dismiss以server時間設7日，不能由browser任意寫未來時間。
- checkin只供家長支持與聚合研究，不自動餵入generator，也不當正式feedback。

**下一步狀態表：**

| 權威狀態 | 主要動作 | 行為 |
|---|---|---|
| 無submission、新gate教材 | 開始／接續 | 導向task2/3，無request |
| 歷史paper、無feedback | 紙筆做過了，回報並申請 | 進原FeedbackForm；不建立空白submission |
| submitted、未requested | 申請下一份教材 | 呼叫既有request RPC，與「補充回饋（選填）」並列；直接申請即明確選擇略過，不造feedback |
| 正在編輯feedback | 保存回饋／略過並申請 | 保存失敗不得默默申請；要丟棄已修改表單時明確確認 |
| requested pending/claimed | 查看準備狀態 | 不再提供重複request；不承諾固定日期 |
| requested failed/canceled | 查看協助／聯絡支援 | 不用新request覆蓋失敗歷史 |
| quota/entitlement拒絕 | 顯示server拒絕原因 | 保留閱讀與結果；不自動導入付費 |

**決定：**
- [ ] 將next-step panel放在提交結果摘要頂端，逐題清單可展開；維持伺服器冪等與quota，不新建另一個request實作。
- [ ] 站內阻礙卡僅對ready後48小時、無answer_started/submission/paper_started之材料顯示；有已存草稿時改為「接續」，完成後改為「下一步」。過去48小時已存在的歷史材料不推斷未學，只用「還沒開始／已用紙筆開始」讓家長確認。
- [ ] barrier對應動作：沒時間→10分鐘；不能印→線上閱讀；太難→先讀/TTS＋可修改未來profile；不喜歡→編輯未來興趣；没看到信→直接開教材。無強制填答。
- [ ] 一張目前教材卡最多一個支持提示，可略過；dismiss後7日不重現，不跨不同孩子套用。既有started/submitted狀態更新後立即撤掉錯誤提示。
- [ ] 既有ready Email加入「今天先安排約10分鐘，可分次完成」與单一查看教材CTA；重用既有scope token、recipient與delivery冪等機制，不增加寄送頻率。不把紙本自報描述成線上完成。

**驗證：** 未submit不能request、skip不造feedback、双click只一份、quota4與entitlement拒絕；feedback保存失敗不request；checkin owner/released/gatefalse限制、paper自報來源、dismiss server時間；worker HTML安全escaping與既有重試/冪等測試。

**完成：** 已提交家長在結果頂端能看懂並申請下一份；阻礙回報是可選支持，不變成額外作業。

## Task 6 — 驗證、發布與留存觀測

- [ ] 更新SPEC §§160、168描述navigation、paper self-report、day signals與source標示；learning events既有首次去重不改成sessions，新的day signals單獨呈現。TOC只有標題新增/更名才改。
- [ ] 各task實作後跑指定Vitest檔案：`pnpm exec vitest run <相關.test.ts/.tsx>`；DB變更跑`pnpm test:db`，最後跑`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`及相關`pnpm test:e2e`。expected：exit0；若環境限制需具體記錄，不能稱已驗證。
- [ ] E2E使用本地/明確合成資料，不對真實家庭提交、申請、付款；涵蓋新客首次10分鐘→暫存→接續→部分提交→略過回饋→明確request，另測歷史paper flow。
- [ ] 截圖驗收360/390/768/desktop寬度；實體iPhone Safari與Android Chrome人工驗收另列，含鍵盤、長文、TTS、網路中斷與跨裝置衝突。工具縮放異常不能當產品證據。
- [ ] 每階段commit/push當前remote branch；migration依專案流程apply production並核對remote history、RPC權限和schema，worker改動按既有部署路徑發布與fresh read-back。先相容backend再deploy consumer，最後启用新UI。
- [ ] 新migration使用additive tables/RPC。若需要回退，先回退/關閉新增UI，保留已寫入資料；不用刪表、改歷史submission或重開job恢復。
- [ ] production讀回只用唯讀聚合與自有合成驗收帳號；正式舊家長寫入留给家長操作。记录commit、部署身份、screenshots及device邊界。

## 衡量方式

以首份實際ready時間為cohort起點，限定新上線後有足夠觀察期的真實新客；來源、紙本／線上分組，internal/demo排除。沒有新客時顯示「尚無可評估cohort」，不推斷新版失敗。

| 指標 | 可計算定義 | 限制 |
|---|---|---|
| 48小時啟動 | 48h內answer_started，或paper_started自報 | 第一題不代表完成；紙本自報另標 |
| 7日跨日作答接續 | 7d內至少兩個UTC日期answer_changed | 是跨日answer activity，非session數/學習成效 |
| 14/21日第二份啟動 | sequence2已ready且answer_started／paper self-report | 無sequence標unknown；第二份生成不算使用 |
| 環節品質 | 保存/提交/next request錯誤、歷史paper續用成功、等待時間 | 不把Email sent當read/print |
| 家庭體驗 | 5個新家庭觀察、6–8個舊流失家庭訪談 | 小樣本定性，不宣稱統計顯著 |

先比較行為與具體個案，不設定保證提升百分比。若更容易開始卻仍無第二次使用，下一輪檢查難度、內容與孩子意願；不直接擴大提醒。

## 範圍外及後續決策

- 定時召回Email：需要opt-in、偏好、quiet hours、退訂、發送上限、dedupe與outbox；有實際需求及初步家庭結果後另作小計畫。
- 30/45分鐘可見預設：需验证既有workload invariant及短容量適配，本輪不改學習量／generator規則。
- 新hint內容、AI聊天、打卡/點數、學生登入、月報與LINE bot不在本輪。
- Email登入後安全return-to路徑仍值得另修，但不與本輪新導航混成新Auth架構。

## 計畫自查

五項優先都有對應task；每個task有修改位置、介面、決定與驗收。backend新增以owner/release gate及additive兼容为界。session未冒稱成果，paper自報與submission分開，next request維持既有權威與配額。實際執行時先重新確認最新branch、SQL函式與production contract，不以本計畫取代fresh read-back。
