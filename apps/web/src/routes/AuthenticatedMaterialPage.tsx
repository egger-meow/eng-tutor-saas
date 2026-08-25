import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { MaterialActions } from '../components/materials/MaterialActions'
import { PageTransition } from '../components/motion/PageTransition'
import { getSupabaseClient } from '../lib/supabase'
import { loadAuthenticatedMaterial, type MaterialLoadState } from '../lib/authenticated-material-loader'

export function AuthenticatedMaterialContent({ state, onRetry }: { state: MaterialLoadState; onRetry: () => void }) {
  if (state.status === 'loading') {
    return (
      <div className="loading-state scoped-material-loading-state" role="status">
        <div className="loading-spinner" />
        <p>正在載入教材…</p>
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <section className="surface-card" role="alert">
        <p className="overline">教材載入</p>
        <h1>教材暫時無法載入</h1>
        <p className="muted">請稍後再試一次。</p>
        <div className="form-actions" style={{ marginTop: 'var(--space-2)' }}>
          <button className="button" type="button" onClick={onRetry}>再試一次</button>
          <a className="button button-secondary" href="/dashboard">返回 Dashboard</a>
        </div>
      </section>
    )
  }
  if (state.status === 'not-found') {
    return (
      <section className="surface-card">
        <p className="overline">教材查詢</p>
        <h1>找不到這份教材</h1>
        <p className="muted">教材尚未開放，或不屬於這個帳戶。</p>
        <div className="form-actions" style={{ marginTop: 'var(--space-2)' }}>
          <a className="button" href="/dashboard">返回 Dashboard</a>
        </div>
      </section>
    )
  }
  return (
    <section className="surface-card scoped-material-card">
      <div className="scoped-material-header">
        <p className="overline">{state.material.child_name} · {state.material.material_week}</p>
        <h1>本週教材</h1>
        <p className="scoped-material-subtitle">請直接下載或預覽本週的學生教材與家長解答。</p>
      </div>
      <MaterialActions material={state.material} childName={state.material.child_name} />
      <div className="scoped-material-footer">
        <a className="text-link button-link scoped-material-nav-link" href="/dashboard">← 查看所有教材與學習紀錄</a>
      </div>
    </section>
  )
}

export function AuthenticatedMaterialPage({ session, materialId }: { session: Session; materialId: string }) {
  const [state, setState] = useState<MaterialLoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    void loadAuthenticatedMaterial(materialId, session.user.id).then((nextState) => {
      if (active) setState(nextState)
    })
    return () => { active = false }
  }, [attempt, materialId, session.user.id])
  return (
    <AppShell header={<ParentNavigation email={session.user.email} onSignOut={() => void getSupabaseClient().auth.signOut()} />}>
      <PageTransition>
        <div className="container scoped-material-page">
          <AuthenticatedMaterialContent state={state} onRetry={() => setAttempt((current) => current + 1)} />
        </div>
      </PageTransition>
    </AppShell>
  )
}
