import { describe, expect, it } from 'vitest'
import { annualMonthlyEquivalentTwd, annualSavingsPercent, annualSavingsTwd, effectiveSubscriptionPrice, formatPrice, planForSubscription } from './billing-plans'

describe('billing plan presentation', () => {
  it('shows new and historical Founder prices from the stored catalog price', () => {
    expect(effectiveSubscriptionPrice(149, true)).toBe(99)
    expect(effectiveSubscriptionPrice(499, true)).toBe(349)
    expect(effectiveSubscriptionPrice(499, false)).toBe(499)
    expect(effectiveSubscriptionPrice(1499, false)).toBe(1499)
    expect(effectiveSubscriptionPrice(null, true)).toBe(null)
  })
  it('computes the annual value from canonical prices', () => {
    expect(annualSavingsTwd).toBe(289)
    expect(annualMonthlyEquivalentTwd).toBe(125)
    expect(annualSavingsPercent).toBe(16.2)
  })

  it('maps stored subscription data to the correct cadence', () => {
    expect(planForSubscription('standard_annual', 'year').key).toBe('annual')
    expect(planForSubscription('standard_monthly', 'month').key).toBe('monthly')
  })

  it('formats amounts with comma separator', () => {
    expect(formatPrice(1499)).toBe('1,499')
    expect(formatPrice(149)).toBe('149')
  })
})
