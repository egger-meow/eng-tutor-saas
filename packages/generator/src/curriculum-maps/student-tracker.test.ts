import { describe, it, expect } from 'vitest'
import {
  createEmptyStudentCurriculumStore,
  recordExposureFromTrackingDelta,
  recordLearnerAssessmentEvidence,
} from './student-curriculum-tracker.js'
import { buildCapCoverageCapsule } from './build-cap-coverage-capsule.js'

describe('Student Curriculum Progress Tracker & Coverage Capsule', () => {
  it('enforces hard invariant: trackingDelta records exposure only and never grants mastery', () => {
    const store = createEmptyStudentCurriculumStore('child-101', 7)

    recordExposureFromTrackingDelta(store, {
      introducedVocabularyIds: ['v-borrow', 'v-experience'],
      reviewedVocabularyIds: ['v-shade'],
      exposedGrammarTargetIds: ['g7-do-does-questions'],
      exposedReadingTargetIds: ['reading-inference'],
      exposedCommunicationFunctionIds: ['cf-making-requests'],
    })

    // Vocabulary checks
    expect(store.vocabRecords['v-borrow']?.exposureCount).toBe(1)
    expect(store.vocabRecords['v-borrow']?.assessedCount).toBe(0)
    expect(store.vocabRecords['v-borrow']?.correctCount).toBe(0)
    expect(store.vocabRecords['v-borrow']?.masteryStatus).toBe('learning')

    // Grammar checks
    expect(store.grammarRecords['g7-do-does-questions']?.exposureCount).toBe(1)
    expect(store.grammarRecords['g7-do-does-questions']?.assessedCount).toBe(0)
    expect(store.grammarRecords['g7-do-does-questions']?.correctCount).toBe(0)
    expect(store.grammarRecords['g7-do-does-questions']?.masteryStatus).toBe('learning')

    // Communication checks
    expect(store.communicationRecords['cf-making-requests']?.exposureCount).toBe(1)
    expect(store.communicationRecords['cf-making-requests']?.assessedCount).toBe(0)
    expect(store.communicationRecords['cf-making-requests']?.correctCount).toBe(0)
    expect(store.communicationRecords['cf-making-requests']?.masteryStatus).toBe('learning')
  })

  it('updates mastery evidence and schedules spaced review only upon learner assessment evidence', () => {
    const store = createEmptyStudentCurriculumStore('child-101', 7)
    const baseTime = '2026-08-17T00:00:00.000Z'

    // 1. Initial exposure
    recordExposureFromTrackingDelta(store, {
      introducedVocabularyIds: ['v-borrow'],
      reviewedVocabularyIds: [],
      exposedGrammarTargetIds: ['g7-do-does-questions'],
    }, baseTime)

    // 2. First assessment: miss
    recordLearnerAssessmentEvidence(store, 'grammar', 'g7-do-does-questions', 'miss', baseTime)
    expect(store.grammarRecords['g7-do-does-questions']?.assessedCount).toBe(1)
    expect(store.grammarRecords['g7-do-does-questions']?.missCount).toBe(1)
    expect(store.grammarRecords['g7-do-does-questions']?.correctCount).toBe(0)
    expect(store.grammarRecords['g7-do-does-questions']?.masteryStatus).toBe('learning')
    // Next review scheduled in 7 days
    expect(store.grammarRecords['g7-do-does-questions']?.nextReviewAt).toBe('2026-08-24T00:00:00.000Z')

    // 3. Second assessment: correct
    const time2 = '2026-08-24T00:00:00.000Z'
    recordLearnerAssessmentEvidence(store, 'grammar', 'g7-do-does-questions', 'correct', time2)
    expect(store.grammarRecords['g7-do-does-questions']?.assessedCount).toBe(2)
    expect(store.grammarRecords['g7-do-does-questions']?.correctCount).toBe(1)
    expect(store.grammarRecords['g7-do-does-questions']?.masteryStatus).toBe('reviewing')
    expect(store.grammarRecords['g7-do-does-questions']?.nextReviewAt).toBe('2026-09-07T00:00:00.000Z')
  })

  it('builds compact, decision-complete CAP Coverage Capsule with dual metrics', () => {
    const store = createEmptyStudentCurriculumStore('child-101', 7)
    const now = '2026-09-01T00:00:00.000Z'

    // Expose 10 vocab, 3 grammar, 2 communication
    const vocabBatch = ['v-borrow', 'v-experience', 'v-shade', 'v-camera', 'v-measure', 'v-record', 'v-project', 'v-result', 'v-notice', 'v-compare']
    recordExposureFromTrackingDelta(store, {
      introducedVocabularyIds: vocabBatch,
      reviewedVocabularyIds: [],
      exposedGrammarTargetIds: ['g7-be-verbs-pronouns', 'g7-present-simple-verbs', 'g7-do-does-questions'],
      exposedCommunicationFunctionIds: ['cf-making-requests', 'cf-apologizing'],
    }, '2026-08-10T00:00:00.000Z')

    // Give mastery to 2 vocab and 1 grammar
    recordLearnerAssessmentEvidence(store, 'vocabulary', 'v-borrow', 'correct', '2026-08-10T00:00:00.000Z')
    recordLearnerAssessmentEvidence(store, 'vocabulary', 'v-borrow', 'correct', '2026-08-15T00:00:00.000Z')

    // Schedule 1 due review for grammar (nextReviewAt earlier than now)
    store.grammarRecords['g7-be-verbs-pronouns']!.nextReviewAt = '2026-08-25T00:00:00.000Z'

    const capsule = buildCapCoverageCapsule(store, { nowIso: now, gradeStage: 'grade_7' })

    // Dual Metric Checks
    expect(capsule.coverage.vocabulary.exposurePct).toBeGreaterThanOrEqual(0)
    expect(capsule.coverage.grammar.exposurePct).toBeGreaterThan(0)
    expect(capsule.coverage.grammar.dueReviewCount).toBe(1)
    expect(capsule.coverage.grammar.totalItems).toBe(25)
    expect(capsule.dueReviewGrammar).toContain('g7-be-verbs-pronouns')

    // Candidates are populated and compact
    expect(capsule.recommendedVocabulary.length).toBeLessThanOrEqual(8)
    expect(capsule.recommendedGrammar.length).toBeLessThanOrEqual(2)
    expect(capsule.recommendedCommunicationFunctions.length).toBeLessThanOrEqual(2)
  })

  it('recommends prerequisite-eligible grammar in canonical progression order', () => {
    const store = createEmptyStudentCurriculumStore('child-progression', 7)

    expect(buildCapCoverageCapsule(store, { gradeStage: 'grade_7' }).recommendedGrammar).toEqual([
      'g7-be-verbs-pronouns',
      'g7-imperatives',
    ])

    recordExposureFromTrackingDelta(store, {
      introducedVocabularyIds: [],
      reviewedVocabularyIds: [],
      exposedGrammarTargetIds: ['g7-be-verbs-pronouns'],
    })
    recordLearnerAssessmentEvidence(store, 'grammar', 'g7-be-verbs-pronouns', 'correct')
    recordLearnerAssessmentEvidence(store, 'grammar', 'g7-be-verbs-pronouns', 'correct')

    expect(buildCapCoverageCapsule(store, { gradeStage: 'grade_7' }).recommendedGrammar).toEqual([
      'g7-present-simple-verbs',
      'g7-present-continuous',
    ])

    recordExposureFromTrackingDelta(store, {
      introducedVocabularyIds: [],
      reviewedVocabularyIds: [],
      exposedGrammarTargetIds: ['g7-present-simple-verbs'],
    })
    recordLearnerAssessmentEvidence(store, 'grammar', 'g7-present-simple-verbs', 'correct')
    recordLearnerAssessmentEvidence(store, 'grammar', 'g7-present-simple-verbs', 'correct')

    expect(buildCapCoverageCapsule(store, { gradeStage: 'grade_7' }).recommendedGrammar).toEqual([
      'g7-do-does-questions',
      'g7-modals-ability-permission',
    ])
  })

  it('maps weekly vocabulary to official 2000 and excludes non-CAP domain words from store', () => {
    const store = createEmptyStudentCurriculumStore('child-102', 7)

    recordExposureFromTrackingDelta(store, {
      introducedVocabularyIds: ['borrow', 'through', 'minecraft', 'redstone', 'sensor'],
      reviewedVocabularyIds: [],
      exposedGrammarTargetIds: ['g7-be-verbs-pronouns'],
    })

    // Canonical CAP 2000 words mapped to canonical IDs and recorded
    expect(store.vocabRecords['v-borrow']).toBeDefined()
    expect(store.vocabRecords['v-through']).toBeDefined()
    expect(store.vocabRecords['v-borrow']?.exposureCount).toBe(1)

    // Domain words (Minecraft, redstone, sensor) are NOT written into CAP store / denominator
    expect(store.vocabRecords['minecraft']).toBeUndefined()
    expect(store.vocabRecords['redstone']).toBeUndefined()
    expect(store.vocabRecords['sensor']).toBeUndefined()
    expect(store.vocabRecords['v-minecraft']).toBeUndefined()
    expect(Object.keys(store.vocabRecords).length).toBe(2)
  })
})
