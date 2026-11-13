import { useState, useEffect } from 'react'
import { EmailAuthPanel } from './EmailAuthPanel'
import { LandingOnboardingPanel } from './LandingOnboardingPanel'

export function AuthPanel({ isPublicLanding = false }: { isPublicLanding?: boolean } = {}) {
  const [mode, setMode] = useState<'onboarding' | 'login'>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#login') {
      return 'login'
    }
    return 'onboarding'
  })

  const [navigationRequest, setNavigationRequest] = useState(0)
  const switchMode = (next: 'onboarding' | 'login') => {
    setMode(next)
    setNavigationRequest(value => value + 1)
  }

  useEffect(() => {
    if (!isPublicLanding) return
    const handleHash = () => {
      if (typeof window !== 'undefined' && window.location.hash === '#login') {
        switchMode('login')
      } else if (typeof window !== 'undefined' && window.location.hash === '#onboarding') {
        switchMode('onboarding')
      }
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)
    window.addEventListener('paper-english:route-change', handleHash)
    return () => {
      window.removeEventListener('hashchange', handleHash)
      window.removeEventListener('paper-english:route-change', handleHash)
    }
  }, [isPublicLanding])

  useEffect(() => {
    if (!isPublicLanding || navigationRequest === 0) return
    // Position only after the new card has replaced the taller questionnaire.
    const frame = window.requestAnimationFrame(() => {
      const card = document.getElementById(mode)
      card?.scrollIntoView({ behavior: 'instant', block: 'start' })
      card?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [isPublicLanding, mode, navigationRequest])

  if (!isPublicLanding) {
    return <EmailAuthPanel />
  }

  return (
    <div className="landing-auth-single-track">
      {mode === 'onboarding' ? (
        <div className="landing-auth-card landing-onboarding-card" id="onboarding">
          <LandingOnboardingPanel onSwitchToLogin={() => switchMode('login')} />
        </div>
      ) : (
        <div className="landing-auth-card landing-login-card" id="login">
          <EmailAuthPanel
            inputId="login-email"
            overline="舊生家長專區"
            title="已有帳號？直接登入"
            description="輸入原本使用的家長 Email，我們會寄送無密碼登入連結，直接回到孩子管理畫面。不需要重新填寫孩子資料。"
            buttonText="寄送登入連結"
          />
          <div style={{ marginTop: 'var(--space-3)', textAlign: 'center' }}>
            <button
              type="button"
              className="button-link text-link"
              onClick={() => switchMode('onboarding')}
            >
              ← 首次使用？點此返回為孩子建立檔案並領取免費教材
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

