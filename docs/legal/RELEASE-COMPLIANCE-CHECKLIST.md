# 紙屬英文 (Paper English) 台灣正式上線法規遵循查核清單 (Release Compliance Checklist)

**文件用途：** 本清單為本專案對外正式商業上線前之 **強制阻擋清單 (Release Gate Checklist)**。任何標記為 `P0` 之項目未完成前，系統嚴禁對台灣公眾開放收費營運。

---

## 1. P0 — 發布阻擋項目 (Release Blockers — Must Resolve Before Public Launch)

- [ ] **P0-1：自動續約扣款適用性法律確認 (Auto-Renewal Legal Review)**
  - **狀態：** `AUTO_RENEW_TAIWAN: UNCERTAIN — LAWYER_REVIEW_REQUIRED`
  - **說明：** 系統保留完整 Paddle 自動續約扣款與期末取消架構以維持 SaaS 商業模式。建議向執業律師確認線下紙筆學習 + 每週 AI 動態教材生成是否落入《網際網路教學服務》定型化契約範疇。系統已內建安全開關以備未來政策調控。

- [ ] **P0-2：正式營業主體與法定負責人資訊填補 (Business Entity / Owner Disclosures)**
  - **狀態：** `OWNER_INPUT_REQUIRED`
  - **說明：** 依《消費者保護法》第18條，於正式公開推廣前在 `.env.production` 填入經營團隊/負責人名稱、聯絡信箱與營業資訊。注意：財政部 2025 年新制勞務營業稅起徵點為每月新臺幣 5 萬元；營業稅起徵點、商業登記與所得申報各有獨立法規要件，應由創辦人與會計師依實際營運型態評估。

- [ ] **P0-3：稅籍登記與跨境電商申報路徑確認 (Tax Registration & Accounting)**
  - **狀態：** `ACCOUNTANT_REVIEW_REQUIRED`
  - **說明：** 委請會計師確認 Paddle 撥款金流、境外電商代收轉付與台灣境內營業稅/所得稅申報機制（Paddle 之 MoR 角色不自動免除創辦人在台稅務義務）。

- [x] **P0-4：服務金鑰完全隔離與未授權存取測試 (Key Isolation & RLS Security)**
  - **狀態：** `CONFIRMED (Code Verified)`
  - **說明：** 確認 `SUPABASE_SERVICE_ROLE_KEY` 絕無洩漏至前端 `apps/web` 或 Cloudflare Pages 打包檔案，所有跨家長存取阻斷測試（Negative Auth Tests）全數通過。

---

## 2. P1 — 上線前必備項目 (Must Fix Before Public Launch)

- [x] **P1-1：專屬隱私權政策與法定告知頁面上線 (`/privacy`)**
  - 符合《個人資料保護法》第8條法定告知項目，列明未成年人保護與資料主體權利。
- [x] **P1-2：專屬服務條款與定型化契約頁面上線 (`/terms`)**
  - 明載 3 日契約審閱期、服務內容、數位內容解除權合理例外情事告知、終止退費規則。
- [x] **P1-3：註冊與結帳流程條款明示同意與版本留存**
  - 於登入面板與結帳畫面設置條款連結，資料庫留存 `terms_version` 與 `privacy_version`。
- [x] **P1-4：第三方商標（Minecraft 等）指示性合理使用免責聲明**
  - 於範例頁面、首頁及全站頁尾加入 Mojang / 官方無代言贊助聲明。
- [x] **P1-5：未成年人個資最小化表單提示**
  - 於孩子建檔與興趣填寫表單中，加入禁止填寫學生真實全名、身分證號、住址、學校班級之隱私指引。
- [x] **P1-6：教材生成引擎著作權防護與追溯元資料**
  - 產製之每份教材附帶生成版本號、課綱版本號、模型名稱與時間戳記，嚴禁抓取現成教科書逐字課文。

---

## 3. P2 — 營運優化與合規衛生項目 (Operational Compliance Hygiene)

- [x] **P2-1：建立個資安全事故通報與應變程序 (`INCIDENT-RESPONSE.md`)**
- [x] **P2-2：開源軟體授權盤點，確認無 GPL/AGPL 傳染性套件 (`OPEN-SOURCE-LICENSE-AUDIT.md`)**
- [x] **P2-3：智慧財產局商標檢索初查紀錄存檔 (`LEGAL-AUDIT.md`)**
- [ ] **P2-4：商標正式申請（第16類、第41類「紙屬英文」）**（建議於規模擴大前向智慧財產局遞件）
