# 紙屬英文 Localhost Admin Cockpit (`apps/admin`)

內部輕量維運與學習情報控制台 (Production Observability + Learning Console)。

本控制台專為本地 (Localhost-only) 操作員設計，解答四個關鍵維運問題：

1. **目前生產環境正在發生什麼事？** (Operations Overview & Queue Health)
2. **有哪些任務失敗、為什麼失敗、頻率如何？** (Generation & Finisher Failure Intelligence)
3. **家長與孩子每週重複反映什麼？** (Parent Feedback & Child Voice Pattern Intelligence)
4. **有哪些結構化規律未來可乾淨地提供給 AI Agents 改善出題與品質引擎？** (Structured AI Observability Dataset)

---

## 快速啟動 (Quick Start)

### 1. 安裝與依賴

於專案根目錄執行：

```powershell
corepack pnpm install
```

### 2. 環境變數配置

在根目錄 `.env`（或 `.env.local`）中設置後端專用 Service Role 密鑰：

```ini
# Supabase 連線資訊 (伺服器端讀取，絕不打包進前端 Browser Bundle)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your-service-role-key
```

> **注意：** 若未設定 `SUPABASE_SECRET_KEY` 或處於離線環境，控制台會自動啟動 **模擬資料模式 (Simulation Mode)**，讓維運人員在任何環境下皆能立即檢視所有視圖與圖表。

### 3. 啟動 Admin 控制台

在根目錄執行：

```powershell
corepack pnpm admin
```

或進入 `apps/admin` 執行：

```powershell
corepack pnpm --filter @paper-english/admin dev
```

控制台預設在 `http://localhost:5174` 開啟。

---

## 核心視圖介紹 (Core Views)

### 1. 即時維運總覽 (Operations Overview)
* **KPI 摘要**：在學孩子數、100 人容量計數器 (Cap Counter)、創始會員 30 人招募進度、有效訂閱數。
* **生成排程狀態**：待處理 (Pending)、認領中 (Claimed)、成功完成 (Completed)、失敗 (Failed)。
* **異常任務預警**：自動標記租約逾期 (Lease Expired)、超過交付截止日 (Past Deadline) 或重試耗盡之任務。
* **Finisher 管線狀態**：即時統計 GitHub Actions Finisher 之品質審核通過、拒絕與技術異常件數。
* **最近交付紀錄**：直接查看最新產出的學生本與解答篇 PDF。

### 2. 生成與 Finisher 失敗情報 (Failure Intelligence)
* **管線階段分佈**：依 `worker_claim`、`chatgpt_authoring`、`finisher_audit`、`pdf_rendering`、`storage_upload` 統計失敗佔比。
* **錯誤代碼聚類**：自動聚類 `QUALITY_REJECTED`、`CANONICAL_PROMPT_CLIPPED`、`VOCABULARY_CEILING_EXCEEDED`、`FORBIDDEN_JARGON` 等錯誤，並附帶系統修復指引。
* **品質規則違規深潛 (Quality Rubric Violations)**：分析具體是哪一條 Pedagogical Rubric 或版面限制被觸發。
* **結構化失敗證據檢查 (Evidence Modal)**：點擊直接檢視 `failure_evidence` JSON。

### 3. 家長每週反饋情報 (Parent Feedback Intelligence)
* **難易度與完成度分佈**：統計剛剛好 (Good) %、太難 %、太簡單 %，以及 100% 完成率。
* **卡點領域統計 (Weak Areas)**：單字、文法、閱讀、寫作或綜合弱項分佈。
* **確定性關鍵詞與主題聚類 (Topic Clusters)**：以詞彙分析自動萃取「篇幅偏長」、「時態混淆」、「學校段考需求」、「主題很有趣」等主題。
* **孩子原音 (Child Voice Quotes)**：保留真實學習回饋。
* **即時檢索資料流**：支援關鍵字、難度與弱項多條件篩選。

### 4. 產品與使用反饋 (Product Feedback & Churn)
* **功能與 Bug 回報**：來自 `public.product_feedback` 之 Bug、流程、教材建議統計。
* **訂閱流失與摩擦分析**：Paddle 訂閱扣款異常 (Past Due) 與期末退訂原因分析。
* **指標分界 (Instrumentation Status)**：清晰標示「現有資料」與「未來需額外埋點之指標」。

### 5. 孩子/週次 生命週期追蹤 (Child / Week Timeline)
* 整合多表關聯，一鍵重現特定孩子與週次的 8 步端到端生命週期：
  1. `SCHEDULED` (排程確立)
  2. `FEEDBACK_CUTOFF` (48h 反饋截止)
  3. `JOB_CLAIMED` (Worker 認領)
  4. `SUBMISSION_AUTHORING` (ChatGPT 封包提交)
  5. `FINISHER_AUDIT` (Finisher 品質審核)
  6. `MATERIAL_STORED` (PDF 渲染與儲存)
  7. `DELIVERY_RELEASED` (家長端發行上線)
  8. `FEEDBACK_RECORDED` (每週反饋與記憶更新)
* 點擊任意步驟可展開詳細 Meta Payload 與原始多表快照。

### 6. AI 系統改善資料集匯出 (AI Dataset Export)
* 一鍵複製或下載去識別化 (PII-Scrubbed) 之標準結構化 JSON。
* 未來直接餵入 AI Prompt / Curriculum Engine 優化 Agent，完成封閉式學習改善循環：
  `Production Data → Sanitized Structured Observations → AI Analysis → Proposed Improvements → Human Review`

---

## 安全防護原則 (Security Guardrails)

* **純本地使用 (Localhost Only)**：不部署於公開公網，不對外開放端口。
* **金鑰隔離**：`SUPABASE_SECRET_KEY` 僅在 Node.js API 伺服器端讀取，前端 React 程式碼中無任何 Privileged Credentials。
* **安全去識別化**：所有孩子名稱在展示與匯出時自動脫敏（如 `林*豪`、`Child #c12a`）。
* **唯讀與防破壞**：V1 嚴格限制為 Observability 與 Intelligence，不開放任意 SQL 執行。

---

## 測試指令 (Testing)

```powershell
corepack pnpm test apps/admin/src/server/admin-service.test.ts
```
