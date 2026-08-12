import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { navigate } from '../app/use-route'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { archiveChild, createChild, listChildren, updateChild, type Child } from '../lib/children'
import { getSupabaseClient } from '../lib/supabase'

type ChildBasicsPageProps = { session: Session; childId?: string }

export function ChildBasicsPage({ session, childId }: ChildBasicsPageProps) {
  const [child, setChild] = useState<Child | null>(null)
  const [name, setName] = useState('')
  const [grade, setGrade] = useState(7)
  const [loading, setLoading] = useState(Boolean(childId))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!childId) return
    void listChildren().then((rows) => {
      const owned = rows.find((row) => row.id === childId) ?? null
      setChild(owned)
      setName(owned?.display_name ?? '')
      setGrade(owned?.grade ?? 7)
    }).catch((caught) => setError(caught instanceof Error ? caught.message : '無法載入孩子資料。')).finally(() => setLoading(false))
  }, [childId])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (child) await updateChild(child.id, { display_name: name, grade })
      else await createChild({ display_name: name, grade })
      navigate('/dashboard')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '無法儲存孩子資料。')
    } finally { setBusy(false) }
  }

  async function archive() {
    if (!child || !window.confirm(`確定要封存 ${child.display_name} 的資料嗎？既有教材不會刪除。`)) return
    setBusy(true)
    try { await archiveChild(child.id); navigate('/dashboard') }
    catch (caught) { setError(caught instanceof Error ? caught.message : '無法封存孩子資料。') }
    finally { setBusy(false) }
  }

  return (
    <AppShell header={<ParentNavigation email={session.user.email} activeChildId={childId} onSignOut={() => void getSupabaseClient().auth.signOut()} />}>
      <section className="form-page">
        <p className="overline">孩子資料</p>
        <h1>{childId ? '更新基本資料' : '建立孩子學習資料'}</h1>
        <p className="muted">完整的六步學習資料將在下一階段接上；目前可先管理姓名與年級。</p>
        {loading ? <p role="status">載入中…</p> : childId && !child ? <p className="notice notice-error">找不到這位孩子，或你沒有存取權限。</p> : (
          <form className="basic-form" onSubmit={submit}>
            <label htmlFor="child-name">孩子暱稱<input id="child-name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label htmlFor="child-grade">年級<select id="child-grade" value={grade} onChange={(event) => setGrade(Number(event.target.value))}><option value={7}>國中七年級</option><option value={8}>國中八年級</option><option value={9}>國中九年級</option></select></label>
            <div className="form-actions"><button className="button" type="submit" disabled={busy}>{busy ? '儲存中…' : '儲存並返回'}</button><button className="button button-secondary" type="button" onClick={() => navigate('/dashboard')}>取消</button></div>
            {child && <button className="button-link danger-link" type="button" disabled={busy} onClick={() => void archive()}>封存這位孩子</button>}
            {error && <p className="notice notice-error" role="alert">{error}</p>}
          </form>
        )}
      </section>
    </AppShell>
  )
}

