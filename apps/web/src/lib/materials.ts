import { getSupabaseClient } from './supabase'

export type MaterialFeedback = {
  difficulty: number | null
  completion_rate: number | null
  weak_area: string | null
  mistakes_text: string | null
  child_comments: string | null
  parent_comments: string | null
  created_at: string
}

export type Material = {
  id: string
  child_id: string
  material_week: string
  revision: number
  student_pdf_path: string
  parent_answer_pdf_path: string
  generation_summary: Record<string, unknown>
  created_at: string
  feedback: MaterialFeedback | null
}

export type FeedbackInput = {
  difficulty: number
  completion_rate: number
  weak_area: string | null
  mistakes_text: string
  child_comments: string
  parent_comments: string
}

export async function listMaterials(childIds: string[]): Promise<Material[]> {
  if (childIds.length === 0) return []
  const client = getSupabaseClient()
  const [{ data: materials, error: materialsError }, { data: feedback, error: feedbackError }] = await Promise.all([
    client.from('materials').select('id, child_id, material_week, revision, student_pdf_path, parent_answer_pdf_path, generation_summary, created_at').in('child_id', childIds).order('material_week', { ascending: false }),
    client.from('feedback').select('material_id, difficulty, completion_rate, weak_area, mistakes_text, child_comments, parent_comments, created_at').in('child_id', childIds),
  ])
  if (materialsError) throw materialsError
  if (feedbackError) throw feedbackError

  const feedbackByMaterial = new Map((feedback ?? []).map((item) => [item.material_id, item]))
  return (materials ?? []).map((material) => ({
    ...material,
    generation_summary: material.generation_summary as Record<string, unknown>,
    feedback: feedbackByMaterial.get(material.id) ?? null,
  })) as Material[]
}

export async function openMaterialDownload(path: string, filename: string): Promise<void> {
  const { data, error } = await getSupabaseClient().storage
    .from('weekly-materials')
    .createSignedUrl(path, 60, { download: filename })
  if (error) throw error
  window.location.assign(data.signedUrl)
}

export async function saveFeedback(childId: string, materialId: string, input: FeedbackInput): Promise<void> {
  const { error } = await getSupabaseClient().from('feedback').upsert({
    child_id: childId,
    material_id: materialId,
    ...input,
    weak_area: input.weak_area || null,
    mistakes_text: input.mistakes_text.trim() || null,
    child_comments: input.child_comments.trim() || null,
    parent_comments: input.parent_comments.trim() || null,
  }, { onConflict: 'child_id,material_id' })
  if (error) throw error
}
