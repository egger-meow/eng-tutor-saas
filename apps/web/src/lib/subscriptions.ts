import { getSupabaseClient } from './supabase'

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled'
export type SubscriptionView = { id: string; childId: string; status: SubscriptionStatus; planCode: string | null; priceTwd: number | null; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; foundingStatus: 'none' | 'eligible' | 'redeemed' }
type SubscriptionRow = { id: string; child_id: string; status: SubscriptionStatus; plan_code: string | null; price_twd: number | null; current_period_end: string | null; cancel_at_period_end: boolean; founding_status: SubscriptionView['foundingStatus'] }

export async function listOwnedSubscriptions(): Promise<SubscriptionView[]> {
  const { data, error } = await getSupabaseClient().from('subscriptions').select('id, child_id, status, plan_code, price_twd, current_period_end, cancel_at_period_end, founding_status')
  if (error) throw error
  return (data as SubscriptionRow[]).map((row) => ({ id: row.id, childId: row.child_id, status: row.status, planCode: row.plan_code, priceTwd: row.price_twd, currentPeriodEnd: row.current_period_end, cancelAtPeriodEnd: row.cancel_at_period_end, foundingStatus: row.founding_status }))
}
