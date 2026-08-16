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
  // Vocabulary Exposure
  for (const vocabId of [...delta.introducedVocabularyIds, ...delta.reviewedVocabularyIds]) {
    const record = getOrInitRecord(store.vocabRecords, vocabId)
    record.exposureCount += 1
    record.lastSeenAt = timestamp
    if (record.masteryStatus === 'not_started') {
      record.masteryStatus = 'learning'
    }
  }

  // Grammar Exposure
  for (const grammarId of delta.exposedGrammarTargetIds) {
    const record = getOrInitRecord(store.grammarRecords, grammarId)
    record.exposureCount += 1
    record.lastSeenAt = timestamp
    if (record.masteryStatus === 'not_started') {
      record.masteryStatus = 'learning'
    }
  }

  // Communication Functions Exposure
  if (delta.exposedCommunicationFunctionIds) {
    for (const funcId of delta.exposedCommunicationFunctionIds) {
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
