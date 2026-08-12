import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import './App.css'
import { useRoute } from './app/use-route'
import { AuthPanel } from './components/auth/AuthPanel'
import { AppShell } from './components/layout/AppShell'
import { PublicHeader } from './components/layout/PublicHeader'
import { getSupabaseClient } from './lib/supabase'
import { ChildOnboardingPage } from './routes/ChildOnboardingPage'
import { ChildProfilePage } from './routes/ChildProfilePage'
import { DashboardPage } from './routes/DashboardPage'

function PublicEntry() {
  return (
    <AppShell className="public-entry" header={<PublicHeader />}>
      <div className="entry-grid">
        <section className="entry-copy">
          <p className="eyebrow">每週個人化紙本英文</p>
          <h1>讓孩子回到紙上，真正讀、想、寫。</h1>
          <p className="lede">每週依照孩子目前的程度、學校進度與家長回饋，準備一份可以直接列印的英文教材。</p>
        </section>
        <AuthPanel />
      </div>
    </AppShell>
  )
}

function App() {
  const route = useRoute()
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseClient()
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); setReady(true) })
    return () => subscription.unsubscribe()
  }, [])

  if (!ready) return <main className="loading-state" role="status">正在確認登入狀態…</main>
  if (!session) return <PublicEntry />
  if (route.name === 'child-new') return <ChildOnboardingPage session={session} />
  if (route.name === 'child-edit') return <ChildOnboardingPage session={session} childId={route.params.id} />
  if (route.name === 'child-overview') return <ChildProfilePage session={session} childId={route.params.id} />
  return <DashboardPage session={session} />
}

export default App
