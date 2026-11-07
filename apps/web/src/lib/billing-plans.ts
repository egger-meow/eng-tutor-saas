export type BillingPlan = 'monthly' | 'annual'
export type BillingInterval = 'month' | 'year'

export const foundingPriceTwd = 99

// Stored price_twd is the catalog price; Founder subscriptions apply a recurring discount.
// Keep historical invoices/subscriptions truthful after the November price change.
export function effectiveSubscriptionPrice(priceTwd: number | null, isFounderMonthly: boolean): number | null {
  if (!isFounderMonthly || priceTwd === null) return priceTwd
  if (priceTwd === 499) return 349
  if (priceTwd === 149) return foundingPriceTwd
  return priceTwd
}

export const billingPlans = {
  monthly: {
    key: 'monthly',
    planCode: 'standard_monthly',
    label: '月繳方案',
    priceTwd: 149,
    cadenceLabel: '每月',
    interval: 'month',
  },
  annual: {
    key: 'annual',
    planCode: 'standard_annual',
    label: '年繳方案',
    priceTwd: 1499,
    cadenceLabel: '每年',
    interval: 'year',
  },
} as const

export const annualSavingsTwd = billingPlans.monthly.priceTwd * 12 - billingPlans.annual.priceTwd
export const annualMonthlyEquivalentTwd = Math.round(billingPlans.annual.priceTwd / 12)
export const annualSavingsPercent = Math.round(annualSavingsTwd / (billingPlans.monthly.priceTwd * 12) * 1000) / 10

export function formatPrice(amount: number): string {
  return amount.toLocaleString('en-US')
}

export function planForSubscription(planCode: string | null, interval: BillingInterval | null) {
  if (planCode === billingPlans.annual.planCode || interval === 'year') return billingPlans.annual
  return billingPlans.monthly
}
