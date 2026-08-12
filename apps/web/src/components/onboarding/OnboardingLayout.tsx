import type { ReactNode } from 'react'
import { OnboardingProgress } from './OnboardingProgress'

type OnboardingLayoutProps = { step: number; title: string; description: string; children: ReactNode; actions: ReactNode }

export function OnboardingLayout({ step, title, description, children, actions }: OnboardingLayoutProps) {
  return (
    <section className="onboarding-layout">
      <OnboardingProgress step={step} />
      <div className="onboarding-heading"><h1>{title}</h1><p>{description}</p></div>
      <div className="onboarding-fields">{children}</div>
      <div className="onboarding-actions">{actions}</div>
    </section>
  )
}

