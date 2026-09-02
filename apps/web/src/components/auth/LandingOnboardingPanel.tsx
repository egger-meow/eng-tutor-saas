import { useRef, useState, type FormEvent } from 'react'
import { OnboardingLayout } from '../onboarding/OnboardingLayout'
import { AboutStep } from '../onboarding/steps/AboutStep'
import { SchoolStep } from '../onboarding/steps/SchoolStep'
import { RoutineStep } from '../onboarding/steps/RoutineStep'
import { EmailAuthPanel } from './EmailAuthPanel'
import { getAnonymousId, trackChildFormStart, trackEmailSubmit } from '../../lib/analytics'
import { startLandingOnboarding } from '../../lib/onboarding-handoff'
import { emptyProfileDraft, profileStepCount, readDraft, saveDraft, validateProfileStep, type ProfileDraft } from '../../lib/profile-form'
import '../../styles/onboarding-refinement.css'
import '../../styles/landing-onboarding.css'

const LANDING_DRAFT_KEY = 'paper-english:landing-profile-draft'

const stepMeta = [
  ['先抓孩子現在的大概位置', '暱稱、年級、英文程度，憑印象選就可以。'],
  ['孩子最近真的喜歡什麼？', '先選興趣大類，再補幾個他最近真的在看的、玩的或著迷的東西。'],
  ['最後，設定每週節奏', '選一個做得到的時間，再告訴我們最希望先加強什麼。'],
] as const

type PanelMode = 'profile' | 'email' | 'existing'

export function LandingOnboardingPanel() {
  const [mode, setMode] = useState<PanelMode>('profile')
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<ProfileDraft>(() => readDraft(LANDING_DRAFT_KEY) ?? emptyProfileDraft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const started = useRef(false)

  function markStarted() {
    if (started.current) return
    started.current = true
    trackChildFormStart({ flow: 'landing_onboarding' })
  }

  function scrollToCard() {
    if (typeof window === 'undefined') return
    window.requestAnimationFrame(() => {
      const card = document.getElementById('onboarding') ?? document.querySelector('.landing-onboarding-card')
      card?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function update(patch: Partial<ProfileDraft>) {
    markStarted()
    setDraft((current) => {
      const next = { ...current, ...patch }
      saveDraft(LANDING_DRAFT_KEY, next)
      return next
    })
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !(key in patch))))
  }

  function next() {
    markStarted()
    const nextErrors = validateProfileStep(step, draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    if (step === profileStepCount) {
      setMode('email')
      scrollToCard()
      window.requestAnimationFrame(() => {
        document.getElementById('landing-onboarding-email')?.focus({ preventScroll: true })
      })
      return
    }
    setStep((current) => Math.min(profileStepCount, current + 1))
    scrollToCard()
  }

  function prev() {
    if (step === 1) {
      const loginEl = document.getElementById('login')
      loginEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      loginEl?.querySelector('input')?.focus()
    } else {
      setStep((current) => current - 1)
      scrollToCard()
    }
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setNotice(null)
    try {
      await startLandingOnboarding({
        email,
        draft,
        anonymousId: getAnonymousId(),
        redirectOrigin: window.location.origin,
      })
      trackEmailSubmit({ flow: 'landing_onboarding' })
      setNotice({
        kind: 'success',
        text: '孩子資料已填完。安全連結已寄到你的 Email，點開後就會完成帳號設定並直接進入孩子管理畫面。',
      })
    } catch (caught) {
      setNotice({ kind: 'error', text: caught instanceof Error ? caught.message : '無法寄送安全連結，請稍後再試。' })
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'existing') {
    return (
      <div className="landing-onboarding-panel">
        <EmailAuthPanel />
        <button className="text-link" type="button" onClick={() => setMode('profile')}>第一次使用？先填孩子資料</button>
      </div>
    )
  }

  if (mode === 'email') {
    return (
      <div className="onboarding-container landing-onboarding-panel">
        <header className="onboarding-welcome-header">
          <div className="onboarding-badge">第一週免費</div>
          <h2 className="onboarding-main-title">第一次使用？先填孩子資料</h2>
          <p className="onboarding-main-desc">不用考試、不綁卡。先填寫孩子的年級、興趣與每週時間，完成 3 個步驟後才留下 Email 接收安全連結並建立帳號。</p>
        </header>
        <section className="onboarding-layout" aria-labelledby="landing-email-title">
          <div className="onboarding-heading">
            <p className="overline">孩子資料完成（第 3/3 步已完成）</p>
            <h2 id="landing-email-title">最後留下 Email，我們把第一週接到你的帳號</h2>
            <p className="muted">剛剛填的資料不需要重填。點開 Email 裡的安全連結後，會直接完成帳號設定並進入孩子管理畫面。</p>
          </div>
          <form onSubmit={submitEmail} className="onboarding-fields">
            <label htmlFor="landing-onboarding-email">家長 Email</label>
            <input
              id="landing-onboarding-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="parent@example.com"
            />
            <p className="auth-legal-consent">
              點擊送出即代表您已審閱並同意紙屬英文的 <a href="/terms" target="_blank" rel="noreferrer">服務條款</a> 與 <a href="/privacy" target="_blank" rel="noreferrer">隱私權政策</a>。
            </p>
            <div className="onboarding-actions">
              <button
                className="button button-secondary"
                type="button"
                disabled={busy}
                onClick={() => {
                  setMode('profile')
                  scrollToCard()
                }}
              >
                上一步
              </button>
              <button className="button" type="submit" disabled={busy}>
                {busy ? '寄送中…' : '寄給我，完成第一週設定'}
              </button>
            </div>
          </form>
          {notice && <p className={`notice notice-${notice.kind}`} role="status">{notice.text}</p>}
        </section>
      </div>
    )
  }

  const StepComponent = [AboutStep, SchoolStep, RoutineStep][step - 1] ?? AboutStep
  const [title, description] = stepMeta[step - 1] ?? stepMeta[0]

  return (
    <div className="onboarding-container landing-onboarding-panel">
      <header className="onboarding-welcome-header">
        <div className="onboarding-badge">第一週免費</div>
        <h2 className="onboarding-main-title">第一次使用？先填孩子資料</h2>
        <p className="onboarding-main-desc">不用考試、不綁卡。先填寫孩子的年級、興趣與每週時間，完成 3 個步驟後才留下 Email 接收安全連結並建立帳號。</p>
      </header>
      <OnboardingLayout
        step={step}
        title={title}
        description={description}
        actions={
          <>
            <button
              className="button button-secondary"
              type="button"
              onClick={prev}
            >
              {step === 1 ? '已有帳號？直接登入' : '上一步'}
            </button>
            <button className="button" type="button" onClick={next}>{step === profileStepCount ? '孩子資料填好了，繼續' : '繼續'}</button>
          </>
        }
      >
        <StepComponent draft={draft} errors={errors} update={update} />
      </OnboardingLayout>
    </div>
  )
}
