import { handleInternalLink } from '../../app/use-route'
import { legalConfig } from '../../lib/config'

export function PublicFooter() {
  return (
    <footer className="site-footer" aria-label="頁尾資訊與法規聲明">
      <div className="footer-inner">
        <div className="footer-brand-section">
          <div className="footer-brand">
            <strong>紙屬英文</strong>
            <p>每週一份，只屬於你孩子的英文教材。</p>
          </div>
          <p className="footer-philosophy">AI 在幕後，學習回到紙上。</p>
        </div>

        <nav className="footer-nav" aria-label="法律與導覽連結">
          <div className="footer-nav-column">
            <span className="footer-nav-title">產品與學習</span>
            <ul>
              <li><a href="/sample" onClick={handleInternalLink}>教材範例</a></li>
              <li><a href="/guide" onClick={handleInternalLink}>學習方法與 AI 指引</a></li>
              <li><a href="/about" onClick={handleInternalLink}>誰在做這套教材</a></li>
              <li><a href="/#pricing" onClick={handleInternalLink}>方案費用與容量</a></li>
            </ul>
          </div>

          <div className="footer-nav-column">
            <span className="footer-nav-title">法規與條款</span>
            <ul>
              <li><a href="/terms" onClick={handleInternalLink}>服務條款與定型化契約</a></li>
              <li><a href="/privacy" onClick={handleInternalLink}>隱私權政策與個資告知</a></li>
            </ul>
          </div>
        </nav>
      </div>

      <div className="footer-bottom-row">
        <p className="copyright-line">
          © 2026 紙屬英文 Paper English. All rights reserved.
        </p>
        <p className="contact-line">
          客服聯絡：<a href={`mailto:${legalConfig.contactEmail}`}>{legalConfig.contactEmail}</a>
        </p>
      </div>
    </footer>
  )
}
