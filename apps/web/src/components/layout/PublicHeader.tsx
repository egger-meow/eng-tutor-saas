import { handleInternalLink } from '../../app/use-route'

const links = [
  { href: '/guide', label: '學習方法' },
  { href: '/about', label: '關於作者' },
  { href: '/billing', label: '方案' },
]

export function PublicHeader() {
  return (
    <header className="site-header">
      <a className="wordmark" href="/" onClick={handleInternalLink}>紙上英文</a>
      <nav aria-label="主要導覽">
        {links.map((link) => <a key={link.href} href={link.href} onClick={handleInternalLink}>{link.label}</a>)}
      </nav>
    </header>
  )
}

