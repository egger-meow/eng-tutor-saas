import { describe, expect, it } from 'vitest'
import {
  retrieveTargetedStudentHistory,
  verifyLifetimeTarget,
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

  it('filters out historical evidence after cutoff timestamp', () => {
    const contextWithFutureEvidence: GenerationContext = {
      ...sampleContext,
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
          observedAt: '2026-09-10T10:00:00.000Z', // After cutoff!
        },
      ],
    }

    const result = retrieveTargetedStudentHistory(contextWithFutureEvidence, {
      cutoffTimestamp: '2026-09-01T00:00:00.000Z',
      targetIds: ['vocab-sensor'],
    })

    const sensor = result.retrievedTargets.find((t) => t.targetId === 'vocab-sensor')
    expect(sensor).toBeDefined()
    // Only the observation before 2026-09-01 should remain
    expect(sensor!.recentResults).toHaveLength(1)
    expect(sensor!.recentResults[0]!.observedAt).toBe('2026-08-20T10:00:00.000Z')
  })

  it('binds childId, sourceClaimId, targetType, result and timestamp into provenance hash', () => {
    const baseQuery: HistoryRetrievalQuery = {
      childId: 'child-123',
      sourceClaimId: 'claim-456',
      cutoffTimestamp: '2026-09-01T00:00:00.000Z',
      limit: 3,
    }

    const res1 = retrieveTargetedStudentHistory(sampleContext, baseQuery)
    const resDifferentChild = retrieveTargetedStudentHistory(sampleContext, {
      ...baseQuery,
      childId: 'child-999',
    })
    const resDifferentClaim = retrieveTargetedStudentHistory(sampleContext, {
      ...baseQuery,
      sourceClaimId: 'claim-999',
    })

    expect(res1.provenanceHash).not.toBe(resDifferentChild.provenanceHash)
    expect(res1.provenanceHash).not.toBe(resDifferentClaim.provenanceHash)
  })

  describe('verifyLifetimeTarget', () => {
    it('returns verified_weak for target in verifiedWeakTargetIds', () => {
      const res = verifyLifetimeTarget(sampleContext, 'vocab-sensor', 'vocabulary')
      expect(res.status).toBe('verified_weak')
      expect(res.hasPriorExposure).toBe(true)
      expect(res.isVerifiedAbsence).toBe(false)
      expect(res.recentResults).toHaveLength(2)
    })

    it('returns no_prior_exposure with isVerifiedAbsence=true for confirmed absent target', () => {
      const res = verifyLifetimeTarget(sampleContext, 'vocab-unknown-word', 'vocabulary')
      expect(res.status).toBe('no_prior_exposure')
      expect(res.isVerifiedAbsence).toBe(true)
      expect(res.hasPriorExposure).toBe(false)
      expect(res.recentResults).toHaveLength(0)
    })

    it('returns insufficient_evidence when target has older evidence but is missing from lifetime buckets', () => {
      const contextWithUnaggregatedEvidence: GenerationContext = {
        grade: 7,
        preferences: [],
        priorFeedback: [],
        lifetimeLearningMemory: {
          vocabulary: {
            total: 2,
            verifiedWeakTargetIds: [],
            dueTargetIds: [],
            uncertainTargetIds: [],
            masteredTargetIds: ['vocab-motor'],
            regressionTargetIds: [],
          },
          grammar: {
            total: 0,
            verifiedWeakTargetIds: [],
            dueTargetIds: [],
            uncertainTargetIds: [],
            masteredTargetIds: [],
            regressionTargetIds: [],
          },
          communication: {
            total: 0,
            verifiedWeakTargetIds: [],
            dueTargetIds: [],
            uncertainTargetIds: [],
            masteredTargetIds: [],
            regressionTargetIds: [],
          },
        },
        targetedOlderEvidence: [
          {
            targetType: 'vocabulary',
            targetId: 'vocab-unaggregated',
            result: 'incorrect',
            observedAt: '2026-08-25T10:00:00.000Z',
          },
        ],
      }

      const res = verifyLifetimeTarget(contextWithUnaggregatedEvidence, 'vocab-unaggregated', 'vocabulary')
      expect(res.status).toBe('insufficient_evidence')
      expect(res.isVerifiedAbsence).toBe(false)
      expect(res.hasPriorExposure).toBe(true)
      expect(res.recentResults).toHaveLength(1)
    })

    it('returns not_retrieved when lifetime memory is not loaded and no older evidence exists', () => {
      const emptyContext: GenerationContext = {
        grade: 7,
        preferences: [],
        priorFeedback: [],
      }

      const res = verifyLifetimeTarget(emptyContext, 'vocab-anything', 'vocabulary')
      expect(res.status).toBe('not_retrieved')
      expect(res.isVerifiedAbsence).toBe(false)
      expect(res.hasPriorExposure).toBe(false)
    })
  })
})
