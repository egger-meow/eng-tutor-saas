import { createHash } from 'node:crypto'
import type { GenerationContext, LifetimeTargetMemory } from './index.js'

export interface HistoryRetrievalQuery {
  targetIds?: string[]
  targetType?: 'vocabulary' | 'grammar' | 'communication' | 'reading'
  limit?: number
  cutoffTimestamp?: string
}

export interface RetrievedTargetHistory {
  targetId: string
  targetType: 'vocabulary' | 'grammar' | 'communication' | 'reading'
  status: 'verified_weak' | 'review_due' | 'regression' | 'uncertain' | 'mastered' | 'unseen'
  priorityRank: number
  recentResults: Array<{
    result: 'correct' | 'incorrect' | 'partial' | 'unknown'
    observedAt: string
  }>
  hasPriorEvidence: boolean
}

export interface MissingTargetIndicator {
  targetId: string
  targetType: 'vocabulary' | 'grammar' | 'communication' | 'reading'
  reason: 'no_prior_learning_evidence'
  recommendedPolicy: 'treat_as_new_learning'
}

export interface StudentHistoryRetrievalResult {
  retrievedTargets: RetrievedTargetHistory[]
  missingTargets: MissingTargetIndicator[]
  provenanceHash: string
  cutoffTimestamp: string
  isBounded: boolean
  totalCandidatesConsidered: number
}

function computeHash(content: string): string {
  return 'sha256:' + createHash('sha256').update(content).digest('hex')
}

/**
 * Deterministically extracts prioritized student history bounded to top 3-5 items with provenance pinning.
 */
export function retrieveTargetedStudentHistory(
  context: GenerationContext,
  query: HistoryRetrievalQuery = {},
): StudentHistoryRetrievalResult {
  const limit = Math.max(1, Math.min(5, query.limit ?? 3))
  const cutoffTimestamp = query.cutoffTimestamp ?? new Date().toISOString()
  const lifetime = context.lifetimeLearningMemory
  const olderEvidence = context.targetedOlderEvidence ?? []

  const targetTypes: Array<'vocabulary' | 'grammar' | 'communication'> = query.targetType
    ? [query.targetType as 'vocabulary' | 'grammar' | 'communication']
    : ['vocabulary', 'grammar', 'communication']

  const candidateMap = new Map<string, {
    targetId: string
    targetType: 'vocabulary' | 'grammar' | 'communication' | 'reading'
    status: 'verified_weak' | 'review_due' | 'regression' | 'uncertain' | 'mastered' | 'unseen'
    priorityRank: number
  }>()

  // If specific target IDs are queried, investigate them directly
  const specificTargets = query.targetIds ? new Set(query.targetIds) : null

  for (const type of targetTypes) {
    const mem: LifetimeTargetMemory | undefined = lifetime?.[type]
    if (!mem) continue

    // Priority 1: Verified weak targets (Rank 1)
    for (const id of mem.verifiedWeakTargetIds) {
      if (!specificTargets || specificTargets.has(id)) {
        candidateMap.set(`${type}:${id}`, {
          targetId: id,
          targetType: type,
          status: 'verified_weak',
          priorityRank: 1,
        })
      }
    }

    // Priority 2: Review-due targets (Rank 2)
    for (const id of mem.dueTargetIds) {
      if (!specificTargets || specificTargets.has(id)) {
        if (!candidateMap.has(`${type}:${id}`)) {
          candidateMap.set(`${type}:${id}`, {
            targetId: id,
            targetType: type,
            status: 'review_due',
            priorityRank: 2,
          })
        }
      }
    }

    // Priority 3: Regression after mastery (Rank 3)
    for (const id of mem.regressionTargetIds) {
      if (!specificTargets || specificTargets.has(id)) {
        if (!candidateMap.has(`${type}:${id}`)) {
          candidateMap.set(`${type}:${id}`, {
            targetId: id,
            targetType: type,
            status: 'regression',
            priorityRank: 3,
          })
        }
      }
    }

    // Priority 4: Uncertain / currently learning (Rank 4)
    for (const id of mem.uncertainTargetIds) {
      if (!specificTargets || specificTargets.has(id)) {
        if (!candidateMap.has(`${type}:${id}`)) {
          candidateMap.set(`${type}:${id}`, {
            targetId: id,
            targetType: type,
            status: 'uncertain',
            priorityRank: 4,
          })
        }
      }
    }

    // Mastered targets (Rank 5)
    for (const id of mem.masteredTargetIds) {
      if (specificTargets && specificTargets.has(id)) {
        if (!candidateMap.has(`${type}:${id}`)) {
          candidateMap.set(`${type}:${id}`, {
            targetId: id,
            targetType: type,
            status: 'mastered',
            priorityRank: 5,
          })
        }
      }
    }
  }

  // Identify any specific queried targets that had NO lifetime memory records (unseen targets)
  const missingTargets: MissingTargetIndicator[] = []
  if (specificTargets) {
    for (const targetId of specificTargets) {
      const foundInCandidates = Array.from(candidateMap.values()).some((c) => c.targetId === targetId)
      if (!foundInCandidates) {
        missingTargets.push({
          targetId,
          targetType: query.targetType ?? 'vocabulary',
          reason: 'no_prior_learning_evidence',
          recommendedPolicy: 'treat_as_new_learning',
        })
      }
    }
  }

  // Sort candidates by priorityRank ascending, then targetId alphabetical
  const sortedCandidates = Array.from(candidateMap.values()).sort(
    (a, b) => a.priorityRank - b.priorityRank || a.targetId.localeCompare(b.targetId),
  )

  const bounded = sortedCandidates.slice(0, limit)

  // Attach historical evidence observations to each bounded target
  const retrievedTargets: RetrievedTargetHistory[] = bounded.map((c) => {
    const matchingEvidence = olderEvidence
      .filter((e) => e.targetId === c.targetId && e.targetType === c.targetType)
      .map((e) => ({
        result: e.result,
        observedAt: e.observedAt,
      }))

    return {
      targetId: c.targetId,
      targetType: c.targetType,
      status: c.status,
      priorityRank: c.priorityRank,
      recentResults: matchingEvidence,
      hasPriorEvidence: matchingEvidence.length > 0 || c.status !== 'unseen',
    }
  })

  // Compute immutable provenance hash pinning this exact retrieved slice
  const provenancePayload = JSON.stringify({
    cutoffTimestamp,
    retrieved: retrievedTargets.map((r) => ({ id: r.targetId, status: r.status, rank: r.priorityRank })),
    missing: missingTargets.map((m) => m.targetId),
  })
  const provenanceHash = computeHash(provenancePayload)

  return {
    retrievedTargets,
    missingTargets,
    provenanceHash,
    cutoffTimestamp,
    isBounded: true,
    totalCandidatesConsidered: sortedCandidates.length,
  }
}
