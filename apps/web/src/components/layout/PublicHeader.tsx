import { useState } from 'react'
import { handleInternalLink } from '../../app/use-route'
import { useScrollNavVisibility } from '../../hooks/use-scroll-nav-visibility'

const links = [
  { href: '/#personalization', label: '如何調整' },
  { href: '/#samples', label: '教材範例' },
  { href: '/#method', label: '學習方法' },
  { href: '/#pricing', label: '方案' },
  { href: '/#login', label: '免費取得第一週' },
]

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navVisible = useScrollNavVisibility()

  return (
    <header className={`site-header public-header ${navVisible ? '' : 'site-header-hidden'}`}>
      <div className="header-inner">
        <a className="wordmark" href="/" onClick={handleInternalLink}>
          紙屬英文
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
                className={`nav-link ${link.href === '/#login' ? 'nav-login nav-primary-cta' : ''}`}
                onClick={(e) => {
                  setMobileMenuOpen(false)
                  handleInternalLink(e)
                }}
              >
                <span className="nav-link-text">{link.label}</span>
              </a>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
