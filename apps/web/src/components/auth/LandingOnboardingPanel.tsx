import { useEffect, useRef, useState, type FormEvent } from 'react'
import { OnboardingLayout } from '../onboarding/OnboardingLayout'
import { AboutStep } from '../onboarding/steps/AboutStep'
import { SchoolStep } from '../onboarding/steps/SchoolStep'
import { RoutineStep } from '../onboarding/steps/RoutineStep'
import { EmailAuthPanel } from './EmailAuthPanel'
import { Week1FastProgress } from '../materials/Week1FastProgress'
import { getAnonymousId, trackChildFormStart } from '../../lib/analytics'
import { startLandingOnboarding, type LandingOnboardingStartStatus } from '../../lib/landing-onboarding-start'
import { emptyProfileDraft, profileStepCount, readDraft, saveDraft, validateProfileStep, type ProfileDraft } from '../../lib/profile-form'
import { useEnrollmentState } from '../../lib/enrollment'
import {
  clearWeek1ProgressToken,
  readAnonymousWeek1Progress,
  readWeek1ProgressToken,
  saveWeek1ProgressToken,
  type Week1Progress,
} from '../../lib/week1-progress'
import '../../styles/onboarding-refinement.css'
import '../../styles/landing-onboarding.css'

const LANDING_DRAFT_KEY = 'paper-english:landing-profile-draft'

const stepMeta = [
  ['先抓孩子現在的大概位置', '暱稱、年級、英文程度，憑印象選就可以。'],
  ['孩子最近真的喜歡什麼？', '先選興趣大類，再補幾個他最近真的在看的、玩的或著迷的東西。'],
  ['最後，設定每週節奏', '選一個做得到的時間，再告訴我們最希望先加強什麼。'],
] as const

type PanelMode = 'profile' | 'email' | 'existing' | 'submitted'

export function LandingOnboardingPanel() {
  const { state: enrollment } = useEnrollmentState()
  const [mode, setMode] = useState<PanelMode>('profile')
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<ProfileDraft>(() => readDraft(LANDING_DRAFT_KEY) ?? emptyProfileDraft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState<LandingOnboardingStartStatus | null>(null)
  const [week1Progress, setWeek1Progress] = useState<Week1Progress | null>(null)
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (mode !== 'submitted' || submissionStatus !== 'accepted') return
    const token = readWeek1ProgressToken()
    if (!token) return

    const startedAt = Date.now()
    let cancelled = false
    let inFlight = false
    let timer: number | null = null

    const nextDelay = () => {
      const elapsed = Date.now() - startedAt
      if (elapsed < 30_000) return 2_000
      if (elapsed < 180_000) return 5_000
      return 10_000
    }

    const schedule = () => {
      if (cancelled) return
      timer = window.setTimeout(() => {
        timer = null
        void poll()
      }, nextDelay())
    }

    const poll = async () => {
      if (cancelled || inFlight) return
      if (Date.now() - startedAt >= 2 * 60 * 60 * 1000) {
        clearWeek1ProgressToken()
        return
      }
      if (document.hidden) return

      inFlight = true
      try {
        const progress = await readAnonymousWeek1Progress(token)
        if (!cancelled && progress) {
          setWeek1Progress(progress)
          if (progress.ready) {
            clearWeek1ProgressToken()
            return
          }
        }
      } finally {
        inFlight = false
      }
      schedule()
    }

    void poll()
    const onVisibility = () => {
      if (!document.hidden && !cancelled && timer === null && !inFlight) void poll()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      if (timer !== null) window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [mode, submissionStatus])

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
    if (busy || mode === 'submitted') return
    setBusy(true)
    setNotice(null)
    try {
      const result = await startLandingOnboarding({
        email,
        draft,
        anonymousId: getAnonymousId(),
        redirectOrigin: window.location.origin,
      })

      setSubmissionStatus(result.status)
      if (result.status === 'accepted') {
        setWeek1Progress({ stage: 'received', stageUpdatedAt: new Date().toISOString(), ready: false })
        saveWeek1ProgressToken(result.progressToken)
      } else {
        clearWeek1ProgressToken()
      }
      setMode('submitted')
    } catch (caught) {
      console.error('Landing onboarding request failed', caught)
      setNotice({ kind: 'error', text: '目前無法送出登入信，請稍後再試。若剛剛已收到 Email，請直接使用最新一封登入信。' })
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

  if (mode === 'submitted') {
    const waitlisted = submissionStatus === 'waitlisted'
    return (
      <div className="onboarding-container landing-onboarding-panel">
        <section className="onboarding-success-card" role="status" aria-live="polite">
          <div className="onboarding-badge">🧪 紙屬英文 Beta</div>
          <p className="overline">{waitlisted ? '候補已完成' : '資料已安全送出'}</p>
          <h2>{waitlisted ? '候補已登記，登入信已寄出' : '第一週教材已排入製作'}</h2>
          <p>
            {waitlisted
              ? '目前名額已滿，已幫你登記候補。輪到你時我們會寄 Email 通知，不會先開始產生教材。'
              : '孩子資料已收到，我們會盡快幫你把第一週教材做好。你不用留在這頁等；完成後也會寄 Email 通知你，再回來下載就好。'}
          </p>
          {waitlisted ? (
            <div className="onboarding-progress-list" aria-label="候補處理進度">
              <div><span className="progress-check">✓</span><strong>孩子資料已收到</strong></div>
              <div><span className="progress-check">✓</span><strong>安全登入信已寄出</strong></div>
            </div>
          ) : (
            <Week1FastProgress progress={week1Progress} />
          )}
          <p className="muted">登入信只用來安全登入，不需要重複送出。若收件匣沒看到，請先檢查垃圾郵件或促銷分類。</p>
          <div className="onboarding-actions">
            <button className="button button-secondary" type="button" onClick={() => setMode('existing')}>已有信？前往登入</button>
          </div>
        </section>
      </div>
    )
  }

  if (mode === 'email') {
    return (
      <div className="onboarding-container landing-onboarding-panel">
        <header className="onboarding-welcome-header">
          <div className="onboarding-badge">{enrollment?.freePilotActive ? '🧪 紙屬英文 Beta · 目前 NT$0' : '第一週免費'}</div>
          <h2 className="onboarding-main-title">第一次使用？先填孩子資料</h2>
          <p className="onboarding-main-desc">不用考試、不綁卡。先填寫孩子的年級、興趣與每週時間；完成 3 個步驟後留下 Email，名額可用時就會排入第一週教材製作。</p>
        </header>
        <section className="onboarding-layout" aria-labelledby="landing-email-title">
          <div className="onboarding-heading">
            <p className="overline">孩子資料完成（第 3/3 步已完成）</p>
            <h2 id="landing-email-title">最後留下 Email，我們就開始準備第一週</h2>
            <p className="muted">剛剛填的資料不需要重填。送出後會排入第一週教材製作；完成後也會寄 Email 通知你。安全連結則用來登入與管理孩子。</p>
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
              disabled={busy}
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
                {busy ? '送出中…' : '開始準備第一週教材'}
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
        <div className="onboarding-badge">{enrollment?.freePilotActive ? '🧪 紙屬英文 Beta · 目前 NT$0' : '第一週免費'}</div>
        <h2 className="onboarding-main-title">第一次使用？先填孩子資料</h2>
        <p className="onboarding-main-desc">不用考試、不綁卡。先填寫孩子的年級、興趣與每週時間，完成 3 個步驟後留下 Email；名額可用時就會排入第一週教材製作。</p>
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
