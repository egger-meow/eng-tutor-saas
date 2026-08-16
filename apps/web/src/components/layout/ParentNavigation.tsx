import { useState } from 'react'
import { motion } from 'framer-motion'
import { addBasePath } from '../../app/routes'
import { handleInternalLink, useRoute } from '../../app/use-route'
import { useScrollNavVisibility } from '../../hooks/use-scroll-nav-visibility'

type ParentNavigationProps = {
  email?: string
  childHref?: string
  onSignOut: () => void
}

export function ParentNavigation({ email, childHref = '/dashboard', onSignOut }: ParentNavigationProps) {
  const route = useRoute()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navVisible = useScrollNavVisibility()

  const navItems = [
    { href: '/dashboard', label: '本週教材', isActive: route.name === 'dashboard' },
    { href: childHref, label: '孩子資料', isActive: route.name === 'child-overview' || route.name === 'child-edit' },
    { href: '/parent-guide-feedback', label: '使用說明與回饋', isActive: route.name === 'parent-guide-feedback' },
    { href: '/billing', label: '訂閱', isActive: route.name === 'billing' },
  ]

  return (
    <header className={`site-header parent-header ${navVisible ? '' : 'site-header-hidden'}`}>
      <div className="header-inner">
        <a className="wordmark" href="/dashboard" onClick={handleInternalLink}>
          <img
            src={addBasePath('/icon.png', import.meta.env.BASE_URL)}
            alt=""
            className="brand-icon"
            width={28}
            height={28}
          />
          <span>紙屬英文</span>
        </a>

        <button
          className="mobile-menu-toggle"
          type="button"
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? '關閉家長選單' : '開啟家長選單'}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
        >
          <span className={`hamburger-icon ${mobileMenuOpen ? 'open' : ''}`} />
        </button>

        <div className={`parent-nav-container ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <nav aria-label="家長功能" className="site-nav">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`nav-link ${item.isActive ? 'active' : ''}`}
                onClick={(e) => {
                  setMobileMenuOpen(false)
                  handleInternalLink(e)
                }}
              >
                {item.isActive && (
                  <motion.span
                    layoutId="parentNavActive"
                    className="nav-active-pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="nav-link-text">{item.label}</span>
              </a>
            ))}
          </nav>

          <a className="nav-action" href="/children/new" onClick={(e) => { setMobileMenuOpen(false); handleInternalLink(e) }}><span aria-hidden="true">＋</span> 新增孩子</a>

          <div className="account-menu">
            {email && <span className="user-email" title={email}>{email}</span>}
            <button className="button button-quiet" type="button" onClick={onSignOut}>
              登出
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
