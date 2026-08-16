import { addBasePath } from '../../app/routes'
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

        <nav className="footer-nav" aria-label="法律條款連結">
          <div className="footer-nav-column">
            <span className="footer-nav-title">法規與條款</span>
            <ul>
              <li>
                <a
                  href={addBasePath('/terms', import.meta.env.BASE_URL)}
                  onClick={handleInternalLink}
                >
                  服務條款與定型化契約
                </a>
              </li>
              <li>
                <a
                  href={addBasePath('/privacy', import.meta.env.BASE_URL)}
                  onClick={handleInternalLink}
                >
                  隱私權政策與個資告知
                </a>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <div className="footer-bottom-row">
        <div className="footer-operator-info">
          <span>營運團隊：{legalConfig.companyName}</span>
          <span>客服信箱：<a href={`mailto:${legalConfig.contactEmail}`}>{legalConfig.contactEmail}</a></span>
          <span>通訊地址：{legalConfig.companyAddress}</span>
        </div>
        <p className="copyright-line">
          © 2026 紙屬英文 Paper English. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
