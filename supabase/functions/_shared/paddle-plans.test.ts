import { describe, expect, it } from 'vitest'
import { getCheckoutPlan, getWebhookPlan, validateFoundingDiscount } from './paddle-plans'

const priceIds = { monthly: 'pri_monthly', annual: 'pri_annual' }

describe('Paddle plan allowlist', () => {
  it('maps semantic checkout plans to canonical server plans', () => {
    expect(getCheckoutPlan('monthly', priceIds)).toMatchObject({ planCode: 'standard_monthly', billingInterval: 'month', priceTwd: 499 })
    expect(getCheckoutPlan('annual', priceIds)).toMatchObject({ planCode: 'standard_annual', billingInterval: 'year', priceTwd: 4999 })
    expect(() => getCheckoutPlan('pri_attacker', priceIds)).toThrow('Unsupported billing plan')
  })

  it('accepts only the configured annual price with matching recurring details', () => {
    expect(getWebhookPlan([{
      quantity: 1,
      price: {
        id: 'pri_annual',
        unit_price: { amount: '499900', currency_code: 'TWD' },
        billing_cycle: { interval: 'year', frequency: 1 },
      },
    }], priceIds)).toMatchObject({ key: 'annual', planCode: 'standard_annual', priceTwd: 4999 })
  })

  it('rejects unknown prices and mismatched amounts or intervals', () => {
    expect(() => getWebhookPlan([{ quantity: 1, price: { id: 'pri_unknown' } }], priceIds)).toThrow('Unknown')
    expect(() => getWebhookPlan([{
      quantity: 1,
      price: {
        id: 'pri_annual',
        unit_price: { amount: '49900', currency_code: 'TWD' },
        billing_cycle: { interval: 'month', frequency: 1 },
      },
    }], priceIds)).toThrow('do not match')
  })

  it('accepts only a one-period TWD 200 founding discount', () => {
    expect(() => validateFoundingDiscount({
      status: 'active', type: 'flat', amount: '20000', currency_code: 'TWD',
      recur: true, maximum_recurring_intervals: 1,
    })).not.toThrow()
    expect(() => validateFoundingDiscount({
      status: 'active', type: 'flat', amount: '20000', currency_code: 'TWD',
      recur: true, maximum_recurring_intervals: null,
    })).toThrow('one recurring interval')
  })
})
