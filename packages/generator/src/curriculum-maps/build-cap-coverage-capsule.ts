import communicationAppendix4 from './official/communication-appendix-4.json' with { type: 'json' }
import grammarAppendix6 from './official/grammar-appendix-6.json' with { type: 'json' }
import vocabulary2000 from './official/vocabulary-2000.json' with { type: 'json' }
import { grammarProgressionUnits } from './derived/grammar-progression.js'
import { getThemeForWord } from './derived/vocabulary-annotations.js'
import type { StudentCurriculumStore } from './student-curriculum-tracker.js'

export interface DomainCoverageMetric {
  totalItems: number
  exposurePct: number
  masteryEvidencePct: number
  dueReviewCount: number
  notYetCoveredCount: number
}

export interface CapCoverageCapsule {
  dueReviewVocabulary: string[]
  recommendedVocabulary: string[]
  dueReviewGrammar: string[]
  recommendedGrammar: string[]
  recommendedCommunicationFunctions: string[]
  coverage: {
    vocabulary: DomainCoverageMetric
    grammar: DomainCoverageMetric
    communication: DomainCoverageMetric
  }
}

export function buildCapCoverageCapsule(
  store: StudentCurriculumStore,
  options: {
    nowIso?: string
    themeHint?: string
    gradeStage?: 'grade_7' | 'grade_8' | 'grade_9'
  } = {},
): CapCoverageCapsule {
  const now = options.nowIso ? new Date(options.nowIso).getTime() : Date.now()
  const gradeStage = options.gradeStage || (store.grade === 7 ? 'grade_7' : store.grade === 8 ? 'grade_8' : 'grade_9')

  // 1. Vocabulary Metrics & Candidates
  const totalVocab = vocabulary2000.length
  let vocabExposed = 0
  let vocabMastered = 0
  let vocabDueCount = 0
  let vocabUncoveredCount = 0

  const dueReviewVocabIds: string[] = []
  const uncoveredVocabIds: string[] = []

  for (const item of vocabulary2000) {
    const rec = store.vocabRecords[item.id]
    if (!rec || rec.exposureCount === 0) {
      vocabUncoveredCount += 1
      uncoveredVocabIds.push(item.id)
    } else {
      vocabExposed += 1
      if (rec.masteryStatus === 'mastered') {
        vocabMastered += 1
      }
      if (rec.nextReviewAt && new Date(rec.nextReviewAt).getTime() <= now) {
        vocabDueCount += 1
        if (dueReviewVocabIds.length < 4) {
          dueReviewVocabIds.push(item.id)
        }
      }
    }
  }

  // Filter recommended uncovered vocab by grade and theme
  const recommendedVocabIds: string[] = []
  for (const vocabId of uncoveredVocabIds) {
    if (recommendedVocabIds.length >= 8) break
    const entry = vocabulary2000.find((v) => v.id === vocabId)
    if (!entry) continue
    if (options.themeHint) {
      const theme = getThemeForWord(entry.word)
      if (theme.includes(options.themeHint) || options.themeHint.includes(theme)) {
        recommendedVocabIds.push(vocabId)
        continue
      }
    }
    recommendedVocabIds.push(vocabId)
  }

  // 2. Grammar Metrics & Candidates
  const totalGrammar = grammarAppendix6.length
  let grammarExposed = 0
  let grammarMastered = 0
  let grammarDueCount = 0
  let grammarUncoveredCount = 0

  const dueReviewGrammarIds: string[] = []
  for (const item of grammarProgressionUnits) {
    const rec = store.grammarRecords[item.unitId]
    if (!rec || rec.exposureCount === 0) {
      grammarUncoveredCount += 1
    } else {
      grammarExposed += 1
      if (rec.masteryStatus === 'mastered') {
        grammarMastered += 1
      }
      if (rec.nextReviewAt && new Date(rec.nextReviewAt).getTime() <= now) {
        grammarDueCount += 1
        if (dueReviewGrammarIds.length < 2) {
          dueReviewGrammarIds.push(item.unitId)
        }
      }
    }
  }

  const recommendedGrammarIds: string[] = []
  const gradeUnits = grammarProgressionUnits.filter((u) => u.gradeStage === gradeStage)
  for (const unit of gradeUnits) {
    if (recommendedGrammarIds.length >= 2) break
    const rec = store.grammarRecords[unit.unitId]
    if (!rec || rec.exposureCount === 0) {
      recommendedGrammarIds.push(unit.unitId)
    }
  }

  // 3. Communication Functions Metrics & Candidates
  const totalCommunication = communicationAppendix4.length
  let commExposed = 0
  let commMastered = 0
  let commDueCount = 0
  let commUncoveredCount = 0

  const uncoveredCommIds: string[] = []
  for (const item of communicationAppendix4) {
    const rec = store.communicationRecords[item.id]
    if (!rec || rec.exposureCount === 0) {
      commUncoveredCount += 1
      uncoveredCommIds.push(item.id)
    } else {
      commExposed += 1
      if (rec.masteryStatus === 'mastered') {
        commMastered += 1
      }
      if (rec.nextReviewAt && new Date(rec.nextReviewAt).getTime() <= now) {
        commDueCount += 1
      }
    }
  }

  const recommendedCommIds = uncoveredCommIds.slice(0, 2)

  return {
    dueReviewVocabulary: dueReviewVocabIds,
    recommendedVocabulary: recommendedVocabIds,
    dueReviewGrammar: dueReviewGrammarIds,
    recommendedGrammar: recommendedGrammarIds,
    recommendedCommunicationFunctions: recommendedCommIds,
    coverage: {
      vocabulary: {
        totalItems: totalVocab,
        exposurePct: Math.round((vocabExposed / totalVocab) * 100),
        masteryEvidencePct: Math.round((vocabMastered / totalVocab) * 100),
        dueReviewCount: vocabDueCount,
        notYetCoveredCount: vocabUncoveredCount,
      },
      grammar: {
        totalItems: totalGrammar,
        exposurePct: Math.round((grammarExposed / totalGrammar) * 100),
        masteryEvidencePct: Math.round((grammarMastered / totalGrammar) * 100),
        dueReviewCount: grammarDueCount,
        notYetCoveredCount: grammarUncoveredCount,
      },
      communication: {
        totalItems: totalCommunication,
        exposurePct: Math.round((commExposed / totalCommunication) * 100),
        masteryEvidencePct: Math.round((commMastered / totalCommunication) * 100),
        dueReviewCount: commDueCount,
        notYetCoveredCount: commUncoveredCount,
      },
    },
  }
}
