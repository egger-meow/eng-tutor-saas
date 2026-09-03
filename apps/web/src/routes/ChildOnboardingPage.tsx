import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { navigate } from '../app/use-route'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { OnboardingLayout } from '../components/onboarding/OnboardingLayout'
import { AboutStep } from '../components/onboarding/steps/AboutStep'
import { SchoolStep } from '../components/onboarding/steps/SchoolStep'
import { RoutineStep } from '../components/onboarding/steps/RoutineStep'
import { listChildProfiles, saveChildProfile } from '../lib/child-profiles'
import { createChild, listChildren, updateChild } from '../lib/children'
import { useEnrollmentState, type EnrollmentState } from '../lib/enrollment'
import { emptyProfileDraft, profileDraftFromChild, profileStepCount, readDraft, saveDraft, toChildProfileInput, validateProfileStep, type ProfileDraft } from '../lib/profile-form'
import { getSupabaseClient } from '../lib/supabase'
import { trackChildFormStart, trackChildCreated, trackOnboardingComplete } from '../lib/analytics'
import '../styles/onboarding-refinement.css'

const stepMeta = [
  ['先抓孩子現在的大概位置', '暱稱、年級、英文程度，憑印象選就可以。'],
  ['孩子最近真的喜歡什麼？', '先選興趣大類，再補幾個他最近真的在看的、玩的或著迷的東西。'],
  ['最後，設定每週節奏', '選一個做得到的時間，再告訴我們最希望先加強什麼。'],
] as const

type ChildOnboardingPageProps = {
  session: Session
  childId?: string
  initialEnrollment?: EnrollmentState | null
  initialDraft?: ProfileDraft
  initialLoading?: boolean
}

export function ChildOnboardingPage({
  session,
  childId,
  initialEnrollment,
  initialDraft,
  initialLoading,
}: ChildOnboardingPageProps) {
  const storageKey = `paper-english:profile-draft:${childId ?? 'new'}`
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<ProfileDraft>(() => initialDraft ?? readDraft(storageKey) ?? emptyProfileDraft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(initialLoading ?? (Boolean(childId) && !initialDraft && !readDraft(storageKey)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const { state: enrollment } = useEnrollmentState(initialEnrollment)
  const isNewChild = !childId
  const capacityFull = Boolean(enrollment && (enrollment.status !== 'open' || enrollment.remaining <= 0))

  useEffect(() => {
    if (isNewChild) {
      trackChildFormStart()
    }
  }, [isNewChild])

  useEffect(() => {
    if (!childId || initialDraft || readDraft(storageKey)) return
    void Promise.all([listChildren(), listChildProfiles([childId])]).then(([children, profiles]) => {
      const child = children.find((item) => item.id === childId)
      if (!child) throw new Error('找不到這位孩子，或你沒有存取權限。')
      setDraft(profileDraftFromChild({ ...child, profile: profiles.find((profile) => profile.child_id === childId) ?? null }))
    }).catch((caught) => setError(caught instanceof Error ? caught.message : '無法載入孩子資料。')).finally(() => setLoading(false))
  }, [childId, initialDraft, storageKey])

  function update(patch: Partial<ProfileDraft>) {
    setDraft((current) => {
      const next = { ...current, ...patch }
      saveDraft(storageKey, next)
      return next
    })
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !(key in patch))))
  }

  function next() {
    const nextErrors = validateProfileStep(step, draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setStep((current) => Math.min(profileStepCount, current + 1))
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  async function save() {
    const nextErrors = validateProfileStep(profileStepCount, draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setBusy(true)
    setError('')
    try {
      const childInput = { display_name: draft.displayName, grade: draft.grade, grade_stage: draft.gradeStage, textbook_version: draft.textbookVersion }
      const id = childId ?? await createChild(childInput)
      if (!childId) {
        trackChildCreated(id)
      }
      if (childId) await updateChild(childId, childInput)
      await saveChildProfile(id, toChildProfileInput(draft))
      if (!childId) {
        trackOnboardingComplete(id)
      }
      window.sessionStorage.removeItem(storageKey)
      navigate(`/children/${id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '無法儲存學習資料，請稍後再試。')
    } finally { setBusy(false) }
  }

  const StepComponent = [AboutStep, SchoolStep, RoutineStep][step - 1] ?? AboutStep
  const [title, description] = stepMeta[step - 1] ?? stepMeta[0]

  return (
    <AppShell header={<ParentNavigation email={session.user.email} childHref={childId ? `/children/${childId}` : '/dashboard'} onSignOut={() => void getSupabaseClient().auth.signOut()} />}>
      {loading ? <p className="loading-state" role="status">正在載入學習資料…</p> : error && !draft.displayName && childId ? <p className="notice notice-error">{error}</p> : (
        <div className="onboarding-container">
          {isNewChild && (
            <header className="onboarding-welcome-header">
              <div className="onboarding-badge">
                {capacityFull ? '保留候補資格' : enrollment?.freePilotActive ? '前 100 位每週免費' : '第一週免費'}
              </div>
              <h1 className="onboarding-main-title">
                {capacityFull
                  ? '三步就好，先留下孩子的學習資料'
                  : '三步就好，先讓我們認識孩子'}
              </h1>
              <p className="onboarding-main-desc">
                {capacityFull
                  ? '不用考試、不綁卡，大概填就可以。完成後先保留候補資格，有名額時再通知您。'
                  : '不用考試、不綁卡，大概填就可以；之後每週都還會依實際使用狀況繼續調整。'}
              </p>
            </header>
          )}

          <OnboardingLayout
            step={step}
            title={title}
            description={description}
            actions={
              <>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => step === 1 ? navigate(childId ? `/children/${childId}` : '/dashboard') : setStep((current) => current - 1)}
                >
                  {step === 1 ? (isNewChild ? '稍後再填' : '取消') : '上一步'}
                </button>
                <button
                  className="button"
                  type="button"
                  disabled={busy}
                  onClick={() => step === profileStepCount ? void save() : next()}
                >
                  {busy ? '儲存中…' : step === profileStepCount ? (isNewChild ? '完成，開始準備第一週教材' : '儲存學習資料') : '繼續'}
                </button>
              </>
            }
          >
            {isNewChild && capacityFull && (
              <div className="notice" role="status">
                <strong>目前名額已滿，完成資料後將先進入候補名單。</strong>
                <p>建立學習資料不會收費，也不會開始訂閱或產生教材。有名額釋出時我們會寄 Email 通知你，屆時再決定是否訂閱。</p>
              </div>
            )}
            <StepComponent draft={draft} errors={errors} update={update} />
            {error && <p className="notice notice-error" role="alert">{error}</p>}
          </OnboardingLayout>
        </div>
      )}
    </AppShell>
  )
}
