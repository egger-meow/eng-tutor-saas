import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { navigate } from '../app/use-route'
import { AppShell } from '../components/layout/AppShell'
import { PublicHeader } from '../components/layout/PublicHeader'
import { PublicFooter } from '../components/layout/PublicFooter'
import { PageTransition } from '../components/motion/PageTransition'
import { MaterialPreview } from '../components/materials/MaterialPreview'
import { materialDownloadFilename } from '../lib/materials'
import { getSupabaseClient } from '../lib/supabase'
import { captureScopedMaterialToken, forgetScopedMaterialToken } from '../lib/scoped-material-token'

export type ScopedMaterial = {
  childName: string
  materialWeek: string
  weekNumber: number
}

export type AccessState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; material: ScopedMaterial; studentPdfUrl: string; parentAnswerPdfUrl: string }

export function ScopedMaterialLoadingState() {
  return (
    <div className="loading-state scoped-material-loading-state" role="status">
      <div className="loading-spinner" />
      <p>正在安全開啟教材…</p>
    </div>
  )
}

export function ScopedMaterialContent({
  state,
  session,
}: {
  state: AccessState
  session: Session | null
}) {
  if (state.status === 'loading') {
    return <ScopedMaterialLoadingState />
  }

  if (state.status === 'error') {
    return (
      <section className="surface-card" role="alert">
        <p className="overline">教材連結</p>
        <h1>這個教材連結無法使用</h1>
        <p className="muted">
          連結可能已過期、遭撤銷，或教材尚未開放。請登入紙屬英文查看目前可用的教材。
        </p>
        <div className="form-actions" style={{ marginTop: 'var(--space-2)' }}>
          <button
            className="button"
            type="button"
            onClick={() => navigate(session ? '/dashboard' : '/')}
          >
            {session ? '返回我的 Dashboard' : '登入紙屬英文'}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="surface-card scoped-material-card">
      <div className="scoped-material-header">
        <p className="overline">
          {state.material.childName} · Week {state.material.weekNumber}
        </p>
        <h1>本週教材</h1>
        <p className="scoped-material-subtitle">
          每週一份專屬英文教材已備妥，可直接在下方預覽學生教材，或下載列印。
        </p>
      </div>

      <MaterialPreview pdfUrl={state.studentPdfUrl} />

      <div className="material-actions scoped-material-actions">
        <a
          className="button button-primary"
          href={state.studentPdfUrl}
          download={materialDownloadFilename(state.material.childName, state.material.materialWeek, 'student', state.material.weekNumber)}
          target="_blank"
          rel="noreferrer"
        >
          下載學生教材
        </a>
        <a
          className="button button-secondary"
          href={state.parentAnswerPdfUrl}
          download={materialDownloadFilename(state.material.childName, state.material.materialWeek, 'parent', state.material.weekNumber)}
          target="_blank"
          rel="noreferrer"
        >
          下載家長解答
        </a>
      </div>

      <div className="scoped-material-footer">
        <button
          className="text-link button-link scoped-material-nav-link"
          type="button"
          onClick={() => navigate(session ? '/dashboard' : '/')}
        >
          {session ? '← 返回我的 Dashboard' : '登入查看所有教材與學習紀錄 →'}
        </button>
      </div>
    </section>
  )
}

export function ScopedMaterialPage({ session }: { session: Session | null }) {
  const [state, setState] = useState<AccessState>({ status: 'loading' })

  useEffect(() => {
    const token = captureScopedMaterialToken(window.location.search, window.sessionStorage, () => {
      window.history.replaceState({}, '', '/material')
    })
    if (!token) {
      setState({ status: 'error' })
      return
    }
    void getSupabaseClient()
      .functions.invoke('material-access', { body: { token } })
      .then(({ data, error }) => {
        if (error || !data) {
          setState({ status: 'error' })
          return
        }
        if (data.ownerSessionMatches && typeof data.canonicalPath === 'string') {
          forgetScopedMaterialToken(window.sessionStorage)
          navigate(data.canonicalPath)
          return
        }
        if (!data.material || !data.studentPdfUrl || !data.parentAnswerPdfUrl) {
          setState({ status: 'error' })
          return
        }
        setState({
          status: 'ready',
          material: data.material,
          studentPdfUrl: data.studentPdfUrl,
          parentAnswerPdfUrl: data.parentAnswerPdfUrl,
        })
      })
  }, [])

  return (
    <AppShell header={<PublicHeader />}>
      <PageTransition>
        <div className={`scoped-material-container${state.status === 'loading' ? ' scoped-material-main-loading' : ''}`}>
          <div className="container scoped-material-page">
            <ScopedMaterialContent state={state} session={session} />
          </div>
        </div>
      </PageTransition>
      <PublicFooter />
    </AppShell>
  )
}

