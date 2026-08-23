import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { navigate } from '../app/use-route'
import { PublicHeader } from '../components/layout/PublicHeader'
import { PublicFooter } from '../components/layout/PublicFooter'
import { getSupabaseClient } from '../lib/supabase'
import { captureScopedMaterialToken, forgetScopedMaterialToken } from '../lib/scoped-material-token'

type ScopedMaterial = {
  childName: string
  materialWeek: string
  weekNumber: number
}

type AccessState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; material: ScopedMaterial; studentPdfUrl: string; parentAnswerPdfUrl: string }

export function ScopedMaterialPage({ session }: { session: Session | null }) {
  const [state, setState] = useState<AccessState>({ status: 'loading' })

  useEffect(() => {
    const token = captureScopedMaterialToken(window.location.search, window.sessionStorage, () => {
      window.history.replaceState({}, '', '/material')
    })
    if (!token) { setState({ status: 'error' }); return }
    void getSupabaseClient().functions.invoke('material-access', { body: { token } }).then(({ data, error }) => {
      if (error || !data) { setState({ status: 'error' }); return }
      if (data.ownerSessionMatches && typeof data.canonicalPath === 'string') {
        forgetScopedMaterialToken(window.sessionStorage)
        navigate(data.canonicalPath)
        return
      }
      if (!data.material || !data.studentPdfUrl || !data.parentAnswerPdfUrl) { setState({ status: 'error' }); return }
      setState({ status: 'ready', material: data.material, studentPdfUrl: data.studentPdfUrl, parentAnswerPdfUrl: data.parentAnswerPdfUrl })
    })
  }, [])

  return <><PublicHeader /><main className="section"><div className="container scoped-material-page">
    {state.status === 'loading' && <div className="loading-state" role="status"><div className="loading-spinner" /><p>正在安全開啟教材…</p></div>}
    {state.status === 'error' && <section className="surface-card"><p className="overline">教材連結</p><h1>這個教材連結無法使用</h1><p className="muted">連結可能已過期、遭撤銷，或教材尚未開放。請登入紙屬英文查看目前可用的教材。</p><button className="button" type="button" onClick={() => navigate(session ? '/dashboard' : '/')}>{session ? '返回我的 Dashboard' : '登入紙屬英文'}</button></section>}
    {state.status === 'ready' && <section className="surface-card"><p className="overline">{state.material.childName} · Week {state.material.weekNumber}</p><h1>本週教材</h1><div className="scoped-material-downloads"><div><h2>學生教材</h2><a className="button" href={state.studentPdfUrl} target="_blank" rel="noreferrer">預覽 / 下載 PDF</a></div><div><h2>家長解答</h2><a className="button button-secondary" href={state.parentAnswerPdfUrl} target="_blank" rel="noreferrer">預覽 / 下載 PDF</a></div></div><button className="text-link button-link" type="button" onClick={() => navigate(session ? '/dashboard' : '/')}>{session ? '返回我的 Dashboard' : '登入查看所有教材與學習紀錄'}</button></section>}
  </div></main><PublicFooter /></>
}
