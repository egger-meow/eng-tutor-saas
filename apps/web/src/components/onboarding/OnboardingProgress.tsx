import { profileStepCount } from '../../lib/profile-form'

export function OnboardingProgress({ step }: { step: number }) {
  return (
    <div className="onboarding-progress">
      <span>步驟 {step} / {profileStepCount}</span>
      <div className="progress-track" aria-hidden="true"><span style={{ width: `${(step / profileStepCount) * 100}%` }} /></div>
    </div>
  )
}

