import type { FunnelStepMetric, FunnelStepName } from '../../client/types.js'

const LANDING_FIRST_ORDER: FunnelStepName[] = [
  'landing_view',
  'sample_click',
  'free_trial_click',
  'child_form_start',
  'email_submit',
  'child_created',
  'onboarding_complete',
]

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export type LandingFirstDropOff = {
  fromName: FunnelStepName
  toName: FunnelStepName
  fromLabel: string
  toLabel: string
  count: number
  percent: number
} | null

export function normalizeLandingFirstFunnel(input: FunnelStepMetric[]): {
  steps: FunnelStepMetric[]
  biggestDropOff: LandingFirstDropOff
} {
  const byName = new Map(input.map((step) => [step.name, step]))
  const ordered = LANDING_FIRST_ORDER.flatMap((name) => {
    const step = byName.get(name)
    return step ? [step] : []
  })
  const landingUnique = ordered.find((step) => step.name === 'landing_view')?.uniqueVisitors ?? 0

  const steps = ordered.map((step, index) => {
    const previousUnique = index === 0 ? 0 : ordered[index - 1]?.uniqueVisitors ?? 0
    const dropOffCount = index === 0 ? 0 : Math.max(0, previousUnique - step.uniqueVisitors)
    const conversionFromPrevPercent = index === 0
      ? 100
      : previousUnique === 0
        ? 0
        : round1((step.uniqueVisitors / previousUnique) * 100)
    const conversionFromLandingPercent = landingUnique === 0
      ? 0
      : round1((step.uniqueVisitors / landingUnique) * 100)
    const dropOffPercent = index === 0 || previousUnique === 0
      ? 0
      : round1((dropOffCount / previousUnique) * 100)

    return {
      ...step,
      conversionFromPrevPercent,
      conversionFromLandingPercent,
      dropOffCount,
      dropOffPercent,
    }
  })

  let biggestDropOff: LandingFirstDropOff = null
  for (let index = 1; index < steps.length; index += 1) {
    const current = steps[index]
    const previous = steps[index - 1]
    if (!current || !previous || current.dropOffCount <= 0) continue
    if (!biggestDropOff || current.dropOffCount > biggestDropOff.count) {
      biggestDropOff = {
        fromName: previous.name,
        toName: current.name,
        fromLabel: previous.label,
        toLabel: current.label,
        count: current.dropOffCount,
        percent: current.dropOffPercent,
      }
    }
  }

  return { steps, biggestDropOff }
}
