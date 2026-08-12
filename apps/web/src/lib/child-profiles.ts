import { getSupabaseClient } from './supabase'

export type ChildProfile = {
  child_id: string
  baseline_level: string | null
  reading_level: string | null
  vocabulary_level: string | null
  grammar_level: string | null
  weekly_minutes: number | null
  learning_goals: string | null
  school_progress: string | null
  parent_expectations: string | null
  preferences: Record<string, unknown>
  updated_at: string
}

export type ChildProfileInput = Omit<ChildProfile, 'child_id' | 'updated_at'>

export async function listChildProfiles(childIds: string[]): Promise<ChildProfile[]> {
  if (childIds.length === 0) return []
  const { data, error } = await getSupabaseClient()
    .from('child_profiles')
    .select('child_id, baseline_level, reading_level, vocabulary_level, grammar_level, weekly_minutes, learning_goals, school_progress, parent_expectations, preferences, updated_at')
    .in('child_id', childIds)
  if (error) throw error
  return (data ?? []).map((profile) => ({
    ...profile,
    preferences: (profile.preferences ?? {}) as Record<string, unknown>,
  })) as ChildProfile[]
}

export async function saveChildProfile(childId: string, input: ChildProfileInput): Promise<void> {
  const { error } = await getSupabaseClient().from('child_profiles').upsert({ child_id: childId, ...input })
  if (error) throw error
}

