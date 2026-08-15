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
  personalizationReasons: string[]
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
  nextJobReleaseAtByChild: Record<string, string | null>
  hasPastDueUnmaterializedJobByChild: Record<string, boolean>
}

export type MaterialPageOptions = {
  limit?: number
  offset?: number
}

export function findNextFutureJobReleaseAt(
  jobs: Array<{ release_at?: string | null }>,
  now = new Date(),
): string | null {
  const nowMs = now.getTime()
  const futureJobs = jobs
    .filter((j): j is { release_at: string } => typeof j.release_at === 'string' && Boolean(j.release_at.trim()))
    .map((j) => ({ release_at: j.release_at.trim(), time: Date.parse(j.release_at.trim()) }))
    .filter((j) => !Number.isNaN(j.time) && j.time > nowMs)
    .sort((a, b) => a.time - b.time)

  return futureJobs[0]?.release_at ?? null
}

export const FORBIDDEN_PERSONALIZATION_JARGON_PATTERNS = [
  // Implementation / field names
  /\bfeedbackMissing\b/i,
  /\bruleVersion\b/i,
  /\binputFingerprint\b/i,
  /\b[a-zA-Z_]+=(?:true|false|\d+)\b/,

  // English curriculum-engine terminology
  /\bproduction packet\b/i,
  /\bguided\b/i,
  /\bindependent\b/i,
  /\bcap-transfer\b/i,
  /\bCAP\b/,
  /\bretrieval\b/i,
  /\bproduction\b/i,
  /\bscaffolding\b/i,
  /\bbaseline\b/i,
  /\bpacket\b/i,
  /\btoken\b/i,

  // Specification / rule terminology
  /feedback-missing/i,
  /fallback rule/i,
  /rule version/i,
  /規格規則/i,

  // Measurement / debug language
  /observable baseline/i,
  /instrumentation/i,
  /evidence pipeline/i,
  /可量測基準/i,
  /可觀察基線/i,
  /量測基準/i,
  /觀察基線/i,
  /提示前後證據/i,
  /留下提示前後證據/i,
  /可觀察證據/i,

  // Scheduler / generator logic statements
  /\bscheduler\b/i,
  /\bgenerator\b/i,
  /\bworker\b/i,
  /排程器/i,
  /產生器/i,
  /生成管線/i,
  /佇列/i,

  // Silence-mastery tropes / AI meta reasoning
  /silence is not mastery/i,
  /不把\s*silence\s*當\s*mastery/i,
  /沒有把沉默視為掌握/i,
  /不把沉默當作掌握/i,
  /不把沉默當成掌握/i,
  /不把沉默視為掌握/i,
  /不把沉默當作學會/i,
  /沒有把沉默當作掌握/i,
]

export function hasForbiddenPersonalizationJargon(text: string): boolean {
  return FORBIDDEN_PERSONALIZATION_JARGON_PATTERNS.some((pattern) => pattern.test(text))
}

export function readGenerationSummary(
  summary: Record<string, unknown> | null | undefined,
  weekNumber?: number | null,
): GenerationSummary {
  if (!summary || typeof summary !== 'object') {
    return {
      title: null,
      learningFocus: null,
      learningAdjustmentSummary: null,
      personalizationReasons: [],
    }
  }

  const stringOrNull = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null
  const arrayOrEmpty = (value: unknown) => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && Boolean(v.trim())).map(v => v.trim()) : []
  const cleanArray = (value: unknown) => arrayOrEmpty(value).filter((v) => !hasForbiddenPersonalizationJargon(v))

  const parentSummary = typeof summary.parentSummary === 'object' && summary.parentSummary !== null
    ? summary.parentSummary as Record<string, unknown>
    : null

  const title = stringOrNull(summary.title)
  const learningFocus = stringOrNull(summary.learningFocus) ??
    (parentSummary ? stringOrNull(parentSummary.focusZh) : null) ??
    stringOrNull(summary.theme)

  // 1. Canonical source of truth: parentSummary.personalizationZh or top-level personalizationZh
  const canonicalPersonalization = cleanArray(summary.personalizationZh).length > 0
    ? cleanArray(summary.personalizationZh)
    : parentSummary && cleanArray(parentSummary.personalizationZh).length > 0
      ? cleanArray(parentSummary.personalizationZh)
      : []

  const collectedReasons: string[] = []

  if (canonicalPersonalization.length > 0) {
    collectedReasons.push(...canonicalPersonalization)
  } else {
    // Compatibility / projection layers fallback only when canonical personalizationZh is absent
    if (Array.isArray(summary.personalizationReasons)) {
      collectedReasons.push(...cleanArray(summary.personalizationReasons))
    }
    if (Array.isArray(summary.improvementComparedToPrevious)) {
      collectedReasons.push(...cleanArray(summary.improvementComparedToPrevious))
    }
    if (Array.isArray(summary.feedbackApplied)) {
      collectedReasons.push(...cleanArray(summary.feedbackApplied))
    }
    if (typeof summary.personalizationStrategy === 'string' && summary.personalizationStrategy.trim() && !hasForbiddenPersonalizationJargon(summary.personalizationStrategy)) {
      collectedReasons.push(summary.personalizationStrategy.trim())
    }
  }

  const rawAdjustment = stringOrNull(summary.learningAdjustmentSummary)
  // Defensive filter against raw internal English LLM rationale / prompt trace leakage or forbidden jargon
  const isEnglishPromptTrace = rawAdjustment ? /^[A-Za-z\s,.'"-]{20,}/.test(rawAdjustment) && !/[\u4e00-\u9fa5]/.test(rawAdjustment) : false
  const isForbiddenJargon = rawAdjustment ? hasForbiddenPersonalizationJargon(rawAdjustment) : false

  let learningAdjustmentSummary = isEnglishPromptTrace || isForbiddenJargon ? null : rawAdjustment

  const uniqueReasons = Array.from(new Set(collectedReasons))

  if (uniqueReasons.length === 0 && learningAdjustmentSummary) {
    const parts = learningAdjustmentSummary
      .split(/[；;]+/u)
      .map(p => p.trim())
      .filter(p => Boolean(p) && !hasForbiddenPersonalizationJargon(p))
    if (parts.length > 0) {
      uniqueReasons.push(...parts)
    }
  }

  const isWeek1 = weekNumber === 1 || summary.weekNumber === 1
  if (uniqueReasons.length === 0) {
    if (isWeek1) {
      const calibReason = '這是第一週教材，先用適中的難度了解孩子目前的閱讀、字彙與文法程度，再依這週的學習情況調整之後的內容。'
      uniqueReasons.push(calibReason)
      learningAdjustmentSummary = calibReason
    } else if (learningFocus) {
      const focusReason = `本週重點加強${learningFocus}，透過生活化情境與循序練習幫助孩子掌握。`
      uniqueReasons.push(focusReason)
      learningAdjustmentSummary = focusReason
    }
  }

  return {
    title,
    learningFocus,
    learningAdjustmentSummary: uniqueReasons.length > 0 ? uniqueReasons.join('；') : learningAdjustmentSummary,
    personalizationReasons: uniqueReasons,
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

export async function listMaterials(childIds: string[], options: MaterialPageOptions = {}, now = new Date()): Promise<MaterialPage> {
  if (childIds.length === 0) return { materials: [], hasMoreByChild: {}, nextJobReleaseAtByChild: {}, hasPastDueUnmaterializedJobByChild: {} }
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
    materialIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : client.from('feedback').select('material_id, difficulty, completion_rate, weak_area, mistakes_text, child_comments, parent_comments, created_at, updated_at').in('child_id', childIds).in('material_id', materialIds),
    client.from('generation_jobs').select('material_id, child_id, release_at').in('child_id', childIds),
  ])
  if (feedbackError) throw feedbackError
  if (jobsError) throw jobsError

  const feedbackByMaterial = new Map((feedback ?? []).map((item) => [item.material_id, item]))
  const releaseByMaterial = new Map((jobs ?? []).filter((job) => job.material_id).map((job) => [job.material_id, job.release_at as string]))
  const firstMaterialWeekByChild = new Map(pages.map((page) => [page.childId, page.firstMaterialWeek]))

  const nextJobReleaseAtByChild: Record<string, string | null> = {}
  const hasPastDueUnmaterializedJobByChild: Record<string, boolean> = {}
  const nowMs = now.getTime()
  for (const childId of childIds) {
    const childJobs = (jobs ?? []).filter((j) => j.child_id === childId)
    nextJobReleaseAtByChild[childId] = findNextFutureJobReleaseAt(childJobs, now)
    hasPastDueUnmaterializedJobByChild[childId] = childJobs.some((j) => {
      if (j.material_id) return false
      if (!j.release_at) return true
      const jobTime = Date.parse(j.release_at)
      return Number.isNaN(jobTime) || jobTime <= nowMs
    })
  }

  return {
    materials: materials.map((material) => ({
      ...material,
      generation_summary: material.generation_summary as Record<string, unknown>,
      release_at: releaseByMaterial.get(material.id) ?? null,
      week_number: materialWeekNumber(firstMaterialWeekByChild.get(material.child_id) ?? null, material.material_week),
      feedback: feedbackByMaterial.get(material.id) ?? null,
    })) as Material[],
    hasMoreByChild: Object.fromEntries(pages.map((page) => [page.childId, page.rows.length === limit])),
    nextJobReleaseAtByChild,
    hasPastDueUnmaterializedJobByChild,
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
