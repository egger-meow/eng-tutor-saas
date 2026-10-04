import { getSupabaseClient } from './supabase'

export interface MaterialNavigationPosition {
  chapter_id: string
  question_id?: string | null
  version: number
  updated_at?: string
}

export interface SaveNavigationResult {
  saved: boolean
  conflict: boolean
  version: number
  chapter_id: string
  question_id?: string | null
  updated_at?: string
}

export async function fetchMaterialNavigation(
  materialId: string
): Promise<MaterialNavigationPosition | null> {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('get_material_learning_navigation', {
    p_material_id: materialId,
  })
  if (error) throw error
  if (!data) return null
  return data as MaterialNavigationPosition
}

export async function saveMaterialNavigation(
  materialId: string,
  chapterId: string,
  questionId: string | null = null,
  clientVersion: number = 0
): Promise<SaveNavigationResult> {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc('save_material_learning_navigation', {
    p_material_id: materialId,
    p_chapter_id: chapterId,
    p_question_id: questionId,
    p_client_version: clientVersion,
  })
  if (error) throw error
  return {
    saved: Boolean(data?.success),
    conflict: Boolean(data?.conflict),
    version: Number(data?.version ?? clientVersion),
    chapter_id: data?.chapter_id ?? chapterId,
    question_id: data?.question_id ?? questionId,
    updated_at: data?.updated_at,
  }
}
