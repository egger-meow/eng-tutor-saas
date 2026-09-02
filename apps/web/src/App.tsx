import { useEffect, useRef, useState } from 'react'
import { MotionConfig, motion, useReducedMotion } from 'framer-motion'
import type { Session } from '@supabase/supabase-js'
import './App.css'
import { navigate, useRoute } from './app/use-route'
import { AdditionalChildConfirmation } from './components/auth/AdditionalChildConfirmation'
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
import { AnnouncementsPage } from './routes/AnnouncementsPage'
import { AnnouncementDetailPage } from './routes/AnnouncementDetailPage'
import { PayPage } from './routes/PayPage'
import { flushPendingLegalAcceptance } from './lib/legal-acceptance'
import {
  trackAdditionalChildConfirmed,
  trackAuthComplete,
  trackChildCreated,
  trackExistingParentDetected,
  trackOnboardingComplete,
  trackPendingOnboardingDiscarded,
} from './lib/analytics'
import { listChildren } from './lib/children'
import {
  clearOnboardingTokenFromUrl,
  confirmAdditionalChildOnboarding,
  discardPendingOnboarding,
  finalizePendingOnboarding,
  readOnboardingToken,
} from './lib/onboarding-handoff'

const LANDING_DRAFT_KEY = 'paper-english:landing-profile-draft'

type AdditionalChildConfirmationState = {
  token: string
  existingChildId: string
  existingChildName: string
} | null

function clearLandingHandoffClientState() {
  clearOnboardingTokenFromUrl()
  try { window.sessionStorage.removeItem(LANDING_DRAFT_KEY) } catch {}
}

function App() {
  const route = useRoute()
  const isPaymentLinkRoute = route.name === 'pay'
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [finalizingOnboarding, setFinalizingOnboarding] = useState(false)
  const [onboardingError, setOnboardingError] = useState('')
  const [additionalChildConfirmation, setAdditionalChildConfirmation] = useState<AdditionalChildConfirmationState>(null)
  const [additionalChildBusy, setAdditionalChildBusy] = useState(false)
  const [additionalChildError, setAdditionalChildError] = useState('')
  const onboardingFinalizeRef = useRef<string | null>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (isPaymentLinkRoute) return

    const supabase = getSupabaseClient()

    const finalizeLandingOnboarding = (token: string) => {
      if (onboardingFinalizeRef.current === token) return
      onboardingFinalizeRef.current = token
      setFinalizingOnboarding(true)
      setOnboardingError('')
      void finalizePendingOnboarding(token).then(async (result) => {
        if (result.status === 'additional_child_confirmation_required') {
          trackExistingParentDetected({ flow: 'landing_onboarding' })
          const existingChildren = await listChildren()
          const existingChild = existingChildren[0]
          if (!existingChild) throw new Error('找不到原本的孩子資料，請重新整理後再試。')
          setAdditionalChildConfirmation({
            token,
            existingChildId: existingChild.id,
            existingChildName: existingChild.display_name,
          })
          return
        }

        clearLandingHandoffClientState()
        trackChildCreated(result.childId, { flow: 'landing_onboarding', finalized_after_auth: true })
        trackOnboardingComplete(result.childId, { flow: 'landing_onboarding', finalized_after_auth: true })
        navigate(`/children/${result.childId}`)
      }).catch((caught) => {
        onboardingFinalizeRef.current = null
        setOnboardingError(caught instanceof Error ? caught.message : '無法完成孩子設定，請重新整理後再試。')
      }).finally(() => setFinalizingOnboarding(false))
    }

    const handleSession = (nextSession: Session | null) => {
      setSession(nextSession)
      setReady(true)
      if (nextSession) {
        void flushPendingLegalAcceptance()
        trackAuthComplete({ user_id: nextSession.user.id })
        const onboardingToken = readOnboardingToken()
        if (onboardingToken) finalizeLandingOnboarding(onboardingToken)
      }
    }

    void supabase.auth.getSession().then(({ data }) => { handleSession(data.session) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => { handleSession(nextSession) })
    return () => subscription.unsubscribe()
  }, [isPaymentLinkRoute])

  async function confirmAdditionalChild() {
    if (!additionalChildConfirmation || additionalChildBusy) return
    setAdditionalChildBusy(true)
    setAdditionalChildError('')
    try {
      const childId = await confirmAdditionalChildOnboarding(additionalChildConfirmation.token)
      clearLandingHandoffClientState()
      setAdditionalChildConfirmation(null)
      trackAdditionalChildConfirmed(childId, { flow: 'landing_onboarding' })
      trackChildCreated(childId, { flow: 'landing_onboarding', finalized_after_auth: true, additional_child: true })
      trackOnboardingComplete(childId, { flow: 'landing_onboarding', finalized_after_auth: true, additional_child: true })
      navigate(`/children/${childId}`)
    } catch (caught) {
      setAdditionalChildError(caught instanceof Error ? caught.message : '無法新增孩子，請稍後再試。')
    } finally {
      setAdditionalChildBusy(false)
    }
  }

  async function discardAdditionalChildDraft() {
    if (!additionalChildConfirmation || additionalChildBusy) return
    setAdditionalChildBusy(true)
    setAdditionalChildError('')
    try {
      await discardPendingOnboarding(additionalChildConfirmation.token)
      const existingChildId = additionalChildConfirmation.existingChildId
      clearLandingHandoffClientState()
      setAdditionalChildConfirmation(null)
      trackPendingOnboardingDiscarded({ flow: 'landing_onboarding' })
      navigate(`/children/${existingChildId}`)
    } catch (caught) {
      setAdditionalChildError(caught instanceof Error ? caught.message : '無法返回原本孩子資料，請稍後再試。')
    } finally {
      setAdditionalChildBusy(false)
    }
  }

  if (isPaymentLinkRoute) return <PayPage />

  if (!ready || finalizingOnboarding) return <main className="loading-state" role="status">{finalizingOnboarding ? '正在完成孩子設定…' : '正在確認登入狀態…'}</main>

  if (additionalChildConfirmation) {
    return (
      <AdditionalChildConfirmation
        existingChildName={additionalChildConfirmation.existingChildName}
        busy={additionalChildBusy}
        error={additionalChildError}
        onConfirm={() => void confirmAdditionalChild()}
        onDiscard={() => void discardAdditionalChildDraft()}
      />
    )
  }

  if (onboardingError) {
    return (
      <main className="loading-state" role="alert">
        <p>孩子資料還在，但帳號設定尚未完成：{onboardingError}</p>
        <button className="button" type="button" onClick={() => window.location.reload()}>重新嘗試</button>
      </main>
    )
  }

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
    : route.name === 'child-new' ? <ChildOnboardingPage session={session} /> : route.name === 'child-edit' ? <ChildOnboardingPage session={session} childId={route.params.id} /> : route.name === 'child-overview' || route.name === 'child-materials' ? <ChildProfilePage session={session} childId={route.params.id} /> : route.name === 'authenticated-material' ? <AuthenticatedMaterialPage session={session} materialId={route.params.materialId} /> : route.name === 'feedback' ? <FeedbackPage session={session} materialId={route.params.materialId} /> : route.name === 'parent-guide-feedback' ? <ParentGuideFeedbackPage session={session} /> : route.name === 'billing' ? <BillingPage session={session} /> : route.name === 'announcements' ? <AnnouncementsPage session={session} /> : route.name === 'announcement-detail' ? <AnnouncementDetailPage session={session} announcementId={route.params.id} /> : <DashboardPage session={session} />

  return <MotionConfig reducedMotion="user"><motion.div className="route-stage" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}>{page}</motion.div></MotionConfig>
}

export default App
