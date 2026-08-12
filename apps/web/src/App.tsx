import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import './App.css'
import { useRoute } from './app/use-route'
import { getSupabaseClient } from './lib/supabase'
import { AboutPage } from './routes/AboutPage'
import { ChildOnboardingPage } from './routes/ChildOnboardingPage'
import { ChildProfilePage } from './routes/ChildProfilePage'
import { DashboardPage } from './routes/DashboardPage'
import { GuidePage } from './routes/GuidePage'
import { LandingPage } from './routes/LandingPage'

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
  if (!session) {
    if (route.name === 'about') return <AboutPage />
    if (route.name === 'guide') return <GuidePage />
    return <LandingPage />
  }
  if (route.name === 'child-new') return <ChildOnboardingPage session={session} />
  if (route.name === 'child-edit') return <ChildOnboardingPage session={session} childId={route.params.id} />
  if (route.name === 'child-overview') return <ChildProfilePage session={session} childId={route.params.id} />
  return <DashboardPage session={session} />
}

export default App
