import { profileStepCount } from '../../lib/profile-form'

export function OnboardingProgress({ step, totalSteps = profileStepCount }: { step: number; totalSteps?: number }) {
  return (
    <div className="onboarding-progress">
      <span>步驟 {step} / {totalSteps}</span>
      <div className="progress-track" aria-hidden="true"><span style={{ width: `${(step / totalSteps) * 100}%` }} /></div>
    </div>
  )
}

