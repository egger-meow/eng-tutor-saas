import { useEffect, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion'
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
import { FeedbackPage } from './routes/FeedbackPage'

function App() {
  const route = useRoute()
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const supabase = getSupabaseClient()
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); setReady(true) })
    return () => subscription.unsubscribe()
  }, [])

  if (!ready) return <main className="loading-state" role="status">正在確認登入狀態…</main>
  const page = !session
    ? route.name === 'about' ? <AboutPage /> : route.name === 'guide' ? <GuidePage /> : route.name === 'sample' ? <SamplePage /> : route.name === 'waitlist' ? <WaitlistPage /> : <LandingPage />
    : route.name === 'child-new' ? <ChildOnboardingPage session={session} /> : route.name === 'child-edit' ? <ChildOnboardingPage session={session} childId={route.params.id} /> : route.name === 'child-overview' || route.name === 'child-materials' ? <ChildProfilePage session={session} childId={route.params.id} /> : route.name === 'feedback' ? <FeedbackPage session={session} materialId={route.params.materialId} /> : route.name === 'billing' ? <BillingPage session={session} /> : <DashboardPage session={session} />

  return <MotionConfig reducedMotion="user"><AnimatePresence mode="sync" initial={false}><motion.div key={`${session ? 'app' : 'public'}:${route.path}`} className="route-stage" initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }} transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}>{page}</motion.div></AnimatePresence></MotionConfig>
}

export default App
