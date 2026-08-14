import { getSupabaseClient } from './supabase'

export type MaterialFeedback = {
  difficulty: number | null
  completion_rate: number | null
  weak_area: string | null
  mistakes_text: string | null
  child_comments: string | null
  parent_comments: string | null
  created_at: string
  updated_at?: string
}

export type GenerationSummary = {
  title: string | null
  learningFocus: string | null
  learningAdjustmentSummary: string | null
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
  release_at?: string | null
  week_number?: number | null
  feedback: MaterialFeedback | null
}

export type MaterialPage = {
  materials: Material[]
  hasMoreByChild: Record<string, boolean>
}

export type MaterialPageOptions = {
  limit?: number
  offset?: number
}

export function readGenerationSummary(summary: Record<string, unknown>): GenerationSummary {
  const stringOrNull = (value: unknown) => typeof value === 'string' && value.trim() ? value : null
  return {
    title: stringOrNull(summary.title),
    learningFocus: stringOrNull(summary.learningFocus),
    learningAdjustmentSummary: stringOrNull(summary.learningAdjustmentSummary),
  }
}

export type FeedbackInput = {
  difficulty: number
  completion_rate: number
  weak_area: string | null
  mistakes_text: string
  child_comments: string
  parent_comments: string
}

export async function listMaterials(childIds: string[], options: MaterialPageOptions = {}): Promise<MaterialPage> {
  if (childIds.length === 0) return { materials: [], hasMoreByChild: {} }
  const client = getSupabaseClient()
  const limit = options.limit ?? 5
  const offset = options.offset ?? 0
  const pages = await Promise.all(childIds.map(async (childId) => {
    const [page, firstMaterial] = await Promise.all([
      client
        .from('materials')
        .select('id, child_id, material_week, revision, student_pdf_path, parent_answer_pdf_path, generation_summary, created_at')
        .eq('child_id', childId)
        .order('material_week', { ascending: false })
        .order('revision', { ascending: false })
        .range(offset, offset + limit - 1),
      client
        .from('materials')
        .select('material_week')
        .eq('child_id', childId)
        .order('material_week', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ])
    if (page.error) throw page.error
    if (firstMaterial.error) throw firstMaterial.error
    return { childId, rows: page.data ?? [], firstMaterialWeek: firstMaterial.data?.material_week ?? null }
  }))
  const materials = pages.flatMap((page) => page.rows)
  const materialIds = materials.map((material) => material.id)
  const [{ data: feedback, error: feedbackError }, { data: jobs, error: jobsError }] = await Promise.all([
    client.from('feedback').select('material_id, difficulty, completion_rate, weak_area, mistakes_text, child_comments, parent_comments, created_at, updated_at').in('child_id', childIds).in('material_id', materialIds),
    materialIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : client.from('generation_jobs').select('material_id, child_id, release_at').in('child_id', childIds).in('material_id', materialIds),
  ])
  if (feedbackError) throw feedbackError
  if (jobsError) throw jobsError

  const feedbackByMaterial = new Map((feedback ?? []).map((item) => [item.material_id, item]))
  const releaseByMaterial = new Map((jobs ?? []).map((job) => [job.material_id, job.release_at as string]))
  const firstMaterialWeekByChild = new Map(pages.map((page) => [page.childId, page.firstMaterialWeek]))
  return {
    materials: materials.map((material) => ({
    ...material,
    generation_summary: material.generation_summary as Record<string, unknown>,
    release_at: releaseByMaterial.get(material.id) ?? null,
    week_number: materialWeekNumber(firstMaterialWeekByChild.get(material.child_id) ?? null, material.material_week),
    feedback: feedbackByMaterial.get(material.id) ?? null,
    })) as Material[],
    hasMoreByChild: Object.fromEntries(pages.map((page) => [page.childId, page.rows.length === limit])),
  }
}

export function isMaterialReleased(material: Material, now = new Date()): boolean {
  if (!material.release_at) return true
  const releaseAt = new Date(material.release_at)
  return !Number.isNaN(releaseAt.getTime()) && releaseAt <= now
}

export function materialWeekNumber(firstMaterialWeek: string | null, materialWeek: string): number | null {
  if (!firstMaterialWeek) return null
  const first = Date.parse(`${firstMaterialWeek}T00:00:00Z`)
  const current = Date.parse(`${materialWeek}T00:00:00Z`)
  if (Number.isNaN(first) || Number.isNaN(current) || current < first) return null
  return Math.floor((current - first) / 604_800_000) + 1
}

export function materialDownloadFilename(childName: string, materialWeek: string, kind: 'student' | 'parent', weekNumber: number | null = null): string {
  const safeChildName = Array.from(childName.trim(), (character) =>
    character.charCodeAt(0) < 32 || '\\/:*?"<>|'.includes(character) ? '-' : character
  ).join('') || '孩子'
  const label = kind === 'student' ? '學生教材' : '家長解答'
  const weekLabel = weekNumber ? `Week-${weekNumber}` : '教材'
  return `${safeChildName}-${weekLabel}-${materialWeek}-${label}.pdf`
}

export async function openMaterialDownload(path: string, filename: string): Promise<void> {
  const { data, error } = await getSupabaseClient().storage
    .from('weekly-materials')
    .createSignedUrl(path, 60)
  if (error) throw error

  const response = await fetch(data.signedUrl)
  if (!response.ok) throw new Error(`Material download failed (${response.status})`)

  const objectUrl = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
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
