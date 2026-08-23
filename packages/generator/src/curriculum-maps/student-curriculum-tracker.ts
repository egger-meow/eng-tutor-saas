import { grammarProgressionUnits } from './derived/grammar-progression.js'
import communicationAppendix4 from './official/communication-appendix-4.json' with { type: 'json' }
import vocabulary2000 from './official/vocabulary-2000.json' with { type: 'json' }

export interface CurriculumEvidenceRecord {
  id: string
  exposureCount: number
  assessedCount: number
  correctCount: number
  partialCount: number
  missCount: number
  lastSeenAt?: string
  masteryStatus: 'not_started' | 'learning' | 'reviewing' | 'mastered'
  nextReviewAt?: string
  masteryReason?: 'two_spaced_correct_materials'
  weaknessReason?: 'explicit_incorrect' | 'regression_after_mastery'
  successfulAssessments: Array<{ materialId: string; observedAt: string }>
}

export interface StudentCurriculumStore {
  studentId: string
  grade: number
  vocabRecords: Record<string, CurriculumEvidenceRecord>
  grammarRecords: Record<string, CurriculumEvidenceRecord>
  communicationRecords: Record<string, CurriculumEvidenceRecord>
}

export const VALID_GRAMMAR_UNIT_IDS = new Set<string>(grammarProgressionUnits.map((u) => u.unitId))
export const VALID_COMMUNICATION_FUNCTION_IDS = new Set<string>(communicationAppendix4.map((c) => c.id))

const canonicalVocabIdSet = new Set<string>(vocabulary2000.map((v) => v.id))
const canonicalVocabWordMap = new Map<string, string>(vocabulary2000.map((v) => [v.word.toLowerCase(), v.id]))

export function mapToCanonicalVocabId(wordOrId: string): string | null {
  const clean = wordOrId.trim()
  if (canonicalVocabIdSet.has(clean)) return clean
  const stripped = clean.toLowerCase().replace(/^v-/u, '')
  const byWord = canonicalVocabWordMap.get(stripped)
  if (byWord) return byWord
  const directWord = canonicalVocabWordMap.get(clean.toLowerCase())
  if (directWord) return directWord
  return null
}

export function createEmptyStudentCurriculumStore(studentId: string, grade: number): StudentCurriculumStore {
  return {
    studentId,
    grade,
    vocabRecords: {},
    grammarRecords: {},
    communicationRecords: {},
  }
}

function getOrInitRecord(recordMap: Record<string, CurriculumEvidenceRecord>, id: string): CurriculumEvidenceRecord {
  if (!recordMap[id]) {
    recordMap[id] = {
      id,
      exposureCount: 0,
      assessedCount: 0,
      correctCount: 0,
      partialCount: 0,
      missCount: 0,
      masteryStatus: 'not_started',
      successfulAssessments: [],
    }
  }
  return recordMap[id]!
}

/**
 * Hard System Invariant:
 * trackingDelta records EXPOSURE ONLY.
 * Exposure is NOT evidence of mastery.
 *
 * Fail-closed: Only canonical CAP IDs enter store.
 * Domain words (e.g. Minecraft, sensors) do NOT enter CAP 2000 denominator/store.
 */
export function recordExposureFromTrackingDelta(
  store: StudentCurriculumStore,
  delta: {
    introducedVocabularyIds: string[]
    reviewedVocabularyIds: string[]
    exposedGrammarTargetIds: string[]
    exposedReadingTargetIds?: string[]
    exposedCommunicationFunctionIds?: string[]
  },
  timestamp: string = new Date().toISOString(),
): void {
  // Vocabulary Exposure: Only record canonical CAP 2000 items
  for (const vocabIdOrWord of [...delta.introducedVocabularyIds, ...delta.reviewedVocabularyIds]) {
    const canonicalId = mapToCanonicalVocabId(vocabIdOrWord)
    if (!canonicalId) {
      // Domain word -> taught in lesson, but does NOT pollute CAP 2000 progress
      continue
    }
    const record = getOrInitRecord(store.vocabRecords, canonicalId)
    record.exposureCount += 1
    record.lastSeenAt = timestamp
    if (record.masteryStatus === 'not_started') {
      record.masteryStatus = 'learning'
    }
  }

  // Grammar Exposure: Only record valid derived progression units
  for (const grammarId of delta.exposedGrammarTargetIds) {
    if (!VALID_GRAMMAR_UNIT_IDS.has(grammarId)) continue
    const record = getOrInitRecord(store.grammarRecords, grammarId)
    record.exposureCount += 1
    record.lastSeenAt = timestamp
    if (record.masteryStatus === 'not_started') {
      record.masteryStatus = 'learning'
    }
  }

  // Communication Functions Exposure: Only record valid official function IDs
  if (delta.exposedCommunicationFunctionIds) {
    for (const funcId of delta.exposedCommunicationFunctionIds) {
      if (!VALID_COMMUNICATION_FUNCTION_IDS.has(funcId)) continue
      const record = getOrInitRecord(store.communicationRecords, funcId)
      record.exposureCount += 1
      record.lastSeenAt = timestamp
      if (record.masteryStatus === 'not_started') {
        record.masteryStatus = 'learning'
      }
    }
  }
}

/**
 * Records genuine learner performance / feedback evidence.
 * This is the ONLY mechanism that updates assessedCount, result counts, and masteryStatus.
 */
export function recordLearnerAssessmentEvidence(
  store: StudentCurriculumStore,
  domain: 'vocabulary' | 'grammar' | 'communication',
  itemId: string,
  result: 'correct' | 'miss' | 'partial',
  timestamp: string = new Date().toISOString(),
  materialId: string = `legacy:${timestamp}`,
): void {
  const map =
    domain === 'vocabulary'
      ? store.vocabRecords
      : domain === 'grammar'
        ? store.grammarRecords
        : store.communicationRecords

  const record = getOrInitRecord(map, itemId)
  record.assessedCount += 1

  if (result === 'partial') {
    record.partialCount += 1
    if (record.masteryStatus !== 'mastered') record.masteryStatus = 'learning'
    return
  }

  if (result === 'correct') {
    record.correctCount += 1
    if (!record.successfulAssessments.some((item) => item.materialId === materialId)) {
      record.successfulAssessments.push({ materialId, observedAt: timestamp })
    }
    record.successfulAssessments.sort((a, b) => a.observedAt.localeCompare(b.observedAt))
    const first = record.successfulAssessments[0]
    const hasSpacedSuccess = first !== undefined && record.successfulAssessments.some((item) =>
      item.materialId !== first.materialId
      && new Date(item.observedAt).getTime() >= new Date(first.observedAt).getTime() + 7 * 24 * 60 * 60 * 1000
    )
    if (hasSpacedSuccess) {
      record.masteryStatus = 'mastered'
      record.masteryReason = 'two_spaced_correct_materials'
      record.weaknessReason = undefined
      // Schedule next spaced review 21 days later
      const nextDate = new Date(new Date(timestamp).getTime() + 21 * 24 * 60 * 60 * 1000)
      record.nextReviewAt = nextDate.toISOString()
    } else {
      record.masteryStatus = 'reviewing'
      const nextDate = new Date(new Date(timestamp).getTime() + 14 * 24 * 60 * 60 * 1000)
      record.nextReviewAt = nextDate.toISOString()
    }
  } else {
    record.missCount += 1
    const regressed = record.masteryStatus === 'mastered'
    record.masteryStatus = 'reviewing'
    record.weaknessReason = regressed ? 'regression_after_mastery' : 'explicit_incorrect'
    // Immediate review needed in 7 days
    const nextDate = new Date(new Date(timestamp).getTime() + 7 * 24 * 60 * 60 * 1000)
    record.nextReviewAt = nextDate.toISOString()
  }
}
