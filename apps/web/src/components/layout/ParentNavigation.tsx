import { handleInternalLink } from '../../app/use-route'

type ParentNavigationProps = {
  email?: string
  activeChildId?: string
  onSignOut: () => void
}

export function ParentNavigation({ email, activeChildId, onSignOut }: ParentNavigationProps) {
  const childPath = activeChildId ? `/children/${activeChildId}` : '/children/new'
  return (
    <header className="site-header parent-header">
      <a className="wordmark" href="/dashboard" onClick={handleInternalLink}>紙上英文</a>
      <nav aria-label="家長功能">
        <a href="/dashboard" onClick={handleInternalLink}>本週教材</a>
        <a href={childPath} onClick={handleInternalLink}>孩子資料</a>
        <a href="/billing" onClick={handleInternalLink}>訂閱</a>
      </nav>
      <div className="account-menu">
        {email && <span title={email}>{email}</span>}
        <button className="button button-quiet" type="button" onClick={onSignOut}>登出</button>
      </div>
    </header>
  )
}

