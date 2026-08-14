# 品牌化登入信

已於 2026-08-14 完成本機 Supabase Auth Email Template：

- `supabase/templates/magic-link.html`
- `supabase/templates/confirmation.html`
- `supabase/templates/recovery.html`

三種信件皆使用家長易懂的繁體中文、清楚標示「紙屬英文」、說明收信原因、提供情境明確的 CTA，並提醒非本人操作可直接忽略。

## 正式環境上線檢查

Hosted Supabase 不會從 repository 自動讀取本機模板。部署時仍須：

1. 在 Supabase Dashboard 的 Authentication → Email Templates 同步三份主旨與 HTML。
2. 分別實寄並驗證註冊確認、Magic Link 與密碼重設流程。
3. 確認正式環境的 Site URL 與 Redirect URL allow list 正確。
4. 使用自訂 SMTP，並關閉供應商的連結追蹤，避免驗證連結被改寫。

> 2026-06-03 之後建立的 Supabase Free 專案，若使用 Supabase 預設 SMTP，不能自訂 Auth Email Template；此情況需先設定自訂 SMTP。
