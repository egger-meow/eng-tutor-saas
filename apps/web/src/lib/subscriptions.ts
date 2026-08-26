import { getSupabaseClient } from './supabase'
import type { BillingInterval, BillingPlan } from './billing-plans'

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled'
export type SubscriptionView = { id: string; childId: string; status: SubscriptionStatus; planCode: string | null; billingInterval: BillingInterval | null; priceTwd: number | null; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; foundingStatus: 'none' | 'eligible' | 'redeemed' | 'expired' | 'forfeited'; foundingReservedUntil?: string | null; foundingRedeemedAt?: string | null; foundingForfeitedAt?: string | null }
type SubscriptionRow = { id: string; child_id: string; status: SubscriptionStatus; plan_code: string | null; billing_interval: BillingInterval | null; price_twd: number | null; current_period_end: string | null; cancel_at_period_end: boolean; founding_status: SubscriptionView['foundingStatus']; founding_reserved_until: string | null; founding_redeemed_at: string | null; founding_forfeited_at: string | null }

export type CheckoutPreparation = { transactionId: string; plan: BillingPlan; billingInterval: BillingInterval; priceTwd: number; foundingApplies: boolean; checkoutPriceTwd: number }

export async function listOwnedSubscriptions(): Promise<SubscriptionView[]> {
  const { data, error } = await getSupabaseClient().from('subscriptions').select('id, child_id, status, plan_code, billing_interval, price_twd, current_period_end, cancel_at_period_end, founding_status, founding_reserved_until, founding_redeemed_at, founding_forfeited_at')
  if (error) throw error
  return (data as SubscriptionRow[]).map((row) => ({ id: row.id, childId: row.child_id, status: row.status, planCode: row.plan_code, billingInterval: row.billing_interval, priceTwd: row.price_twd, currentPeriodEnd: row.current_period_end, cancelAtPeriodEnd: row.cancel_at_period_end, foundingStatus: row.founding_status, foundingReservedUntil: row.founding_reserved_until, foundingRedeemedAt: row.founding_redeemed_at, foundingForfeitedAt: row.founding_forfeited_at }))
}

export async function prepareCheckout(childId: string, plan: BillingPlan): Promise<CheckoutPreparation> {
  const { data, error } = await getSupabaseClient().functions.invoke('paddle-checkout', {
    body: { child_id: childId, plan },
  })
  if (error) {
    let code = ''
    try {
      const response = error.context as Response | undefined
      const body = response ? await response.clone().json() as { error?: string } : null
      code = body?.error ?? ''
    } catch { /* Fall through to the generic message. */ }
    if (code === 'paddle_checkout_url_missing') {
      throw new Error('Paddle Sandbox 尚未設定預設付款連結，設定完成後即可測試付款。')
    }
    if (code === 'paddle_api_key_forbidden') {
      throw new Error('Paddle API key 缺少 Transactions 的讀取或建立權限，請更新 Sandbox API key 後再試。')
    }
    if (code === 'paddle_discount_not_verifiable' || code === 'paddle_discount_misconfigured') {
      throw new Error('Founding 30 優惠設定尚未通過驗證，請先確認 Paddle 折扣金額與適用期數。')
    }
    throw new Error('目前無法開啟安全付款，請稍後再試。')
  }
  if (!data?.transaction_id) throw new Error('付款交易未成功建立，請稍後再試。')
  if (data.plan !== plan || (data.billing_interval !== 'month' && data.billing_interval !== 'year')) {
    throw new Error('付款方案驗證失敗，請重新選擇方案。')
  }
  return {
    transactionId: data.transaction_id as string,
    plan,
    billingInterval: data.billing_interval,
    priceTwd: Number(data.price_twd),
    foundingApplies: data.founding_applies === true,
    checkoutPriceTwd: Number(data.checkout_price_twd),
  }
}

export type SubscriptionActionResult = {
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  reconciliationPending: boolean
}

export async function cancelSubscription(childId: string, reason?: string): Promise<SubscriptionActionResult> {
  const { data, error } = await getSupabaseClient().functions.invoke('paddle-cancel-subscription', {
    body: { child_id: childId, reason: reason?.trim() || undefined },
  })
  if (error) {
    let code = ''
    try {
      const response = error.context as Response | undefined
      const body = response ? await response.clone().json() as { error?: string } : null
      code = body?.error ?? ''
    } catch { /* Fall through to the generic message. */ }
    if (code === 'subscription_not_cancellable') throw new Error('這個訂閱目前無法取消，請重新整理後再試。')
    throw new Error('取消訂閱時發生問題，訂閱狀態尚未變更，請稍後再試。')
  }
  if (data?.cancel_at_period_end !== true) throw new Error('取消訂閱時發生問題，請稍後再試。')
  return {
    cancelAtPeriodEnd: true,
    currentPeriodEnd: (data.current_period_end as string | null) ?? null,
    reconciliationPending: data.reconciliation_pending === true,
  }
}

export async function resumeSubscription(childId: string): Promise<SubscriptionActionResult> {
  const { data, error } = await getSupabaseClient().functions.invoke('paddle-update-subscription', {
    body: { child_id: childId, action: 'resume' },
  })
  if (error) {
    let code = ''
    try {
      const response = error.context as Response | undefined
      const body = response ? await response.clone().json() as { error?: string } : null
      code = body?.error ?? ''
    } catch { /* Fall through to the generic message. */ }
    if (code === 'subscription_not_resumable') throw new Error('這個訂閱目前無法恢復，請重新整理後再試。')
    throw new Error('恢復續訂時發生問題，請稍後再試。')
  }
  if (data?.cancel_at_period_end !== false) throw new Error('恢復續訂時發生問題，請稍後再試。')
  return {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: (data.current_period_end as string | null) ?? null,
    reconciliationPending: data.reconciliation_pending === true,
  }
}


