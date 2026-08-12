import { getSupabaseClient } from './supabase'

export type EnrollmentStatus = 'open' | 'waitlist' | 'closed'
export type EnrollmentState = { status: EnrollmentStatus; capacity: number; activeCount: number; remaining: number; foundingLimit: number }
type EnrollmentRow = { status: EnrollmentStatus; capacity: number; active_count: number; remaining: number; founding_limit: number }

export async function getEnrollmentState(): Promise<EnrollmentState> {
  const { data, error } = await getSupabaseClient().rpc('get_enrollment_state')
  if (error) throw error
  const row = (data as EnrollmentRow[] | null)?.[0]
  if (!row) throw new Error('目前無法讀取招生名額，請稍後再試。')
  return { status: row.status, capacity: row.capacity, activeCount: row.active_count, remaining: row.remaining, foundingLimit: row.founding_limit }
}
