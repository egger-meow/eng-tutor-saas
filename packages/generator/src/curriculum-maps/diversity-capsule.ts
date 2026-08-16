export interface HistoricalPackageSummary {
  materialWeek: string
  completedAt?: string
  genre?: string
  contextKey?: string
  itemFamilies?: string[]
}

export interface DiversityCapsule {
  recentGenres: string[]
  recentContextKeys: string[]
  recentItemFamilies: string[]
}

/**
 * Builds a compact DiversityCapsule from the student's recent completion history (last 2-4 weeks).
 *
 * Minimalist, deterministic extraction:
 * - recentGenres: list of unique genres encountered recently
 * - recentContextKeys: list of unique scenario / context keys encountered recently
 * - recentItemFamilies: list of unique communication / thematic item families encountered recently
 *
 * No heavy algorithms, no UI impact, zero extra state pollution.
 */
export function buildDiversityCapsule(
  history: HistoricalPackageSummary[],
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

  for (const item of recentSlice) {
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
  }

  return {
    recentGenres,
    recentContextKeys,
    recentItemFamilies,
  }
}

/**
 * Extracts a deterministic historical summary from a completed CurriculumPackage:
 * - genre: reading genre (article, dialogue, interview, announcement, schedule)
 * - contextKey: reading scenario title / context identifier
 * - itemFamilies: unique question itemTypes (e.g. inference, short-response) across practice and homework
 */
export function extractHistoricalPackageSummary(
  pkg: {
    studentLesson?: {
      reading?: { genre?: string; title?: string }
      practice?: Array<{ questions?: Array<{ itemType?: string }> }>
      homework?: { questions?: Array<{ itemType?: string }> }
    }
    metadata?: { generatedAt?: string }
  },
  materialWeek?: string,
): HistoricalPackageSummary {
  const genre = pkg.studentLesson?.reading?.genre ?? 'article'
  const contextKey = pkg.studentLesson?.reading?.title ?? 'general-scenario'
  const practiceQuestions = pkg.studentLesson?.practice?.flatMap((s) => s.questions ?? []) ?? []
  const homeworkQuestions = pkg.studentLesson?.homework?.questions ?? []
  const allQuestions = [...practiceQuestions, ...homeworkQuestions]
  const itemFamilies = Array.from(
    new Set(allQuestions.map((q) => q?.itemType).filter((t): t is string => Boolean(t))),
  )

  return {
    materialWeek: materialWeek ?? pkg.metadata?.generatedAt ?? 'unknown-week',
    genre,
    contextKey,
    itemFamilies,
  }
}
