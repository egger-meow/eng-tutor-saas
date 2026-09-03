import { describe, expect, it } from 'vitest'
import type { FunnelStepMetric } from '../../client/types.js'
import { normalizeLandingFirstFunnel } from './landing-first-funnel.js'

function step(name: FunnelStepMetric['name'], uniqueVisitors: number): FunnelStepMetric {
  return {
    name,
    label: name,
    description: name,
    count: uniqueVisitors,
    uniqueVisitors,
    conversionFromPrevPercent: 0,
    conversionFromLandingPercent: 0,
    dropOffCount: 0,
    dropOffPercent: 0,
  }
}

describe('landing-first admin funnel', () => {
  it('keeps Magic Link auth outside the seven-step acquisition funnel', () => {
    const result = normalizeLandingFirstFunnel([
      step('landing_view', 100),
      step('sample_click', 50),
      step('free_trial_click', 40),
      step('email_submit', 25),
      step('auth_complete', 15),
      step('child_form_start', 35),
      step('child_created', 18),
      step('onboarding_complete', 18),
    ])

    expect(result.steps.map((item) => item.name)).toEqual([
      'landing_view',
      'sample_click',
      'free_trial_click',
      'child_form_start',
      'email_submit',
      'child_created',
      'onboarding_complete',
    ])
    expect(result.steps[3]?.conversionFromPrevPercent).toBe(87.5)
    expect(result.steps[4]?.conversionFromPrevPercent).toBe(71.4)
    expect(result.steps[5]?.conversionFromPrevPercent).toBe(72)
    expect(result.steps[6]?.conversionFromPrevPercent).toBe(100)
    expect(result.steps.some((item) => item.name === 'auth_complete')).toBe(false)
    expect(result.biggestDropOff?.fromName).toBe('landing_view')
    expect(result.biggestDropOff?.toName).toBe('sample_click')
  })
})
