# 紙屬英文 (Paper English) 第三方開源相依套件授權盤點 (Third-Party Dependency License Audit)

> 本文件只盤點第三方相依套件，不代表紙屬英文本身採用開源授權。紙屬英文為 JJMowLab 專有、非開源軟體；原始碼公開可見不構成複製、修改、散布或部署授權。專案權利聲明以根目錄 `NOTICE` 為準。

**審查日期：** 2026-08-16  
**審查工具：** `pnpm list`, package manifests (`apps/web`, `packages/*`, `supabase/*`)  
**合規結論：** `PASSED — 全部相依套件均屬寬鬆型授權 (Permissive Licenses)，無 Copyleft (GPL/AGPL) 授權傳染風險`

---

## 1. 核心依賴套件授權清冊 (Dependencies Inventory)

| 套件名稱 (Package) | 類別 | 授權條款 (License) | 是否包含於前端打包 (Bundle) | 商業使用是否合法 | 標註要求 / Notice |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `react` | 前端框架 | MIT | 是 | 是 | 保留版權宣告 |
| `react-dom` | 前端渲染 | MIT | 是 | 是 | 保留版權宣告 |
| `framer-motion` | 轉場動效 | MIT | 是 | 是 | 保留版權宣告 |
| `@supabase/supabase-js` | 後端存取 SDK | MIT | 是 | 是 | 保留版權宣告 |
| `@paddle/paddle-js` | 金流結帳 SDK | Apache-2.0 | 是 | 是 | 保留 NOTICE 與版權宣告 |
| `vite` | 建置工具 | MIT | 否 (Dev) | 是 | 開發建置工具 |
| `@vitejs/plugin-react` | Vite 插件 | MIT | 否 (Dev) | 是 | 開發建置工具 |
| `typescript` | 程式語言編譯 | Apache-2.0 | 否 (Dev) | 是 | 開發編譯工具 |
| `vitest` | 單元測試框架 | MIT | 否 (Dev) | 是 | 測試工具 |
| `oxlint` | 程式碼檢查工具 | MIT | 否 (Dev) | 是 | 程式碼檢查 |
| `pdf-lib` / `pdfjs-dist` | PDF 生成與檢測 | MIT / Apache-2.0 | 否 (Server/CLI) | 是 | 伺服器端工具 |
| `supabase` (CLI) | 本地資料庫管理 | MIT / Apache-2.0 | 否 (Dev) | 是 | 本地開發環境 |

---

## 2. 授權類型合規性檢驗

1. **GPL / AGPL 傳染性授權檢查：** 經全專案掃描，本專案之生產環境代碼與前端發布包裝中，**完全無** 引入 GPL v2/v3、AGPL、SSPL 或 Commons Clause 等具源碼強制揭露義務之套件。
2. **非商業條款檢查：** 無任何標註 `NC` (Non-Commercial) 之開源套件或靜態圖資，所有使用之字體（如系統預設字型堆疊與 Google Fonts 開源字體）均具備合法商用權利。
3. **第三方聲明義務：** 專案使用的第三方套件依各自 MIT、Apache-2.0 或其他授權條款處理並保留必要聲明；這些第三方授權不適用於 JJMowLab 原創程式碼，也不授予重製、修改、散布或部署本專案的權利。
