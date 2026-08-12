import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import './App.css'
import { archiveChild, createChild, listChildren, updateChild, type Child } from './lib/children'
import { getSupabaseClient } from './lib/supabase'

type Notice = { kind: 'error' | 'success'; text: string } | null

function Login() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setNotice(null)

    const { error } = await getSupabaseClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })

    setBusy(false)
    setNotice(error
      ? { kind: 'error', text: error.message }
      : { kind: 'success', text: '登入連結已寄出，請到信箱完成登入。' })
  }

  return (
    <main className="shell login-shell">
      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">每週英文練習</p>
        <h1 id="page-title">把學習留在紙上，把準備交給我們。</h1>
        <p className="lede">為每位孩子準備獨立、可列印的英語教材與家長解答。登入後即可管理孩子的學習資料。</p>
      </section>
      <section className="card login-card" aria-labelledby="login-title">
        <p className="step">家長專區</p>
        <h2 id="login-title">用 Email 安全登入</h2>
        <p className="muted">不需要密碼。我們會寄送一次性登入連結。</p>
        <form onSubmit={submit}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <button type="submit" disabled={busy}>{busy ? '寄送中…' : '寄送登入連結'}</button>
        </form>
        {notice && <p className={`notice ${notice.kind}`} role="status">{notice.text}</p>}
      </section>
    </main>
  )
}

function ChildForm({ child, onSaved, onCancel }: { child?: Child; onSaved: () => void; onCancel?: () => void }) {
  const [name, setName] = useState(child?.display_name ?? '')
  const [grade, setGrade] = useState(child?.grade ?? 7)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (child) await updateChild(child.id, { display_name: name, grade })
      else await createChild({ display_name: name, grade })
      onSaved()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '儲存失敗，請稍後再試。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="child-form" onSubmit={submit}>
      <div>
        <label htmlFor={`name-${child?.id ?? 'new'}`}>孩子稱呼</label>
        <input id={`name-${child?.id ?? 'new'}`} required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：小安" />
      </div>
      <div>
        <label htmlFor={`grade-${child?.id ?? 'new'}`}>年級</label>
        <select id={`grade-${child?.id ?? 'new'}`} value={grade} onChange={(event) => setGrade(Number(event.target.value))}>
          <option value={7}>七年級</option><option value={8}>八年級</option><option value={9}>九年級</option>
        </select>
      </div>
      <div className="actions">
        <button type="submit" disabled={busy}>{busy ? '儲存中…' : child ? '儲存修改' : '新增孩子'}</button>
        {onCancel && <button className="secondary" type="button" onClick={onCancel}>取消</button>}
      </div>
      {error && <p className="notice error" role="alert">{error}</p>}
    </form>
  )
}

function Dashboard({ session }: { session: Session }) {
  const [children, setChildren] = useState<Child[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try { setChildren(await listChildren()) }
    catch (caught) { setError(caught instanceof Error ? caught.message : '無法載入孩子資料。') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  async function remove(child: Child) {
    if (!window.confirm(`確定封存「${child.display_name}」？既有教材與學習紀錄會保留。`)) return
    try { await archiveChild(child.id); await refresh() }
    catch (caught) { setError(caught instanceof Error ? caught.message : '封存失敗。') }
  }

  return (
    <main className="shell dashboard-shell">
      <header className="topbar">
        <div><p className="eyebrow">家長專區</p><h1>孩子與每週教材</h1></div>
        <div className="account"><span>{session.user.email}</span><button className="secondary" onClick={() => void getSupabaseClient().auth.signOut()}>登出</button></div>
      </header>
      <section className="content-grid">
        <section className="card" aria-labelledby="children-title">
          <p className="step">01</p><h2 id="children-title">孩子資料</h2>
          <p className="muted">每位孩子的程度、教材與回饋都會獨立保存。</p>
          {error && <p className="notice error" role="alert">{error}</p>}
          {loading ? <p className="muted">載入中…</p> : children.length === 0 ? <p className="empty">尚未新增孩子。先建立第一份學習資料。</p> : (
            <ul className="child-list">
              {children.map((child) => <li key={child.id}>
                {editing === child.id ? <ChildForm child={child} onSaved={() => { setEditing(null); void refresh() }} onCancel={() => setEditing(null)} /> : <>
                  <div><strong>{child.display_name}</strong><span>{child.grade} 年級 · {child.is_active ? '準備中' : '已暫停'}</span></div>
                  <div className="row-actions"><button className="text-button" onClick={() => setEditing(child.id)}>編輯</button><button className="text-button danger" onClick={() => void remove(child)}>封存</button></div>
                </>}
              </li>)}
            </ul>
          )}
        </section>
        <aside className="card add-card" aria-labelledby="add-title">
          <p className="step">02</p><h2 id="add-title">新增孩子</h2>
          <p className="muted">目前只需要稱呼與年級；詳細程度會在後續設定。</p>
          <ChildForm onSaved={() => void refresh()} />
        </aside>
      </section>
    </main>
  )
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseClient()
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); setReady(true) })
    return () => subscription.unsubscribe()
  }, [])

  if (!ready) return <main className="shell loading">正在確認登入狀態…</main>
  return session ? <Dashboard session={session} /> : <Login />
}

export default App
