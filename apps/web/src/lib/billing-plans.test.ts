import { describe, expect, it } from 'vitest'
import { annualMonthlyEquivalentTwd, annualSavingsPercent, annualSavingsTwd, formatPrice, planForSubscription } from './billing-plans'

describe('billing plan presentation', () => {
  it('computes the annual value from canonical prices', () => {
    expect(annualSavingsTwd).toBe(989)
    expect(annualMonthlyEquivalentTwd).toBe(417)
    expect(annualSavingsPercent).toBe(16.5)
  })

  it('maps stored subscription data to the correct cadence', () => {
    expect(planForSubscription('standard_annual', 'year').key).toBe('annual')
    expect(planForSubscription('standard_monthly', 'month').key).toBe('monthly')
  })

  it('formats amounts with comma separator', () => {
    expect(formatPrice(4999)).toBe('4,999')
    expect(formatPrice(499)).toBe('499')
  })
})
