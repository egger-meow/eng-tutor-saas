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
  totalDemand?: number
  freePilotActive?: boolean
  freePilotAdmissions?: number
  freePilotLimit?: number
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
  total_demand?: number
  free_pilot_active?: boolean
  free_pilot_admissions?: number
  free_pilot_limit?: number
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
    totalDemand: row.total_demand,
    freePilotActive: row.free_pilot_active ?? false,
    freePilotAdmissions: row.free_pilot_admissions ?? 0,
    freePilotLimit: row.free_pilot_limit ?? 100,
  }
}

export function useEnrollmentState(initialState?: EnrollmentState | null) {
  const [state, setState] = useState<EnrollmentState | null>(initialState ?? null)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (initialState !== undefined) return
    void getEnrollmentState().then(setState).catch(() => setError(true))
  }, [initialState])
  return { state, error }
}

export type EnrollmentCta = { href: '#onboarding' | '#login' | '/waitlist'; label: string; isWaitlist: boolean }

export function getEnrollmentCta(state: EnrollmentState | null): EnrollmentCta {
  if (!state) return { href: '#onboarding', label: '確認目前名額…', isWaitlist: false }
  if (state.status !== 'open' || state.remaining <= 0) return { href: '/waitlist', label: '登記候補', isWaitlist: true }
  if (state.freePilotActive) {
    return { href: '#onboarding', label: '立即免費開始（每週專屬教材 NT$0）', isWaitlist: false }
  }
  return { href: '#onboarding', label: '免費取得第一週教材', isWaitlist: false }
}
