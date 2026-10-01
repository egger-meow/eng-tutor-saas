# Service-description acceptance gap

Date: 2026-10-01. Proposed text only; the production terms are unchanged.

The current TermsPage second article describes PDF-only, Paper-First delivery and fixed weekly follow-ups. The implemented SPEC sections 8, 109, 160 and 194 instead support online answering, immutable packet submission, optional parent feedback, explicit next-material requests and four packets per service month.

## Concrete proposed replacement for the second article

- **專屬教材：** 系統依孩子的年級、學校進度、程度、興趣、已提交作答表現與可用的家長回饋，製作個人化英文教材。教材提供線上閱讀與作答，並保留空白學生教材 PDF 及獨立家長解答 PDF。
- **交付方式與期日：** 符合名額與使用資格的孩子，完成學習資料後會安排第一份教材製作。已完成且到開放時間的教材可從家長帳號查看，系統另寄送通知至登入 Email；實際完成時間依教材複雜度與處理狀態而異。後續教材由家長明確申請，依有效服務期間與配額安排，每位孩子每服務月最多四份；回饋本身不會自動申請下一份。
- **線上與紙本學習：** 孩子可線上閱讀、保存作答草稿並提交整份教材，也可下載空白學生教材自行列印。可部分完成；未作答不算答錯，開放題不自動判錯。正式教材整份提交後才開放參考解答，提交後的作答不可修改。家長回饋為選填，本服務另提供學習方法及 AI 提問原則指引。

The third article's free-pilot sentence would replace “學員每週依回饋享有免費生成專屬教材之服務” with “符合資格的學員可依有效服務期間與配額，主動申請免費專屬教材，家長回饋為選填”. RefundPage and the fourth article would describe online access plus printable PDFs, retaining all existing financial/legal rights text.

## Version and consent impact

The existing `legalConfig.termsVersion` is `2026-08-26-v2`. BillingPage compares the parent's accepted version to the active version before checkout. Publishing this revision with a new version/date would therefore require existing parents to accept the new version before their next checkout. The current read-only UI review does not accept terms, perform checkout, or change subscription state. This impact needs a scope decision before publishing the revised agreement.
