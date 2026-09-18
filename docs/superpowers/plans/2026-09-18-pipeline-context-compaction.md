# Pipeline Context Compaction Implementation Plan

**Implementation update (2026-09-18):** 使用者已要求 Implement。已交付第一批的確定性 JSON 去重、逐次還原驗證、adapter 整合及前後量測；詳見 [實作與驗證紀錄](../../evaluations/2026-09-18-context-presentation.md)。後續另完成 [stage-aware bundle 離線候選](../../evaluations/2026-09-18-stage-aware-bundle-candidate.md)：正常 Author 候選縮減 18.02%，repair 候選縮減 12.31%，保留完整 schema、共同規則、Author 與 Critic，且未接入 runtime。下方「本次只規劃」描述原始規劃回合。Task 4 的配對模型品質實驗仍未執行，不以決定性保留測試宣稱教學效果等價。

**Goal:** 減少課程產生各階段的重複 context，同時保留全部重要教學語義、來源證據及修補能力。

**Architecture:** 保留原始 claim、bundle 與研究證據；在模型輸入邊界產生可追溯的精簡視圖。先做確定性的同值去重，再評估規則集中及階段分流，禁止用自由摘要代替唯一證據。

**Tech Stack:** 現有 TypeScript prompt builders、CAP selective assembler、Vitest。

**Spec:** `docs/SPEC.md` §39、51–52、64–65、72、74–75、113、118、129、132、180–181、193–194、199、204–205、210；`docs/eng-tutor-upstream.md`。

## 本次範圍與證據

- 使用者最後要求先規劃。本次只新增此方案，不實作、不部署、不改版本。
- 已先執行 `git pull --ff-only`，main 從 `e135080` 更新至 `f2ce9e3`；pull 前工作樹乾淨。
- 以下是目前 checkout 的程式觀察，不是 production 執行、token 用量或學習成效測量。
- 不呼叫 claim、不讀真實學生資料、不改排程、publication routing、資料庫或 renderer。
- 採直接實作後 focused verification 的既有偏好，不要求 TDD 或額外設計審批。

## 已存在的 compact，不重做也不重算成果

1. `selective-bundle-assembler.ts` 已用實際檢索的 CAP cards 取代全量 routing index。
2. `cap-retrieval.ts` 已跨題去重 cards；`perItemPrecedents` 是 intent/ref 映射，並沒有再次放完整 cards。
3. `authoring-context.ts` 已刪除相同 failure findings、相同 recentDeliveryMemory，以及被新候選取代的 previousCanonicalPackage。
4. 模型視圖已移除 bundle source hashes 與特定舊版 conversion implementation，原始 bundle 保留。
5. Prompt 2.14.1 已是 consolidated suite，不能再把移除歷史 overlays 當作本次的新改善。

## 現況與主要候選

目前磁碟上的 `production-authoring-bundle.md` 為 **92,547 字元**；其中 Schema 區塊 **32,257 字元**。這是原始本地 artifact 的大小，不含動態 cards、學生 context、grounding、candidate 或工具訊息，也不是模型實際收到的 token 數。

`local-codex-authoring.ts::authoringPrompt` 每輪傳入經既有 compact 的整個 bundle、claimed context、完整 public grounding；修補時再加入最新 candidate 及 findings。

主要可調查的重複：

- Product rules、quality rubric、CAP contract、Plan/Author/Critic/Repair 對同一教學原則的重述。
- `packetPlan.assessmentPlans` 與 `perItemPrecedents.intent` 的部分共同欄位；只有確認語義和值相同才可合併，adapted intent 可能帶額外資訊。
- Packet planner 同時接收原始 evidence/capsules 與 resolvedEvidence；後者不一定能取代前者，必須逐欄證明。
- 研究候選比較與最終授課 facts 在後續輪次重複傳遞。來源、日期、限定條件及選擇理由不能刪。
- Author 與 repair 共用完整 prompt；但目前 runner 並未顯示獨立的 Critic process call，不能直接裁掉 Critic 規則並假設稍後一定有人執行。

## 不可丟失的語義清單

| 項目 | 每次交接必須保留 |
| --- | --- |
| 年齡與程度 | 已提供的年齡／年級、語言程度、支持需求及各自來源；未知維持未知，年級不當作精確年齡 |
| 時間與回饋 | weekly_minutes、真實工作量；具體回饋及適用範圍、錯誤、學校進度、證據時間與可信度；保留本週選擇理由 |
| 學習連續性 | 已教不等於不會、複習不等於新學；文法推進及有證據的回頭修補；不把舊證據當現況 |
| 具體興趣 | 人物／作品／角色／活動的實際名稱、要探索的問題、與學習目標的連結；禁止只剩「音樂」「科學」 |
| 必須研究 | 真實研究先於撰寫；source URL/ID、fact、claim、原文位置、日期、範圍／限制、未知與衝突；evergreen 也要 grounding |
| 時效性 | event date 與 publishedAt 分開；current 的 freshness 證據；不強迫選新聞，保留 evergreen fallback 的理由 |
| CAP | 逐題 skill、語言難度、認知深度、evidence scope/anchors、precedent refs、權威來源、noPrecedentReason；CAP 是下限而非版型 |
| 多樣性 | 主題、切入角度、opening、教學方式、推理操作及作答形式的近期紀錄／coverage；變化服務學習，合理重用不算失敗 |
| 自學與答案 | 先教後考、必要例子與支架、隱藏詞彙負擔、上下文中的 retrieval、題答完整對應及足夠作答空間 |
| 安全與修補 | 私密資料不進公開研究；來源版權；critical findings、latest candidate、依賴關係；claim fingerprint 和原始契約不变 |

原則：可以集中一次、以 ID 引用；不能只留 ID 卻讓目前模型無法取得定義。不同模型呼叫仍須收到其必要規則，不能依賴上一個模型的記憶。

## 預計的 context 分工

| 階段 | 精簡輸入 | 交接輸出 |
| --- | --- | --- |
| 私密興趣篩選 | 公開興趣名稱候選與隱私規則 | 已篩選的 public research brief |
| 公開研究 | brief、來源／時效／版權規則，無學生資料 | 候選比較、來源與 propositions、日期、限定條件、不確定性 |
| 私密規劃 | learner evidence、時間、近期學習與格式紀錄、研究證據 | 目標、角度、理由、逐題 intents、格式／支架、研究引用 |
| CAP retrieval | 逐題 intent | 去重 cards + item-to-ref 映射 |
| Author | 完整必要教學約束、learner evidence、plan、grounding、cards、完整合法輸出契約 | canonical candidate 與必要內部證據 |
| Critic review | learner constraints、candidate、來源與 plan、檢查規則 | 具體 findings 及受影響 ID；保留現有實際執行方式 |
| Repair | 最新 candidate 一份、findings、相關證據與全部依賴、必要規則 | 完整修正 candidate；重驗題答／grounding／CAP 關聯 |

這張表是資訊責任分配，不代表新增模型呼叫。只有確認 runner 的實際 review 邊界後，才考慮抽出獨立階段；本次不擴大成 pipeline 重建。

## Task 1 — 建立當前基準及語義對照

**Files:** `packages/generator/scripts/run-context-compaction-benchmark.ts`、`packages/worker/src/local-codex-authoring.ts`；新增本次日期的 sizing report，避免覆寫舊 release 報告。

- [ ] 以目前 prompt builders 的相同輸入建立 before/after；涵蓋正常、planner repair、author repair，不假定每次都修補。
- [ ] 分別記錄 bundle、rules、schema、cards、learner state、grounding、candidate、findings 的 chars/UTF-8 bytes；能取得 provider usage 才另記 tokens。
- [ ] 對上述不可丟失項目建立 source path → stage → output evidence 對照。每項定義責任及依賴，不只檢查 prompt 含某個關鍵字。
- [ ] Synthetic fixtures 明確標示為測試資料；不得把 fixture grounding 當已驗證研究。

**完成條件:** 能說明每項資訊在哪裡、何時需要及如何驗證；未測量的部分清楚列出。

## Task 2 — 先做同值去重與無損交接

**Files:** `packages/worker/src/authoring-context.ts`、`authoring-context.test.ts`、`local-codex-authoring.ts`、`local-codex-authoring.test.ts`、`packet-planning.ts` 與其現有測試。

- [ ] 從已確認的重複開始；未知欄位預設保留，缺欄位不以空值覆蓋；相似但不同內容不去重。
- [ ] 同一 item 的 plan/intent 可建立一次完整資料及引用，但不能丟掉 adapt 後的獨有資訊、refs 或 noPrecedentReason。
- [ ] 保留 compact source map 供診斷；不把整份 source map 再塞給模型。
- [ ] 原始 claim object、fingerprint、bundle bytes 不變；模型呈現與可審計原件分離。
- [ ] 保留最新候選一份及完整 findings；若 repair 缺少必要依賴，回到完整視圖，不截字數硬塞。

**完成條件:** 深度比較原始輸入未被修改；來源引用可解析；唯一證據零遺漏；同值去重、不同值保留、缺失值、unknown history、retry/newer candidate 均有行為驗證。

## Task 3 — 再集中規則，最後才考慮 schema

**Files to inspect:** `packages/generator/src/bundle-compiler.ts`、`selective-bundle-assembler.ts`、`packages/generator/prompts/2.14.1/*.md`、`docs/product-rules.md`、`docs/curriculum-quality-rubric.md`、`packages/generator/curriculum/interest-exploration.md`、`cap-precedent-contract.md`。

- [ ] 將每條現有規則分成共同不變量與 stage-specific 動作，逐條保留原本的條件、例外、強弱程度及檢查責任。
- [ ] 集中相同原則，保留角色差異：Author「如何寫」、Critic「如何找錯」、Repair「如何修依賴」不是重複垃圾。
- [ ] 開頭提供短且明確的本週 learner constraints；不要在正文末尾再複製一份完整規則。短索引是導航，不取代細節。
- [ ] 不先裁 schema。若評估精簡型別呈現，須完整保留必填／選填、enum、union、nested shape、條件與跨欄位約束，並以實際 validators 驗證。禁止只給單一 example JSON 令模型失去其他合法形式。
- [ ] 不用正則任意刪章節：bundle 中的 stage 內也有重複數字 heading，應使用明確結構或唯一邊界。

**完成條件:** 每條原規則映射到保留位置；具體條件及例外沒有弱化，Critic 責任不消失。此階段先形成候選及比較，不直接覆寫 activated bundle。

## Task 4 — 證明縮量沒有以品質換取

**Tests:** 擴充現有 compaction、packet planning、selective bundle、local authoring tests；必要時新增 `context-compaction-fidelity.test.ts`。

- [ ] 決定性案例：不同年級但同程度、最新回饋要求複習、時間縮短、明確人物興趣、current/evergreen、來源限定条件衝突、缺失格式歷史、合理格式重用、多題共用 CAP ref、跨欄位 repair。
- [ ] 比較前後完整語義欄位、ref resolution、CAP union、immutable identity；移除一項關鍵證據時，測試必須能辨識遺漏。
- [ ] 使用相同模型設定與配對輸入進行教學審查，檢查年齡、時間、回饋、興趣、研究、CAP、多樣性、自學與答案。固定 fixtures 能證明保留資料，不能證明模型教學品質等價。
- [ ] 品質與 critical findings 不退步才接受縮量；report 寫實測比例及例外，不先承諾固定百分比，不以字元下降宣稱 information loss 已消除。

Focused verification（實作後依實際新增檔案補入）：

```powershell
pnpm exec vitest run packages/worker/src/authoring-context.test.ts packages/worker/src/local-codex-authoring.test.ts packages/worker/src/packet-planning.test.ts packages/generator/src/selective-bundle-assembler.test.ts
pnpm --filter @paper-english/worker typecheck
pnpm --filter @paper-english/generator typecheck
```

若觸及 schema 呈現或 canonical output，再執行對應 validator tests 與 `pnpm generate:synthetic`；不以 PDF 渲染通過代表教學語義通過。

## 版本維持不變的實際邊界

尊重使用者本次不更新版本的要求。本方案與離線量測可以不改版本；pipeline 呈現層是否能保持同一版本，需要依具體修改判斷，不能僅以「只改內容」保證相容。

既有 `docs/production-release-policy.md`／SPEC §129 要求 activated prompt/bundle immutable。使用者可以要求調整此工作流程，但技術上直接改原始 bundle bytes 仍會改變 SHA-256，現有 claim/hash verifier 可能拒絕；覆寫 hash 又會破壞既有 claim 的契約。

因此實作優先順序是：基準 → 不改原始 artifact 的呈現去重 → 完整驗證 → 再評估規則／schema 縮寫。任何維持版本的 runtime 改動仍須記錄 source revision、原始 bundle hash、presentation hash 與 adapter 行為，以便重現；不假稱版本相同就表示生成行為完全相同。若無法在現有 hash／claim 機制下安全保持版本，保留候選離線，不偷改啟用中的 artifact，也不擅自升版。

## 待驗證而非既定結論

- 實際整段 lifecycle 的 token 節省量與品質影響尚未測量。
- online/manual/scheduled/Week 1 的輸入裝配是否一致需逐 adapter 檢查；本地 builder 的改善不代表所有路徑受益。
- 當前 SPEC §193/199 與 §205 對 Week 1 processor 描述存在差異；本方案不動該邊界，不把其中一種描述寫進 compact 教學核心。
- 評估集中規則時，先辨識 workload hard gate 與 warning-only 敘述的既有差異；壓縮不能自行解決政策衝突或把建議升格為硬規則。

**建議第一批交付:** Task 1 + Task 2。先取得可量測、可追溯且不改 canonical schema/bundle 的收益，再決定 Task 3 值不值得做。
