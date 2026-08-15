export type BillingPlan = 'monthly' | 'annual'
export type BillingInterval = 'month' | 'year'

export type PaddlePlan = {
  key: BillingPlan
  planCode: 'standard_monthly' | 'standard_annual'
  billingInterval: BillingInterval
  priceTwd: 499 | 4999
  priceId: string
}

export type PaddleSubscriptionItem = {
  quantity?: number
  price?: {
    id?: string
    unit_price?: { amount?: string; currency_code?: string }
    billing_cycle?: { interval?: string; frequency?: number }
  }
}

export type PaddleDiscount = {
  type?: string
  amount?: string
  currency_code?: string
  recur?: boolean
  maximum_recurring_intervals?: number | null
  status?: string
}

export function getCheckoutPlan(
  key: unknown,
  priceIds: { monthly: string; annual: string },
): PaddlePlan {
  if (key === 'monthly') {
    return { key, planCode: 'standard_monthly', billingInterval: 'month', priceTwd: 499, priceId: priceIds.monthly }
  }
  if (key === 'annual') {
    return { key, planCode: 'standard_annual', billingInterval: 'year', priceTwd: 4999, priceId: priceIds.annual }
  }
  throw new Error('Unsupported billing plan')
}

export function getWebhookPlan(
  items: PaddleSubscriptionItem[] | undefined,
  priceIds: { monthly: string; annual: string },
): PaddlePlan {
  if (!items || items.length !== 1) throw new Error('Expected exactly one Paddle subscription item')
  const item = items[0]
  const plan = item.price?.id === priceIds.monthly
    ? getCheckoutPlan('monthly', priceIds)
    : item.price?.id === priceIds.annual
      ? getCheckoutPlan('annual', priceIds)
      : null
  if (!plan) throw new Error('Unknown Paddle subscription price')

  const amount = item.price?.unit_price?.amount
  const expectedMinorAmount = String(plan.priceTwd * 100)
  if (item.quantity !== 1
    || item.price?.billing_cycle?.interval !== plan.billingInterval
    || item.price?.billing_cycle?.frequency !== 1
    || item.price?.unit_price?.currency_code !== 'TWD'
    || amount !== expectedMinorAmount) {
    throw new Error('Paddle subscription price details do not match configured plan')
  }
  return plan
}

export function validateFoundingDiscount(discount: PaddleDiscount | undefined): void {
  if (discount?.status !== 'active'
    || discount.type !== 'flat'
    || discount.amount !== '20000'
    || discount.currency_code !== 'TWD'
    || discount.recur !== true
    || discount.maximum_recurring_intervals !== 1) {
    throw new Error('Founding discount must be an active TWD 200 flat discount for one recurring interval')
  }
}
