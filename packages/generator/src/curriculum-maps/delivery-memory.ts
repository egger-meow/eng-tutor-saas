import type { CurriculumPackage } from '../curriculum-package-schema.js'

export interface DeliveryMemoryProjection {
  sequence_number?: number
  weekNumber?: number
  materialWeek: string
  readingGenre: string
  readingTitle: string
  readingHook?: string
  readingEntities?: string[]
  introducedVocabulary: string[]
  grammarTargets?: string[]
  communicationFunctions?: string[]
  responseLayoutTypes: Array<'lines' | 'table' | 'organizer' | 'sequence'>
  pedagogicalFormats: string[]
  scaffoldLevels?: string[]
  reasoningOperations?: string[]
  snapshotId?: string
  materialId?: string
}

/**
 * Extracts a deterministic DeliveryMemoryProjection from a completed CurriculumPackage or raw material.
 */
export function extractDeliveryMemory(
  pkg: CurriculumPackage | Record<string, any>,
  materialWeek?: string,
  weekNumber?: number,
): DeliveryMemoryProjection {
  const meta = (pkg as any).metadata ?? {}
  const effectiveWeek = materialWeek ?? meta.materialWeek ?? meta.generatedAt ?? 'unknown-week'
  const effectiveWeekNum = weekNumber ?? (typeof meta.weekNumber === 'number' ? meta.weekNumber : undefined)

  const reading = (pkg as any).studentLesson?.reading ?? {}
  const readingGenre = reading.genre ?? 'article'
  const readingTitle = reading.title ?? ''
  const readingHook = reading.hook ?? ''
  const readingEntities: string[] = Array.isArray(reading.entities)
    ? reading.entities
    : Array.isArray((pkg as any).grounding?.entities)
      ? (pkg as any).grounding.entities
      : []

  const trackingDelta = (pkg as any).trackingDelta ?? {}
  let introducedVocabulary: string[] = []
  if (Array.isArray(trackingDelta.introducedVocabularyIds)) {
    introducedVocabulary = trackingDelta.introducedVocabularyIds
  } else if (Array.isArray((pkg as any).studentLesson?.vocabulary)) {
    introducedVocabulary = (pkg as any).studentLesson.vocabulary.map((v: any) => v.word ?? v.id).filter(Boolean)
  }

  const grammarTargets: string[] = Array.isArray(trackingDelta.exposedGrammarTargetIds)
    ? trackingDelta.exposedGrammarTargetIds
    : Array.isArray((pkg as any).studentLesson?.grammar?.targets)
      ? (pkg as any).studentLesson.grammar.targets
      : []

  const communicationFunctions: string[] = Array.isArray(trackingDelta.exposedCommunicationFunctionIds)
    ? trackingDelta.exposedCommunicationFunctionIds
    : []

  const practiceStages = (pkg as any).studentLesson?.practice ?? []
  const practiceQuestions = Array.isArray(practiceStages)
    ? practiceStages.flatMap((s: any) => (Array.isArray(s?.questions) ? s.questions : []))
    : []
  const homeworkQuestions = Array.isArray((pkg as any).studentLesson?.homework?.questions)
    ? (pkg as any).studentLesson.homework.questions
    : []
  const readingQuestions = Array.isArray(reading.questions) ? reading.questions : []

  const allQuestions = [...readingQuestions, ...practiceQuestions, ...homeworkQuestions]

  const responseLayoutTypesSet = new Set<'lines' | 'table' | 'organizer' | 'sequence'>()
  const pedagogicalFormatsSet = new Set<string>()
  const scaffoldLevelsSet = new Set<string>()
  const reasoningOperationsSet = new Set<string>()

  for (const q of allQuestions) {
    if (!q || typeof q !== 'object') continue

    const layout = q.responseLayout
    if (layout && typeof layout === 'object') {
      if (layout.type === 'table' || layout.type === 'organizer' || layout.type === 'sequence' || layout.type === 'lines') {
        responseLayoutTypesSet.add(layout.type)
      }
      if (layout.type === 'table') {
        pedagogicalFormatsSet.add('table:grid')
      } else if (layout.type === 'organizer') {
        pedagogicalFormatsSet.add('table:organizer')
      } else if (layout.type === 'sequence') {
        pedagogicalFormatsSet.add(layout.layoutDirection === 'horizontal' ? 'sequence:horizontal' : 'sequence:vertical')
      } else if (layout.type === 'lines') {
        pedagogicalFormatsSet.add('written:lines')
      }
    } else if (typeof q.writingLines === 'number' && q.writingLines > 0) {
      responseLayoutTypesSet.add('lines')
      pedagogicalFormatsSet.add('written:lines')
    }

    if (Array.isArray(q.options) && q.options.length > 0) {
      pedagogicalFormatsSet.add(q.options.length === 4 ? 'mcq:4-option' : 'mcq:multi-option')
    }
    if (q.itemType && typeof q.itemType === 'string') {
      pedagogicalFormatsSet.add(`itemType:${q.itemType}`)
      reasoningOperationsSet.add(q.itemType)
    }
    if (q.difficulty && typeof q.difficulty === 'string') {
      scaffoldLevelsSet.add(q.difficulty)
    }
    if (q.reasoningOperation && typeof q.reasoningOperation === 'string') {
      reasoningOperationsSet.add(q.reasoningOperation)
    }
    if (q.cognitiveDepth && typeof q.cognitiveDepth === 'string') {
      reasoningOperationsSet.add(q.cognitiveDepth)
    }
  }

  return {
    weekNumber: effectiveWeekNum,
    materialWeek: effectiveWeek,
    readingGenre,
    readingTitle,
    readingHook,
    readingEntities,
    introducedVocabulary,
    grammarTargets,
    communicationFunctions,
    responseLayoutTypes: Array.from(responseLayoutTypesSet),
    pedagogicalFormats: Array.from(pedagogicalFormatsSet),
    scaffoldLevels: Array.from(scaffoldLevelsSet),
    reasoningOperations: Array.from(reasoningOperationsSet),
    snapshotId: (pkg as any).snapshotId ?? meta.snapshotId,
    materialId: (pkg as any).materialId ?? meta.materialId,
  }
}

/**
 * Aggregates recent response forms across historical delivery memories.
 */
export function aggregateRecentResponseForms(
  memories: DeliveryMemoryProjection[],
  lookbackWeeks: number = 4,
): string[] {
  if (!Array.isArray(memories) || memories.length === 0) return []
  const recent = memories.slice(-lookbackWeeks)
  const forms = new Set<string>()
  for (const mem of recent) {
    for (const layout of mem.responseLayoutTypes) {
      forms.add(layout)
    }
    for (const format of mem.pedagogicalFormats) {
      forms.add(format)
    }
  }
  return Array.from(forms)
}

/**
 * Bounds cross-week delivery memory to the most recent lookback weeks.
 */
export function aggregateRecentDeliveryMemory(
  history: DeliveryMemoryProjection[],
  lookbackWeeks: number = 4,
): DeliveryMemoryProjection[] {
  if (!Array.isArray(history) || history.length === 0) return []
  return history.slice(-lookbackWeeks)
}

/** Newest first. Canonical delivery ordinals win over source week labels. */
export function compareDeliveryRecency(
  a: { sequence_number?: number; weekNumber?: number; materialWeek: string },
  b: { sequence_number?: number; weekNumber?: number; materialWeek: string },
): number {
  const left = a.sequence_number ?? a.weekNumber
  const right = b.sequence_number ?? b.weekNumber
  if (left !== undefined && right !== undefined && left !== right) return right - left
  const leftHasLabel = /\d/u.test(String(a.materialWeek ?? ''))
  const rightHasLabel = /\d/u.test(String(b.materialWeek ?? ''))
  if (leftHasLabel !== rightHasLabel) return leftHasLabel ? -1 : 1
  return String(b.materialWeek ?? '').localeCompare(String(a.materialWeek ?? ''), 'en', { numeric: true })
}
