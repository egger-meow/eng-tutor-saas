import { useState } from 'react'
import { handleInternalLink } from '../../app/use-route'

const links = [
  { href: '/#samples', label: '查看範例' },
  { href: '/#method', label: '學習方法' },
  { href: '/#founder', label: '關於創作者' },
  { href: '/#pricing', label: '方案' },
  { href: '/#login', label: '登入' },
]

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="site-header public-header">
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
        </nav>
      </div>
    </header>
  )
}
