import { useEffect, useState } from 'react'
import { MotionConfig, motion, useReducedMotion } from 'framer-motion'
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
import { ParentGuideFeedbackPage } from './routes/ParentGuideFeedbackPage'
import { PrivacyPage } from './routes/PrivacyPage'
import { TermsPage } from './routes/TermsPage'
import { RefundPage } from './routes/RefundPage'
import { ScopedMaterialPage } from './routes/ScopedMaterialPage'
import { AuthenticatedMaterialPage } from './routes/AuthenticatedMaterialPage'
import { flushPendingLegalAcceptance } from './lib/legal-acceptance'

function App() {
  const route = useRoute()
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const supabase = getSupabaseClient()
    const handleSession = (nextSession: Session | null) => {
      setSession(nextSession)
      setReady(true)
      if (nextSession) {
        void flushPendingLegalAcceptance()
      }
    }
    void supabase.auth.getSession().then(({ data }) => { handleSession(data.session) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => { handleSession(nextSession) })
    return () => subscription.unsubscribe()
  }, [])

  if (!ready) return <main className="loading-state" role="status">正在確認登入狀態…</main>

  // Public/Legal pages accessible regardless of session
  if (route.name === 'privacy') return <PrivacyPage />
  if (route.name === 'terms') return <TermsPage />
  if (route.name === 'refund') return <RefundPage />
  if (route.name === 'about') return <AboutPage />
  if (route.name === 'guide') return <GuidePage />
  if (route.name === 'sample') return <SamplePage />
  if (route.name === 'waitlist') return <WaitlistPage />
  if (route.name === 'material') return <ScopedMaterialPage session={session} />

  const page = !session
    ? <LandingPage />
    : route.name === 'child-new' ? <ChildOnboardingPage session={session} /> : route.name === 'child-edit' ? <ChildOnboardingPage session={session} childId={route.params.id} /> : route.name === 'child-overview' || route.name === 'child-materials' ? <ChildProfilePage session={session} childId={route.params.id} /> : route.name === 'authenticated-material' ? <AuthenticatedMaterialPage session={session} materialId={route.params.materialId} /> : route.name === 'feedback' ? <FeedbackPage session={session} materialId={route.params.materialId} /> : route.name === 'parent-guide-feedback' ? <ParentGuideFeedbackPage session={session} /> : route.name === 'billing' ? <BillingPage session={session} /> : <DashboardPage session={session} />


  return <MotionConfig reducedMotion="user"><motion.div className="route-stage" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}>{page}</motion.div></MotionConfig>
}

export default App
