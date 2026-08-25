import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { navigate } from '../app/use-route'
import { AppShell } from '../components/layout/AppShell'
import { PublicHeader } from '../components/layout/PublicHeader'
import { PublicFooter } from '../components/layout/PublicFooter'
import { PageTransition } from '../components/motion/PageTransition'
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
          每週一份專屬英文教材已備妥，請點擊下方按鈕預覽或下載列印。
        </p>
      </div>

      <div className="scoped-material-downloads">
        <div className="scoped-download-item">
          <div className="scoped-download-item-header">
            <span className="scoped-download-badge">學生學習版</span>
            <h2>學生教材</h2>
            <p>包含自然閱讀短文、精選核心單字、文法解析與自主思考練習題。</p>
          </div>
          <a
            className="button button-primary"
            href={state.studentPdfUrl}
            target="_blank"
            rel="noreferrer"
          >
            預覽 / 下載 PDF
          </a>
        </div>

        <div className="scoped-download-item">
          <div className="scoped-download-item-header">
            <span className="scoped-download-badge badge-parent">家長解答版</span>
            <h2>家長解答</h2>
            <p>包含本週重點摘要、參考解答與引導提示，方便協助孩子核對檢討。</p>
          </div>
          <a
            className="button button-secondary"
            href={state.parentAnswerPdfUrl}
            target="_blank"
            rel="noreferrer"
          >
            預覽 / 下載 PDF
          </a>
        </div>
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

