import type { SupabaseClient } from '@supabase/supabase-js'

export type WaitlistStatus = 'waiting' | 'released' | 'converted' | 'canceled'

export interface OwnedWaitlistEntry {
  id: string
  childId: string
  status: WaitlistStatus
  createdAt: string
  releasedAt: string | null
  convertedAt: string | null
  notes: string | null
}

export async function listOwnedWaitlist(supabase: SupabaseClient): Promise<OwnedWaitlistEntry[]> {
  const { data, error } = await supabase
    .from('waitlist')
    .select('id, child_id, status, created_at, released_at, converted_at, notes')
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data || []).map((row: any) => ({
    id: row.id,
    childId: row.child_id,
    status: row.status,
    createdAt: row.created_at,
    releasedAt: row.released_at,
    convertedAt: row.converted_at,
    notes: row.notes,
  }))
}

export async function getChildWaitlistStatus(
  supabase: SupabaseClient,
  childId: string
): Promise<OwnedWaitlistEntry | null> {
  const { data, error } = await supabase
    .from('waitlist')
    .select('id, child_id, status, created_at, released_at, converted_at, notes')
    .eq('child_id', childId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    id: data.id,
    childId: data.child_id,
    status: data.status,
    createdAt: data.created_at,
    releasedAt: data.released_at,
    convertedAt: data.converted_at,
    notes: data.notes,
  }
}
