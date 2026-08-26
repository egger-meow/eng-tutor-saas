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
  id?: string
  type?: string
  amount?: string
  currency_code?: string
  recur?: boolean
  maximum_recurring_intervals?: number | null
  status?: string
  restrict_to?: string[] | null
}

export type PaddleSubscriptionDiscount = {
  id?: string
  status?: string
  type?: string
  ends_at?: string | null
}

export type FounderClaimNeutralizationAction = 'remove_discount' | 'cancel' | 'release_canceled' | 'retain'

export function getFounderClaimNeutralizationAction(
  status: unknown,
  discountId: unknown,
  expectedDiscountId: string,
): FounderClaimNeutralizationAction {
  if (status === 'canceled') return 'release_canceled'
  if (status === 'draft' && discountId === expectedDiscountId) return 'remove_discount'
  if (status === 'ready' || status === 'billed') return 'cancel'
  return 'retain'
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

export function getPaddleApiBaseUrl(envValue: string | undefined): string {
  const trimmed = envValue?.trim()
  if (!trimmed) {
    throw new Error('PADDLE_API_BASE_URL is not configured')
  }
  return trimmed.replace(/\/+$/, '')
}

export function validateFoundingDiscount(discount: PaddleDiscount | undefined, monthlyPriceId: string): void {
  if (discount?.status !== 'active'
    || discount.type !== 'flat'
    || discount.amount !== '20000'
    || discount.currency_code !== 'TWD'
    || discount.recur !== true
    || discount.maximum_recurring_intervals !== null
    || !Array.isArray(discount.restrict_to)
    || discount.restrict_to.length !== 1
    || discount.restrict_to[0] !== monthlyPriceId) {
    throw new Error('Founding discount must be an active forever-recurring TWD 200 flat discount restricted to the standard monthly price')
  }
}


export function getWebhookFoundingDiscount(discount: PaddleSubscriptionDiscount | null | undefined) {
  return {
    id: discount?.id ?? null,
    status: discount?.status ?? null,
    type: discount?.type ?? null,
    endsAt: discount?.ends_at ?? null,
    endsAtPresent: discount != null && Object.prototype.hasOwnProperty.call(discount, 'ends_at'),
  }
}
