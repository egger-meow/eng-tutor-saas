import type { ReactNode } from 'react'

type AppShellProps = {
  children: ReactNode
  header?: ReactNode
  className?: string
}

export function AppShell({ children, header, className = '' }: AppShellProps) {
  return (
    <div className={`app-shell ${className}`.trim()}>
      <a className="skip-link" href="#main-content">跳到主要內容</a>
      {header}
      <main id="main-content" className="page-shell">{children}</main>
    </div>
  )
}

