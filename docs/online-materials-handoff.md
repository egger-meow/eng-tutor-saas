# 線上教材改版交接與後續實作計畫

更新：2026-09-30。這是交接文件；後續階段尚未實作，不代表部署完成。

## 1. 新對話先知道的事

使用者已明確授權實作並接續各階段。不要重新詢問已定案的產品選擇，也不要重新做 S1/S2。先驗證現況，再完成下列階段；每階段交付可驗收的完整結果。

固定產品契約：
- 家長帳號管理孩子，不新增學生登入。
- 網頁是主要閱讀與作答介面，維持漂亮紙感、手機和平板相容。
- 整份提交後才顯示正解；可以部分完成後提交，未答不算錯。
- 提交後作答快照不可變；教材 canonical 也不可變。
- 家長回饋選填，不填不能製造假回饋；申請下一份是明確獨立動作。
- 每服務月 4 份，維持既有 entitlement、冪等與發布流程。
- 列印輸出只提供空白學生教材，不混入學生填答或解答。S2 暫保留家長解答 PDF 的相容入口，之後依這條產品契約整理下載/列印介面。
- 生成課程、網路取材、會考對齊與教材多樣性繼續保留。Week 1 使用既有 Fast Publisher；Week 2+ 使用既有 Finisher。

## 2. 已完成的程式與現況

- S1 schema：`44b48e5`。
- S1 閱讀器與草稿：`90d3514`。
- S1 安全與競爭修補：`d9c64a5`。
- S2 提交、評分、回饋與下一份：`840ea88`。
- 本次現場 `git status --short --branch`：`main...origin/main`，沒有變更；本機 HEAD 是 `840ea88`。這僅確認本機 tracking ref，不是即時 GitHub 證據。
- 即時 `git ls-remote origin refs/heads/main` 失敗：GitHub 443 經 `127.0.0.1` 連線失敗。不能據此說帳號或 repo 權限被撤銷。
- 先前曾有自動審核拒絕直接 push main，理由是當時共享預設分支發布授權不明確；不要規避拒絕。現在使用者提供的 AGENTS 明確規定完成驗證後 commit/push current branch。實際執行仍遵守工具審核；若再次拒絕，原樣回報理由。
- 沒有可靠的 production migration、Edge deployment 或實際手機/平板验收證據。不要把本地 PASS 說成已上線。

S2 已具備：伺服器讀草稿並鎖定提交、版本檢查、冪等提交、客觀題保守評分、未答/開放題狀態、提交後顯示正解、選填家長回饋、明確申請下一份、四份配額、新教材家長解答 PDF 提交門檻及 scoped token 防繞過。

重要入口：
- `supabase/migrations/20260929181512_student_material_submission_and_next_request.sql`
- `supabase/tests/student-material-projection.sql`
- `apps/web/src/lib/student-material-api.ts`
- `apps/web/src/components/materials/renderer/PaperReader.tsx`
- `apps/web/src/hooks/use-material-draft.ts`
- `apps/web/src/styles/paper-reader.css`
- `apps/web/src/components/materials/MaterialActions.tsx`
- `apps/web/src/routes/ScopedMaterialPage.tsx`
- `supabase/functions/material-access/index.ts`

前次驗證記錄：14 套 SQL 測試 PASS；4 個定向測試檔 34 案 PASS；typecheck/lint/build PASS。全量 Vitest、本次部署與裝置 UI 未驗證。Edge function 未做完整 Deno runtime 驗證。

## 3. S2 收尾：部署與完整流程驗收（最先做）

先讀完整 `docs/SPEC-TOC.md`，再讀 #83、#87、#109–116、#138、#144–153、#178–182、#198–199、#204，以及相關部署文件。檢查最新 Git 狀態與远端提交，避免覆蓋其他 agent 的工作。

實作/驗收工作：
1. 確认遠端是否已有 `840ea88`；網路可用後照 AGENTS 正常推送需要的提交，不 force push。
2. 審查 S2 migration 與 Edge runtime；核對所有答案取得入口、草稿/提交競爭、跨家庭、未發布教材與 quota。
3. 特別檢查 legacy feedback RPC 是否能繞過新教材提交流程；保留舊教材相容，但新教材若可繞過則在權威 RPC 修補。
4. 驗證客觀答案比對與所有題型的穩定 ID。部分完成/全空白提交目前沒有明確禁止；不要自行新增完成率門檻。
5. 測試實際 UI：讀取 → 填答 → 自動保存 → 提交確認 → 結果 → 選填/跳過回饋 → 申請下一份 → 重新整理。
6. 涵蓋慢網路、離線、雙分頁/雙裝置、保存中提交、重複點擊、quota 用盡、舊教材。
7. 提交後目前 lesson 使用 inert，可能連朗讀也停用；改成答案輸入唯讀，閱讀及朗讀仍可使用。
8. 推送完成後依 AGENTS apply pending production migrations、verify remote migration history、deploy `material-access` 並讀回部署證據；確認 web 部署使用正確 commit。

驗收：伺服器與真實 UI 都證明答案提交前不可取得、資料不漏存、提交不可重覆耗額、skip feedback 沒有假資料、舊教材可讀。手機和平板需記錄實際驗證；模擬 viewport 與真機驗證分別標示。若部署受阻，完成本地工作並留下具體 blocker。

## 4. S3：把學生表現接入下一份教材生成

這是目前最重要的缺口：S2 已儲存作答，但沒有把作答證據接進 authoring context。先讀 #46–52、#53–67（相關部分）、#84、#109–132、#180–181、#194、#199、#204–205、#210，及 `docs/production-release-policy.md`、`docs/production-authoring.md`、`docs/eng-tutor-upstream.md`。

工作：
1. 找出兩條 claim 路徑、input_snapshot 建立、context compaction、所有 authoring adapters 與 learning memory 更新入口；在共同權威入口接資料。
2. 定義有版本的精簡 student-performance evidence：來源 material/submission、題目穩定 ID、技能/題型、作答、狀態、必要題幹與伺服器答案依據。
3. 當次 authoring input 保留錯題及已答開放題的必要證據；答對題只保留聚合表現，不傳整包。未答只記完成狀態，不能當錯誤或能力不足。
4. 開放題明確標為尚未評分，不能自動宣告錯誤；沒有可靠技能標註時保留不確定，不編造錯誤分類。
5. 限制近期證據大小與數量，較舊資料壓成 compact memory；相同 submission 不可重複計入。
6. 作答與家長回饋一起形成個人化依據；只有作答、只有歷史紙本回饋、兩者都有、兩者皆無都要相容。
7. 在 claim 時固定快照，後來回饋編輯不改已 claim 的內容；跨孩子/跨家庭不可混資料。
8. 更新 prompt/contract/schema（確有需要才改），要求作者/critic 說明如何回應觀察到的困難；保持會考品質、豐富版型、取材與工作量規則。
9. 若改 generation release/version，完整執行 release consistency policy：先部署相容 consumers，再啟用新 claims；驗證歷史及 in-flight、錯誤 contract 拒絕、所有 adapters/publishers/Finisher/renderer/worker 一致。不可只改文件或本機 manifest 就算完成。

驗收：以清楚標記的合成 fixture 證明「錯題 + 開放題 + 未答 + 答對」各自進入正確 context；實際 claim snapshot 有精簡證據；下一份能解釋對學生表現的調整；既有歷史/重試不崩。私有生產資料不寫入 Git、不送公共研究查詢。

## 5. S4：完整學生與家長 UI/UX

讀 #8–9、#17–21、#36–45、#68–87、#88–113、#154–162、#179、#198、#200、#204、#210。沿用現有 renderer 與設計 token，先盤點所有登入後狀態，再統一流程。

工作：
1. Dashboard 主入口改為「查看/繼續本週教材」，清楚顯示生成中、可作答、草稿、已提交、已申請下一份。
2. 統一 dashboard、history、email scoped link、feedback page、reader 的回程與狀態，消除重複/互相矛盾 CTA。
3. 手機單欄、平板適讀寬度；sticky toolbar 不遮內容，鍵盤開啟時輸入框與保存狀態可见；避免橫向溢出。
4. 作答區支援既有 responseLayout 與多樣閱讀/題型；表格、對話、長題幹、未知題型都有可靠呈現，未知型別不能直接丟失內容。
5. 清楚的錯誤、重試、保存/衝突、提交確認與成功回饋；刷新能恢復真實狀態。
6. TTS 的載入、不支援、停止/切換語音、長文朗讀體驗；Web Speech API 是裝置語音合成，文案不能保證「真人發音」。免費優先，不默默新增付費 API。
7. 「寫字」現有是文字輸入。若要手寫筆跡，另做觸控筆原型與保存/可访问性方案；不可把文字輸入宣稱手寫已完成，也不要直接擴成 OCR 系統。必要時問一個聚焦問題確認首版是否需要筆跡。
8. 鍵盤操作、焦點、label、44px 點擊區、對比與減少動態效果；提交後保留閱讀/朗讀。

驗收：手機、平板、桌面走完端到端流程；無答案提前洩漏、保存遺失、鍵盤遮擋或登入後死路；截圖/測試記錄可供驗收。

## 6. S5：PDF 改成按需輸出與儲存策略

讀 #68–87、#127–132、#144–145、#158、#180、#193、#199、#204–205，以及發布政策。這階段需要獨立架構判斷，不假設一般 Cloudflare Worker 直接具備 Chromium。

工作：
1. 盤點目前 publisher/Finisher 與 PDF 完成條件的耦合、download/storage/email 依賴和成本，先寫清楚最小改法。
2. canonical JSON 保留為不可變 source of truth；不要為省空間先把所有多樣教材拆成固定 relational 欄位。學生狀態適合 relational；教材本體維持版本化 JSONB/原件與安全投影。
3. 選擇可信 rendering 執行環境；若用 Cloudflare Browser Rendering/Queue 等，先用當前官方文件核實支援、限制與實際費用，免費不是保證。
4. 授權的下載請求 → 以 material revision + renderer version + output kind 作冪等 key → queued/rendering/ready/failed → 有期限下載。UI 顯示轉圈與可重試狀態。
5. Render 使用 canonical 的空白學生投影，永遠不混入 draft/submission/answer key；避免重複點擊重覆付成本。
6. 適當快取、TTL/再產生、併發限制與失敗恢復；新策略發布並確認相容後才討論舊 PDF 清理，不在本階段直接刪歷史資料。
7. 若將發布與 PDF 脫鉤，先更新 SPEC 的 completed/release 契約、publisher/Finisher objective integrity、email/下載相容，再依 release policy 部署。不能先拔掉 render 就宣稱保留發布流程。

驗收：相同教材穩定 A4 輸出、空白可列印、跨家庭禁止、舊教材相容、並發冪等、失敗可復原、成本與等待時間有實測。

## 7. S6：Landing、互動 sample 與轉換流程

讀 #2–16、#22–32、#159、#163–171、#191、#204、#209–210。

工作：
1. 改成「線上閱讀與作答、依真實表現調整、也可列印」定位，逐一清理 paper-only 與已不成立的區隔論述。
2. Hero、步驟、家長負擔、產品比較、FAQ、sample CTA 與登入後入口保持同一語言與流程。
3. Sample 建議使用明確標示的公開合成教材，沿用同一 renderer；demo 作答只存本機/隔離 demo 狀態，不碰正式學生資料，不耗額、不啟動生成。
4. 讓人實際試選題、寫句子、朗讀、提交看結果與空白列印；明確標示體驗內容不代表已生成個人化教材。
5. 樣本內容不能露真實孩子或內部生成證據；保留價格/招生/配額真實規則。

驗收：未登入也能理解和操作 sample；手機完整可用；註冊/登入/查看教材不中斷；只宣傳真正部署的能力。

## 8. S7：營運觀測與全流程收尾

量測教材開啟、開始填答、保存失敗、提交、選填回饋、申請下一份、第二份使用與下載。事件不帶題目作答文字或私人資料。更新操作/恢復文件、RLS/retention 說明及 SPEC。驗收每個生產部署版本、遠端 migrations、完整學習回圈與可恢復性；首波監控只對有意義的失敗通知，避免每五分鐘無變更刷訊息。

## 9. 建議給新對話的第一個 prompt

```text
請在 C:\IDEA\eng-tutor-saas 接續線上教材改版。先讀 AGENTS.md、完整 docs/SPEC-TOC.md 與 docs/online-materials-handoff.md，再讀本階段相關 SPEC 條款。

先驗證 S1/S2 目前提交、遠端、production migrations、material-access 與 web deployment 狀態；S2 commit 是 840ea88，勿重做。完成交接文件第 3 節的修補、端到端驗收與正常部署，再實作 S3（學生錯題及已答開放題進下一份教材的 bounded context），遵守 generation release consistency policy。若部署因連線或自動審核受阻，完成可進行的本地工作並回報精確原因，不把本地 PASS 當上線。

已授權實作、驗證，依 AGENTS commit/push current branch 並執行必要 Supabase delivery；勿 force push 或覆蓋他人工作。家長帳號、整份提交才顯示答案、可部分完成、未答不算錯、空白學生列印、選填回饋、明確下一份、每服務月 4 份都已定案。每個完整階段交付證據，再接下個階段；不用重新向我確認這些決策。
```
