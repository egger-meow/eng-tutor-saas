import { useState } from 'react'
import { addBasePath } from '../../app/routes'
import { handleInternalLink } from '../../app/use-route'
import { useScrollNavVisibility } from '../../hooks/use-scroll-nav-visibility'
import { getEnrollmentCta, useEnrollmentState } from '../../lib/enrollment'

const links = [
  { href: '/#personalization', label: '如何調整' },
  { href: '/#samples', label: '教材範例' },
  { href: '/#method', label: '學習方法' },
  { href: '/#pricing', label: '方案' },
]

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navVisible = useScrollNavVisibility()
  const { state } = useEnrollmentState()
  const cta = getEnrollmentCta(state)

  return (
    <header className={`site-header public-header ${navVisible ? '' : 'site-header-hidden'}`}>
      <div className="header-inner">
        <a className="wordmark" href="/" onClick={handleInternalLink}>
          <img
            src={addBasePath('/icon.png', import.meta.env.BASE_URL)}
            alt=""
            className="brand-icon"
            width={60}
            height={60}
          />
          <span>紙屬英文</span>
        </a>

        <button
          className="mobile-menu-toggle"
          type="button"
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? '關閉導覽選單' : '開啟導覽選單'}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
        >
          <span className={`hamburger-icon ${mobileMenuOpen ? 'open' : ''}`} />
        </button>

        <nav className={`site-nav ${mobileMenuOpen ? 'mobile-open' : ''}`} aria-label="主要導覽">
          {links.map((link) => {
            return (
              <a
                key={link.href}
                href={link.href}
                className="nav-link"
                onClick={(e) => {
                  setMobileMenuOpen(false)
                  handleInternalLink(e)
                }}
              >
                <span className="nav-link-text">{link.label}</span>
              </a>
            )
          })}
          <a className="nav-link nav-login" href="/#login" onClick={(event) => { setMobileMenuOpen(false); handleInternalLink(event) }}>
            <span className="nav-link-text">已有帳號？登入</span>
          </a>
          <a className="nav-link nav-primary-cta" href={cta.href === '#login' ? '/#login' : cta.href} onClick={(event) => { setMobileMenuOpen(false); handleInternalLink(event) }}>
            <span className="nav-link-text">{cta.label}</span>
          </a>
        </nav>
      </div>
    </header>
  )
}
