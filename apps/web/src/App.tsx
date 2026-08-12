import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
import { BillingPage } from './routes/BillingPage'
import { WaitlistPage } from './routes/WaitlistPage'
import { SamplePage } from './routes/SamplePage'

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
  const page = !session
    ? route.name === 'about' ? <AboutPage /> : route.name === 'guide' ? <GuidePage /> : route.name === 'sample' ? <SamplePage /> : route.name === 'waitlist' ? <WaitlistPage /> : <LandingPage />
    : route.name === 'child-new' ? <ChildOnboardingPage session={session} /> : route.name === 'child-edit' ? <ChildOnboardingPage session={session} childId={route.params.id} /> : route.name === 'child-overview' ? <ChildProfilePage session={session} childId={route.params.id} /> : route.name === 'billing' ? <BillingPage session={session} /> : <DashboardPage session={session} />

  return <AnimatePresence mode="wait" initial={false}><motion.div key={`${session ? 'app' : 'public'}:${route.name}`} className="route-stage" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>{page}</motion.div></AnimatePresence>
}

export default App
