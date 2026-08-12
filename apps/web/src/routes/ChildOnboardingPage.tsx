import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { navigate } from '../app/use-route'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { OnboardingLayout } from '../components/onboarding/OnboardingLayout'
import { AboutStep } from '../components/onboarding/steps/AboutStep'
import { GoalsStep } from '../components/onboarding/steps/GoalsStep'
import { InterestsStep } from '../components/onboarding/steps/InterestsStep'
import { LevelStep } from '../components/onboarding/steps/LevelStep'
import { RoutineStep } from '../components/onboarding/steps/RoutineStep'
import { SchoolStep } from '../components/onboarding/steps/SchoolStep'
import { listChildProfiles, saveChildProfile } from '../lib/child-profiles'
import { createChild, listChildren, updateChild } from '../lib/children'
import { emptyProfileDraft, profileDraftFromChild, profileStepCount, readDraft, saveDraft, toChildProfileInput, validateProfileStep, type ProfileDraft } from '../lib/profile-form'
import { getSupabaseClient } from '../lib/supabase'

const stepMeta = [
  ['先認識孩子', '只需要暱稱和目前年級。'],
  ['目前的英文程度', '大概的判斷就足夠，不需要先考試。'],
  ['學校正在學什麼', '讓教材能接上課內進度；不確定的欄位可以留白。'],
  ['孩子會想讀什麼', '熟悉的興趣能讓閱讀更自然，但不會每週重複同一主題。'],
  ['安排得下的學習節奏', '請選擇家庭真正能持續的時間。'],
  ['目標與最後確認', '這些資訊會成為第一週教材的起點。'],
] as const

type ChildOnboardingPageProps = { session: Session; childId?: string }

export function ChildOnboardingPage({ session, childId }: ChildOnboardingPageProps) {
  const storageKey = `paper-english:profile-draft:${childId ?? 'new'}`
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<ProfileDraft>(() => readDraft(storageKey) ?? emptyProfileDraft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(Boolean(childId))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!childId || readDraft(storageKey)) return
    void Promise.all([listChildren(), listChildProfiles([childId])]).then(([children, profiles]) => {
      const child = children.find((item) => item.id === childId)
      if (!child) throw new Error('找不到這位孩子，或你沒有存取權限。')
      setDraft(profileDraftFromChild({ ...child, profile: profiles.find((profile) => profile.child_id === childId) ?? null }))
    }).catch((caught) => setError(caught instanceof Error ? caught.message : '無法載入孩子資料。')).finally(() => setLoading(false))
  }, [childId, storageKey])

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
    const nextErrors = validateProfileStep(6, draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setBusy(true)
    setError('')
    try {
      const childInput = { display_name: draft.displayName, grade: draft.grade, grade_stage: draft.gradeStage, textbook_version: draft.textbookVersion }
      const id = childId ?? await createChild(childInput)
      if (childId) await updateChild(childId, childInput)
      await saveChildProfile(id, toChildProfileInput(draft))
      window.sessionStorage.removeItem(storageKey)
      navigate(`/children/${id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '無法儲存學習資料，請稍後再試。')
    } finally { setBusy(false) }
  }

  const StepComponent = [AboutStep, LevelStep, SchoolStep, InterestsStep, RoutineStep, GoalsStep][step - 1]
  const [title, description] = stepMeta[step - 1]

  return (
    <AppShell header={<ParentNavigation email={session.user.email} activeChildId={childId} onSignOut={() => void getSupabaseClient().auth.signOut()} />}>
      {loading ? <p className="loading-state" role="status">正在載入學習資料…</p> : error && !draft.displayName && childId ? <p className="notice notice-error">{error}</p> : (
        <OnboardingLayout step={step} title={title} description={description} actions={<><button className="button button-secondary" type="button" onClick={() => step === 1 ? navigate(childId ? `/children/${childId}` : '/dashboard') : setStep((current) => current - 1)}>{step === 1 ? '取消' : '上一步'}</button><button className="button" type="button" disabled={busy} onClick={() => step === profileStepCount ? void save() : next()}>{busy ? '儲存中…' : step === profileStepCount ? '儲存學習資料' : '繼續'}</button></>}>
          <StepComponent draft={draft} errors={errors} update={update} />
          {error && <p className="notice notice-error" role="alert">{error}</p>}
        </OnboardingLayout>
      )}
    </AppShell>
  )
}
