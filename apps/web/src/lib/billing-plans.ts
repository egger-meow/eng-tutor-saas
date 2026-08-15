export type BillingPlan = 'monthly' | 'annual'
export type BillingInterval = 'month' | 'year'

export const billingPlans = {
  monthly: {
    key: 'monthly',
    planCode: 'standard_monthly',
    label: '月繳方案',
    priceTwd: 499,
    cadenceLabel: '每月',
    interval: 'month',
  },
  annual: {
    key: 'annual',
    planCode: 'standard_annual',
    label: '年繳方案',
    priceTwd: 4999,
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
