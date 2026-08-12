import { getSupabaseClient } from './supabase'

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled'
export type SubscriptionView = { id: string; childId: string; status: SubscriptionStatus; planCode: string | null; priceTwd: number | null; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; foundingStatus: 'none' | 'eligible' | 'redeemed' }
type SubscriptionRow = { id: string; child_id: string; status: SubscriptionStatus; plan_code: string | null; price_twd: number | null; current_period_end: string | null; cancel_at_period_end: boolean; founding_status: SubscriptionView['foundingStatus'] }

export type CheckoutPreparation = { transactionId: string; foundingApplies: boolean; firstMonthPriceTwd: number }

export async function listOwnedSubscriptions(): Promise<SubscriptionView[]> {
  const { data, error } = await getSupabaseClient().from('subscriptions').select('id, child_id, status, plan_code, price_twd, current_period_end, cancel_at_period_end, founding_status')
  if (error) throw error
  return (data as SubscriptionRow[]).map((row) => ({ id: row.id, childId: row.child_id, status: row.status, planCode: row.plan_code, priceTwd: row.price_twd, currentPeriodEnd: row.current_period_end, cancelAtPeriodEnd: row.cancel_at_period_end, foundingStatus: row.founding_status }))
}

export async function prepareCheckout(childId: string): Promise<CheckoutPreparation> {
  const { data, error } = await getSupabaseClient().functions.invoke('paddle-checkout', {
    body: { child_id: childId },
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
    throw new Error('目前無法開啟安全付款，請稍後再試。')
  }
  if (!data?.transaction_id) throw new Error('付款交易未成功建立，請稍後再試。')
  return {
    transactionId: data.transaction_id as string,
    foundingApplies: data.founding_applies === true,
    firstMonthPriceTwd: Number(data.first_month_price_twd),
  }
}
