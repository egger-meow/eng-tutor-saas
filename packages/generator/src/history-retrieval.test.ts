import { describe, expect, it } from 'vitest'
import {
  retrieveTargetedStudentHistory,
  type HistoryRetrievalQuery,
} from './history-retrieval.js'
import type { GenerationContext } from './index.js'

describe('Targeted Student History Retrieval with Bounded Expansion and Provenance Pinning', () => {
  const sampleContext: GenerationContext = {
    grade: 7,
    preferences: ['robotics'],
    priorFeedback: ['needs more practice with irregular past verbs'],
    lifetimeLearningMemory: {
      vocabulary: {
        total: 10,
        verifiedWeakTargetIds: ['vocab-sensor'],
        dueTargetIds: ['vocab-robot', 'vocab-battery'],
        uncertainTargetIds: ['vocab-gear'],
        masteredTargetIds: ['vocab-motor', 'vocab-wire'],
        regressionTargetIds: ['vocab-switch'],
      },
      grammar: {
        total: 5,
        verifiedWeakTargetIds: ['g7-past-simple-irregular'],
        dueTargetIds: ['g7-imperatives'],
        uncertainTargetIds: ['g7-modals'],
        masteredTargetIds: ['g7-be-verbs'],
        regressionTargetIds: [],
      },
      communication: {
        total: 2,
        verifiedWeakTargetIds: [],
        dueTargetIds: ['cf-asking-clarification'],
        uncertainTargetIds: [],
        masteredTargetIds: ['cf-greeting'],
        regressionTargetIds: [],
      },
    },
    targetedOlderEvidence: [
      {
        targetType: 'vocabulary',
        targetId: 'vocab-sensor',
        result: 'incorrect',
        observedAt: '2026-08-20T10:00:00.000Z',
      },
      {
        targetType: 'vocabulary',
        targetId: 'vocab-sensor',
        result: 'partial',
        observedAt: '2026-08-27T10:00:00.000Z',
      },
      {
        targetType: 'grammar',
        targetId: 'g7-past-simple-irregular',
        result: 'incorrect',
        observedAt: '2026-08-27T10:00:00.000Z',
      },
    ],
  }

  it('retrieves and strictly bounds history to top 3-5 priority targets', () => {
    const result = retrieveTargetedStudentHistory(sampleContext, { limit: 3 })

    expect(result.isBounded).toBe(true)
    expect(result.retrievedTargets.length).toBeLessThanOrEqual(3)
    // Priority 1: Verified weak targets first
    expect(result.retrievedTargets[0]!.priorityRank).toBe(1)
    expect(['vocab-sensor', 'g7-past-simple-irregular']).toContain(result.retrievedTargets[0]!.targetId)
    // Attaches matching historical evidence
    const sensorTarget = result.retrievedTargets.find((t) => t.targetId === 'vocab-sensor')
    if (sensorTarget) {
      expect(sensorTarget.recentResults).toHaveLength(2)
      expect(sensorTarget.recentResults[0]!.result).toBe('incorrect')
    }
  })

  it('generates a deterministic SHA-256 provenance hash pinned to cutoff timestamp', () => {
    const query: HistoryRetrievalQuery = {
      cutoffTimestamp: '2026-09-01T00:00:00.000Z',
      limit: 3,
    }
    const result1 = retrieveTargetedStudentHistory(sampleContext, query)
    const result2 = retrieveTargetedStudentHistory(sampleContext, query)

    expect(result1.provenanceHash).toBe(result2.provenanceHash)
    expect(result1.provenanceHash).toMatch(/^sha256:[a-f0-9]{64}$/)
    expect(result1.cutoffTimestamp).toBe('2026-09-01T00:00:00.000Z')
  })

  it('explicitly signals missing evidence for unseen targets rather than false mastery', () => {
    const query: HistoryRetrievalQuery = {
      targetIds: ['vocab-sensor', 'vocab-quantum-core'],
      targetType: 'vocabulary',
      limit: 5,
    }

    const result = retrieveTargetedStudentHistory(sampleContext, query)
    expect(result.retrievedTargets.some((t) => t.targetId === 'vocab-sensor')).toBe(true)

    // vocab-quantum-core was never seen by this student
    expect(result.missingTargets).toHaveLength(1)
    expect(result.missingTargets[0]!.targetId).toBe('vocab-quantum-core')
    expect(result.missingTargets[0]!.reason).toBe('no_prior_learning_evidence')
    expect(result.missingTargets[0]!.recommendedPolicy).toBe('treat_as_new_learning')
  })

  it('handles empty lifetime memory safely for Week 1 students', () => {
    const emptyContext: GenerationContext = {
      grade: 7,
      preferences: [],
      priorFeedback: [],
    }

    const result = retrieveTargetedStudentHistory(emptyContext, { limit: 3 })
    expect(result.retrievedTargets).toEqual([])
    expect(result.missingTargets).toEqual([])
    expect(result.totalCandidatesConsidered).toBe(0)
    expect(result.provenanceHash).toMatch(/^sha256:[a-f0-9]{64}$/)
  })
})
