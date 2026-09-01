import { EmailAuthPanel } from './EmailAuthPanel'
import { LandingOnboardingPanel } from './LandingOnboardingPanel'

export function AuthPanel() {
  const isPublicLanding = typeof window !== 'undefined' && window.location.pathname === '/'
  return isPublicLanding ? <LandingOnboardingPanel /> : <EmailAuthPanel />
}
