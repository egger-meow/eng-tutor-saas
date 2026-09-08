import type { ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { OnboardingProgress } from './OnboardingProgress'
import { easings } from '../motion/motion-tokens'

type OnboardingLayoutProps = {
  step: number
  totalSteps?: number
  title: string
  description: string
  children: ReactNode
  actions: ReactNode
}

export function OnboardingLayout({ step, totalSteps, title, description, children, actions }: OnboardingLayoutProps) {
  const reduceMotion = useReducedMotion()

  return (
    <section className="onboarding-layout">
      <OnboardingProgress step={step} totalSteps={totalSteps} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={reduceMotion ? false : { opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, x: -12 }}
          transition={{ duration: 0.24, ease: easings.paperSettle }}
        >
          <div className="onboarding-heading">
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="onboarding-fields">{children}</div>
        </motion.div>
      </AnimatePresence>
      <div className="onboarding-actions">{actions}</div>
    </section>
  )
}
