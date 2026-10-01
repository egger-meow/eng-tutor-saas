import { getSupabaseClient } from './supabase'

export type MaterialLearningEvent = 'material_opened' | 'answer_started' | 'save_failed'
  | 'student_downloaded' | 'parent_downloaded'

// Fixed arguments only: no URLs, attribution, names, answers, or arbitrary metadata.
// Telemetry is best effort and must never block reading, saving, or submission.
export async function recordMaterialLearningEvent(materialId: string, event: MaterialLearningEvent): Promise<void> {
  try {
    await getSupabaseClient().rpc('record_material_learning_event', {
      p_material_id: materialId, p_event_name: event,
    })
  } catch { /* A missing telemetry endpoint must not interrupt the lesson. */ }
}
