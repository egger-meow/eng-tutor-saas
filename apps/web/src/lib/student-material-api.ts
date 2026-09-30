import { getSupabaseClient } from './supabase'
import type {
  StudentMaterialProjection,
  MaterialDraft,
  SaveDraftResult,
  DraftAnswers,
  DraftSelfCheck,
} from '../types/student-material'

export type SubmissionResult = {
  submitted_at: string
  next_requested?: boolean
  answers: DraftAnswers
  self_check: DraftSelfCheck
  results: Array<{ question_id: string; status: 'correct' | 'incorrect' | 'unanswered' | 'open_review'; correct_answer: string | null }>
}

export async function fetchStudentSubmission(materialId: string): Promise<SubmissionResult | null> {
  const { data, error } = await getSupabaseClient().rpc('get_student_material_submission', { p_material_id: materialId })
  if (error) throw error
  return data as SubmissionResult | null
}

export async function submitStudentMaterial(materialId: string, version: number): Promise<SubmissionResult | { conflict: true; version: number }> {
  const { data, error } = await getSupabaseClient().rpc('submit_student_material', { p_material_id: materialId, p_client_version: version })
  if (error) throw error
  return data as SubmissionResult | { conflict: true; version: number }
}

export async function saveStudentParentFeedback(materialId: string, input: {
  difficulty: number; completionRate: number; weakArea: string | null; comments: string;
  mistakesText?: string; childComments?: string
}): Promise<void> {
  const { error } = await getSupabaseClient().rpc('save_student_parent_feedback', {
    p_material_id: materialId, p_difficulty: input.difficulty, p_completion_rate: input.completionRate,
    p_weak_area: input.weakArea, p_mistakes_text: input.mistakesText ?? '', p_child_comments: input.childComments ?? '', p_parent_comments: input.comments,
  })
  if (error) throw error
}

export async function requestNextAfterSubmission(materialId: string): Promise<{
  requested: boolean; alreadyRequested?: boolean; reason?: string; used?: number; limit?: number
}> {
  const { data, error } = await getSupabaseClient().rpc('request_next_after_student_submission', { p_material_id: materialId })
  if (error) throw error
  return data as { requested: boolean; alreadyRequested?: boolean; reason?: string; used?: number; limit?: number }
}

export async function canOpenParentAnswer(materialId: string): Promise<boolean> {
  const { data, error } = await getSupabaseClient().rpc('can_open_parent_answer', { p_material_id: materialId })
  if (error) throw error
  return data === true
}

export async function fetchStudentMaterialProjection(
  materialId: string,
): Promise<{ data: StudentMaterialProjection | null; error: Error | null }> {
  try {
    const { data, error } = await getSupabaseClient()
      .rpc('get_student_material_projection', { p_material_id: materialId })
      .maybeSingle()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }
    if (!data) {
      return { data: null, error: null }
    }

    return { data: data as StudentMaterialProjection, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) }
  }
}

export async function fetchMaterialDraft(
  materialId: string,
): Promise<{ data: MaterialDraft | null; error: Error | null }> {
  try {
    const { data, error } = await getSupabaseClient()
      .rpc('get_material_draft', { p_material_id: materialId })
      .maybeSingle()

    if (error) {
      return { data: null, error: new Error(error.message) }
    }
    if (!data) {
      return {
        data: {
          answers: {},
          self_check: [],
          version: 0,
          updated_at: null,
        },
        error: null,
      }
    }

    const row = data as {
      answers: unknown
      self_check: unknown
      version: number
      updated_at: string | null
    }

    return {
      data: {
        answers: (row.answers && typeof row.answers === 'object' ? row.answers : {}) as DraftAnswers,
        self_check: (Array.isArray(row.self_check) ? row.self_check : []) as DraftSelfCheck,
        version: row.version ?? 0,
        updated_at: row.updated_at,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) }
  }
}

export async function saveMaterialDraft(
  materialId: string,
  answers: DraftAnswers,
  selfCheck: DraftSelfCheck,
  clientVersion: number,
): Promise<{ data: SaveDraftResult | null; error: Error | null }> {
  try {
    const { data, error } = await getSupabaseClient()
      .rpc('save_material_draft', {
        p_material_id: materialId,
        p_answers: answers,
        p_self_check: selfCheck,
        p_client_version: clientVersion,
      })

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    const row = data as {
      success: boolean
      version: number
      updated_at: string
      conflict: boolean
      answers: unknown
      self_check: unknown
    }

    return {
      data: {
        saved: row.success,
        version: row.version,
        updated_at: row.updated_at,
        conflict: row.conflict,
        server_answers: (row.answers && typeof row.answers === 'object'
          ? row.answers
          : null) as DraftAnswers | null,
        server_self_check: (Array.isArray(row.self_check)
          ? row.self_check
          : null) as DraftSelfCheck | null,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) }
  }
}

export async function createStudentPdfSignedUrl(pdfPath: string): Promise<string | null> {
  try {
    const storageClient = getSupabaseClient().storage
    if (!storageClient?.from || !pdfPath) return null
    const { data, error } = await storageClient
      .from('weekly-materials')
      .createSignedUrl(pdfPath, 1800)
    if (error || !data?.signedUrl) return null
    return data.signedUrl
  } catch {
    return null
  }
}
