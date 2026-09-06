import {
  type DeliveryMemoryProjection,
  extractDeliveryMemory,
  aggregateRecentResponseForms,
  aggregateRecentDeliveryMemory,
} from './delivery-memory.js'

export {
  type DeliveryMemoryProjection,
  extractDeliveryMemory,
  aggregateRecentResponseForms,
  aggregateRecentDeliveryMemory,
}

import {
  type FormatPlanningCapsule,
  buildFormatPlanningCapsule,
} from './format-planning-capsule.js'

export {
  type FormatPlanningCapsule,
  buildFormatPlanningCapsule,
}

export interface HistoricalPackageSummary {
  materialWeek: string
  completedAt?: string
  genre?: string
  contextKey?: string
  itemFamilies?: string[]
  responseForms?: string[]
}

export interface DiversityCapsule {
  recentGenres: string[]
  recentContextKeys: string[]
  recentItemFamilies: string[]
  recentResponseForms?: string[]
  recentDeliveryMemory?: DeliveryMemoryProjection[]
  formatPlanningCapsule?: FormatPlanningCapsule
}

/**
 * Builds a compact DiversityCapsule from the student's recent completion history (last 2-4 weeks).
 *
 * Minimalist, deterministic extraction:
 * - recentGenres: list of unique genres encountered recently
 * - recentContextKeys: list of unique scenario / context keys encountered recently
 * - recentItemFamilies: list of unique communication / thematic item families encountered recently
 * - recentResponseForms: list of unique question/response formats encountered recently
 * - recentDeliveryMemory: list of structured delivery memory projections
 *
 * No heavy algorithms, no UI impact, zero extra state pollution.
 */
export function buildDiversityCapsule(
  history: Array<HistoricalPackageSummary | DeliveryMemoryProjection>,
  lookbackWeeks: number = 4,
): DiversityCapsule {
  if (!Array.isArray(history) || history.length === 0) {
    return {
      recentGenres: [],
      recentContextKeys: [],
      recentItemFamilies: [],
    }
  }

  // Take the most recent `lookbackWeeks` items
  const recentSlice = history.slice(-lookbackWeeks)

  const recentGenres: string[] = []
  const recentContextKeys: string[] = []
  const recentItemFamilies: string[] = []
  const recentResponseForms: string[] = []
  const recentDeliveryMemory: DeliveryMemoryProjection[] = []

  for (const item of recentSlice) {
    if ('readingGenre' in item) {
      if (item.readingGenre && !recentGenres.includes(item.readingGenre)) {
        recentGenres.push(item.readingGenre)
      }
      if (item.readingTitle && !recentContextKeys.includes(item.readingTitle)) {
        recentContextKeys.push(item.readingTitle)
      }
      for (const form of [...item.responseLayoutTypes, ...item.pedagogicalFormats]) {
        if (form && !recentResponseForms.includes(form)) {
          recentResponseForms.push(form)
        }
      }
      recentDeliveryMemory.push(item)
    } else {
      if (item.genre && typeof item.genre === 'string' && !recentGenres.includes(item.genre)) {
        recentGenres.push(item.genre)
      }
      if (item.contextKey && typeof item.contextKey === 'string' && !recentContextKeys.includes(item.contextKey)) {
        recentContextKeys.push(item.contextKey)
      }
      if (Array.isArray(item.itemFamilies)) {
        for (const fam of item.itemFamilies) {
          if (fam && typeof fam === 'string' && !recentItemFamilies.includes(fam)) {
            recentItemFamilies.push(fam)
          }
        }
      }
      if (Array.isArray(item.responseForms)) {
        for (const form of item.responseForms) {
          if (form && typeof form === 'string' && !recentResponseForms.includes(form)) {
            recentResponseForms.push(form)
          }
        }
      }
    }
  }

  return {
    recentGenres,
    recentContextKeys,
    recentItemFamilies,
    ...(recentResponseForms.length > 0 ? { recentResponseForms } : {}),
    ...(recentDeliveryMemory.length > 0
      ? {
          recentDeliveryMemory,
          formatPlanningCapsule: buildFormatPlanningCapsule(recentDeliveryMemory, lookbackWeeks),
        }
      : {}),
  }
}

/**
 * Extracts a deterministic historical summary from a completed CurriculumPackage:
 * - genre: reading genre (article, dialogue, interview, announcement, schedule)
 * - contextKey: reading scenario title / context identifier
 * - itemFamilies: unique question itemTypes (e.g. inference, short-response) across reading, practice and homework
 */
export function extractHistoricalPackageSummary(
  pkg: {
    studentLesson?: {
      reading?: { genre?: string; title?: string; questions?: ResponseQuestion[] }
      practice?: Array<{ questions?: ResponseQuestion[] }>
      homework?: { questions?: ResponseQuestion[] }
    }
    metadata?: { generatedAt?: string }
  },
  materialWeek?: string,
): HistoricalPackageSummary {
  const genre = pkg.studentLesson?.reading?.genre ?? 'article'
  const contextKey = pkg.studentLesson?.reading?.title ?? 'general-scenario'
  const practiceQuestions = pkg.studentLesson?.practice?.flatMap((s) => s.questions ?? []) ?? []
  const homeworkQuestions = pkg.studentLesson?.homework?.questions ?? []
  const allQuestions = [...(pkg.studentLesson?.reading?.questions ?? []), ...practiceQuestions, ...homeworkQuestions]
  const itemFamilies = Array.from(
    new Set(allQuestions.map((q) => q?.itemType).filter((t): t is string => Boolean(t))),
  )

  return {
    materialWeek: materialWeek ?? pkg.metadata?.generatedAt ?? 'unknown-week',
    genre,
    contextKey,
    itemFamilies,
    responseForms: [...new Set(allQuestions.map(q => q.responseLayout?.type ?? (q.options?.length ? "choice" : "lines")))],
  }
}

interface ResponseQuestion {
  itemType?: string
  options?: string[]
  writingLines?: number
  responseLayout?: { type?: string }
}
