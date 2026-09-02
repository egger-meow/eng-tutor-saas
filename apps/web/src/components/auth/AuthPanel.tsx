import { EmailAuthPanel } from './EmailAuthPanel'
import { LandingOnboardingPanel } from './LandingOnboardingPanel'

export function AuthPanel() {
  const isPublicLanding = typeof window === 'undefined' || window.location.pathname === '/'
  if (!isPublicLanding) {
    return <EmailAuthPanel />
  }

  return (
    <div className="landing-auth-grid">
      <div className="landing-auth-card landing-onboarding-card" id="onboarding">
        <LandingOnboardingPanel />
      </div>
      <div className="landing-auth-card landing-login-card" id="login">
        <EmailAuthPanel
          inputId="login-email"
          overline="已有帳號？"
          title="已有帳號？直接登入"
          description="輸入原本使用的家長 Email，我們會寄送無密碼登入連結，直接回到孩子管理畫面。不需要重新填寫孩子資料。"
          buttonText="寄送登入連結"
        />
      </div>
    </div>
  )
}
