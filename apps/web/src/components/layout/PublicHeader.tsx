import { useState } from 'react'
import { motion } from 'framer-motion'
import { handleInternalLink, useRoute } from '../../app/use-route'

const links = [
  { href: '/sample', label: '查看範例', routeName: 'sample' },
  { href: '/guide', label: '學習方法', routeName: 'guide' },
  { href: '/about', label: '關於作者', routeName: 'about' },
  { href: '/#pricing', label: '方案', routeName: 'billing' },
  { href: '/#login', label: '登入', routeName: 'login' },
]

export function PublicHeader() {
  const route = useRoute()
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
            const isActive = route.name === link.routeName
            return (
              <a
                key={link.href}
                href={link.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={(e) => {
                  setMobileMenuOpen(false)
                  handleInternalLink(e)
                }}
              >
                {isActive && (
                  <motion.span
                    layoutId="publicNavActive"
                    className="nav-active-pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="nav-link-text">{link.label}</span>
              </a>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
