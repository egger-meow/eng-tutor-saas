import { grammarProgressionUnits } from './derived/grammar-progression.js'
import communicationAppendix4 from './official/communication-appendix-4.json' with { type: 'json' }
import vocabulary2000 from './official/vocabulary-2000.json' with { type: 'json' }

export interface CurriculumEvidenceRecord {
  id: string
  exposureCount: number
  assessedCount: number
  correctCount: number
  missCount: number
  lastSeenAt?: string
  masteryStatus: 'not_started' | 'learning' | 'reviewing' | 'mastered'
  nextReviewAt?: string
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
      missCount: 0,
      masteryStatus: 'not_started',
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
 * This is the ONLY mechanism that updates assessedCount, correctCount, missCount, and masteryStatus.
 */
export function recordLearnerAssessmentEvidence(
  store: StudentCurriculumStore,
  domain: 'vocabulary' | 'grammar' | 'communication',
  itemId: string,
  result: 'correct' | 'miss',
  timestamp: string = new Date().toISOString(),
): void {
  const map =
    domain === 'vocabulary'
      ? store.vocabRecords
      : domain === 'grammar'
        ? store.grammarRecords
        : store.communicationRecords

  const record = getOrInitRecord(map, itemId)
  record.assessedCount += 1

  if (result === 'correct') {
    record.correctCount += 1
    if (record.correctCount >= 2 && record.missCount === 0) {
      record.masteryStatus = 'mastered'
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
    record.masteryStatus = 'learning'
    // Immediate review needed in 7 days
    const nextDate = new Date(new Date(timestamp).getTime() + 7 * 24 * 60 * 60 * 1000)
    record.nextReviewAt = nextDate.toISOString()
  }
}
