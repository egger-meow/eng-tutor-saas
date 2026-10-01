import { useNavigationMenu } from '../../hooks/use-navigation-menu'
import { handleInternalLink } from '../../app/use-route'
import { useScrollNavVisibility } from '../../hooks/use-scroll-nav-visibility'
import { getEnrollmentCta, useEnrollmentState } from '../../lib/enrollment'
import { trackSampleClick, trackFreeTrialClick } from '../../lib/analytics'

const links = [
  { href: '/#personalization', label: '如何調整' },
  { href: '/sample', label: '試讀與作答' },
  { href: '/#method', label: '學習方法' },
  { href: '/#pricing', label: '方案' },
]

export function PublicHeader() {
  const { mobileMenuOpen, setMobileMenuOpen, toggleRef, handleMenuKeyDown } = useNavigationMenu()
  const navVisible = useScrollNavVisibility()
  const { state } = useEnrollmentState()
  const cta = getEnrollmentCta(state)

  return (
    <header onKeyDown={handleMenuKeyDown} className={`site-header public-header ${mobileMenuOpen ? 'menu-open' : ''} ${navVisible ? '' : 'site-header-hidden'}`}>
      <div className="header-inner">
        <a className="wordmark" href="/" onClick={handleInternalLink}>
          <img
            src="/icon.png"
            alt=""
            className="brand-icon"
            width={30}
            height={30}
          />
          <span>紙屬英文</span>
        </a>

        <button
          className="mobile-menu-toggle"
          ref={toggleRef}
          aria-controls="public-navigation"
          type="button"
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? '關閉導覽選單' : '開啟導覽選單'}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
        >
          <span className={`hamburger-icon ${mobileMenuOpen ? 'open' : ''}`} />
        </button>

        <nav id="public-navigation" className={`site-nav ${mobileMenuOpen ? 'mobile-open' : ''}`} aria-label="主要導覽">
          {links.map((link) => {
            return (
              <a
                key={link.href}
                href={link.href}
                className="nav-link"
                onClick={(e) => {
                  if (link.href === '/sample') {
                    trackSampleClick('nav_header')
                  }
                  setMobileMenuOpen(false)
                  handleInternalLink(e)
                }}
              >
                <span className="nav-link-text">{link.label}</span>
              </a>
            )
          })}
          <a
            className="nav-link nav-login"
            href="/#login"
            onClick={(event) => {
              setMobileMenuOpen(false)
              handleInternalLink(event)
              window.requestAnimationFrame(() => {
                const loginEl = document.getElementById('login')
                loginEl?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
                loginEl?.querySelector('input')?.focus()
              })
            }}
          >
            <span className="nav-link-text">已有帳號？登入</span>
          </a>
          <a
            className="nav-link nav-primary-cta"
            href={cta.href.startsWith('/') ? cta.href : `/${cta.href}`}
            onClick={(event) => {
              trackFreeTrialClick('nav_header')
              setMobileMenuOpen(false)
              handleInternalLink(event)
            }}
          >
            <span className="nav-link-text">{cta.label}</span>
          </a>
        </nav>
      </div>
    </header>
  )
}
