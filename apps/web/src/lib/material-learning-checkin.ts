import type { SupabaseClient } from '@supabase/supabase-js'

export type LearningBarrier =
  | 'no_time'
  | 'cannot_print'
  | 'too_hard'
  | 'child_not_interested'
  | 'missed_email'

export type MaterialCheckinAction = 'barrier' | 'paper_started' | 'dismiss'

export interface MaterialLearningCheckin {
  barrier: LearningBarrier | null
  paper_started_at: string | null
  dismissed_until: string | null
}

const VALID_BARRIERS = new Set<LearningBarrier>([
  'no_time',
  'cannot_print',
  'too_hard',
  'child_not_interested',
  'missed_email',
])

export function parseMaterialLearningCheckin(raw: unknown): MaterialLearningCheckin | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>

  const barrierStr = typeof data.barrier === 'string' ? data.barrier : null
  const barrier: LearningBarrier | null = barrierStr && VALID_BARRIERS.has(barrierStr as LearningBarrier)
    ? (barrierStr as LearningBarrier)
    : null

  const paper_started_at = typeof data.paper_started_at === 'string' && data.paper_started_at.trim()
    ? data.paper_started_at.trim()
    : null

  const dismissed_until = typeof data.dismissed_until === 'string' && data.dismissed_until.trim()
    ? data.dismissed_until.trim()
    : null

  return {
    barrier,
    paper_started_at,
    dismissed_until,
  }
}

export function isCheckinDismissed(checkin: MaterialLearningCheckin | null): boolean {
  if (!checkin?.dismissed_until) return false
  const dismissedTime = new Date(checkin.dismissed_until).getTime()
  if (isNaN(dismissedTime)) return false
  return dismissedTime > Date.now()
}

export async function fetchMaterialLearningCheckin(
  supabase: SupabaseClient,
  materialId: string
): Promise<MaterialLearningCheckin | null> {
  if (!materialId) return null
  const { data, error } = await supabase.rpc('get_material_learning_checkin', {
    p_material_id: materialId,
  })
  if (error || !data) return null
  return parseMaterialLearningCheckin(data)
}

export async function saveMaterialLearningCheckin(
  supabase: SupabaseClient,
  materialId: string,
  action: MaterialCheckinAction,
  barrier?: LearningBarrier
): Promise<MaterialLearningCheckin | null> {
  if (!materialId) return null
  const { data, error } = await supabase.rpc('save_material_learning_checkin', {
    p_material_id: materialId,
    p_action: action,
    p_barrier: action === 'barrier' ? barrier ?? null : null,
  })
  if (error || !data) return null
  return parseMaterialLearningCheckin(data)
}
