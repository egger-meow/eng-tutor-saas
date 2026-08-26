import { getSupabaseClient } from './supabase'
import { useEffect, useState } from 'react'

export type EnrollmentStatus = 'open' | 'waitlist' | 'closed'
export type EnrollmentState = {
  status: EnrollmentStatus
  capacity: number
  activeCount: number
  remaining: number
  foundingLimit: number
  foundingCount: number
  waitingCount?: number
  releasedCount?: number
}
type EnrollmentRow = {
  status: EnrollmentStatus
  capacity: number
  active_count: number
  remaining: number
  founding_limit: number
  founding_count: number
  waiting_count?: number
  released_count?: number
}

export async function getEnrollmentState(): Promise<EnrollmentState> {
  const { data, error } = await getSupabaseClient().rpc('get_enrollment_state')
  if (error) throw error
  const row = (data as EnrollmentRow[] | null)?.[0]
  if (!row) throw new Error('目前無法讀取招生名額，請稍後再試。')
  return {
    status: row.status,
    capacity: row.capacity,
    activeCount: row.active_count,
    remaining: row.remaining,
    foundingLimit: row.founding_limit,
    foundingCount: row.founding_count,
    waitingCount: row.waiting_count ?? 0,
    releasedCount: row.released_count ?? 0,
  }
}

export function useEnrollmentState() {
  const [state, setState] = useState<EnrollmentState | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => { void getEnrollmentState().then(setState).catch(() => setError(true)) }, [])
  return { state, error }
}

export type EnrollmentCta = { href: '#login' | '/waitlist'; label: string; isWaitlist: boolean }

export function getEnrollmentCta(state: EnrollmentState | null): EnrollmentCta {
  if (state && (state.status !== 'open' || state.remaining <= 0)) return { href: '/waitlist', label: '登記候補', isWaitlist: true }
  return { href: '#login', label: '免費取得第一週教材', isWaitlist: false }
}
