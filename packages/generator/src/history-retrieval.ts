import { createHash } from 'node:crypto'
import type { GenerationContext, LifetimeTargetMemory } from './index.js'

export interface HistoryRetrievalQuery {
  targetIds?: string[]
  targetType?: 'vocabulary' | 'grammar' | 'communication' | 'reading'
  limit?: number
  cutoffTimestamp?: string
  childId?: string
  sourceClaimId?: string
}

export interface RetrievedTargetHistory {
  targetId: string
  targetType: 'vocabulary' | 'grammar' | 'communication' | 'reading'
  status: 'verified_weak' | 'review_due' | 'regression' | 'uncertain' | 'mastered' | 'unseen' | 'insufficient_evidence'
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
  reason: 'no_prior_learning_evidence' | 'insufficient_evidence' | 'not_retrieved'
  recommendedPolicy: 'treat_as_new_learning' | 'defer_until_evidence_loaded'
}

export interface StudentHistoryRetrievalResult {
  retrievedTargets: RetrievedTargetHistory[]
  missingTargets: MissingTargetIndicator[]
  provenanceHash: string
  cutoffTimestamp: string
  isBounded: boolean
  totalCandidatesConsidered: number
}

export type LifetimeTargetVerificationStatus =
  | 'verified_weak'
  | 'review_due'
  | 'regression'
  | 'uncertain'
  | 'mastered'
  | 'no_prior_exposure'
  | 'insufficient_evidence'
  | 'not_retrieved'

export interface LifetimeTargetVerificationResult {
  targetId: string
  targetType: 'vocabulary' | 'grammar' | 'communication' | 'reading'
  status: LifetimeTargetVerificationStatus
  hasPriorExposure: boolean
  isVerifiedAbsence: boolean
  recentResults: Array<{
    result: 'correct' | 'incorrect' | 'partial' | 'unknown'
    observedAt: string
  }>
  reason?: string
}

function computeHash(content: string): string {
  return 'sha256:' + createHash('sha256').update(content).digest('hex')
}

/**
 * Distinguishes verified absence from unretrieved data or insufficient evidence for a target.
 */
export function verifyLifetimeTarget(
  context: GenerationContext,
  targetId: string,
  targetType: 'vocabulary' | 'grammar' | 'communication' | 'reading',
  options?: { cutoffTimestamp?: string },
): LifetimeTargetVerificationResult {
  const cutoffTimestamp = options?.cutoffTimestamp
  const cutoffTime = cutoffTimestamp ? Date.parse(cutoffTimestamp) : NaN

  const olderEvidence = (context.targetedOlderEvidence ?? []).filter((e) => {
    if (e.targetId !== targetId || e.targetType !== targetType) return false
    if (!cutoffTimestamp || isNaN(cutoffTime)) return true
    const t = Date.parse(e.observedAt)
    return isNaN(t) || t <= cutoffTime
  })

  const recentResults = olderEvidence.map((e) => ({
    result: e.result,
    observedAt: e.observedAt,
  }))

  const lifetime = context.lifetimeLearningMemory
  if (targetType === 'reading') {
    if (recentResults.length > 0) {
      return {
        targetId,
        targetType,
        status: 'insufficient_evidence',
        hasPriorExposure: true,
        isVerifiedAbsence: false,
        recentResults,
        reason: 'reading_target_in_older_evidence_without_lifetime_summary',
      }
    }
    return {
      targetId,
      targetType,
      status: 'not_retrieved',
      hasPriorExposure: false,
      isVerifiedAbsence: false,
      recentResults: [],
      reason: 'reading_lifetime_memory_not_modeled',
    }
  }

  const memoryBucket = lifetime ? lifetime[targetType] : undefined
  if (!memoryBucket) {
    if (recentResults.length > 0) {
      return {
        targetId,
        targetType,
        status: 'insufficient_evidence',
        hasPriorExposure: true,
        isVerifiedAbsence: false,
        recentResults,
        reason: 'evidence_exists_in_older_evidence_but_lifetime_memory_not_loaded',
      }
    }
    return {
      targetId,
      targetType,
      status: 'not_retrieved',
      hasPriorExposure: false,
      isVerifiedAbsence: false,
      recentResults: [],
      reason: 'lifetime_memory_not_loaded',
    }
  }

  if (memoryBucket.verifiedWeakTargetIds.includes(targetId)) {
    return {
      targetId,
      targetType,
      status: 'verified_weak',
      hasPriorExposure: true,
      isVerifiedAbsence: false,
      recentResults,
    }
  }
  if (memoryBucket.dueTargetIds.includes(targetId)) {
    return {
      targetId,
      targetType,
      status: 'review_due',
      hasPriorExposure: true,
      isVerifiedAbsence: false,
      recentResults,
    }
  }
  if (memoryBucket.regressionTargetIds.includes(targetId)) {
    return {
      targetId,
      targetType,
      status: 'regression',
      hasPriorExposure: true,
      isVerifiedAbsence: false,
      recentResults,
    }
  }
  if (memoryBucket.uncertainTargetIds.includes(targetId)) {
    return {
      targetId,
      targetType,
      status: 'uncertain',
      hasPriorExposure: true,
      isVerifiedAbsence: false,
      recentResults,
    }
  }
  if (memoryBucket.masteredTargetIds.includes(targetId)) {
    return {
      targetId,
      targetType,
      status: 'mastered',
      hasPriorExposure: true,
      isVerifiedAbsence: false,
      recentResults,
    }
  }

  if (recentResults.length > 0) {
    return {
      targetId,
      targetType,
      status: 'insufficient_evidence',
      hasPriorExposure: true,
      isVerifiedAbsence: false,
      recentResults,
      reason: 'evidence_exists_in_older_evidence_but_missing_from_lifetime_buckets',
    }
  }

  return {
    targetId,
    targetType,
    status: 'no_prior_exposure',
    hasPriorExposure: false,
    isVerifiedAbsence: true,
    recentResults: [],
  }
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
  const cutoffTime = Date.parse(cutoffTimestamp)
  const lifetime = context.lifetimeLearningMemory

  // Filter older evidence strictly by cutoffTimestamp (exclude observations after cutoff)
  const olderEvidence = (context.targetedOlderEvidence ?? []).filter((e) => {
    if (isNaN(cutoffTime)) return true
    const t = Date.parse(e.observedAt)
    return isNaN(t) || t <= cutoffTime
  })

  const targetTypes: Array<'vocabulary' | 'grammar' | 'communication'> = query.targetType
    ? [query.targetType as 'vocabulary' | 'grammar' | 'communication']
    : ['vocabulary', 'grammar', 'communication']

  const candidateMap = new Map<string, {
    targetId: string
    targetType: 'vocabulary' | 'grammar' | 'communication' | 'reading'
    status: 'verified_weak' | 'review_due' | 'regression' | 'uncertain' | 'mastered' | 'unseen' | 'insufficient_evidence'
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

  // Identify any specific queried targets that were not found in candidateMap
  const missingTargets: MissingTargetIndicator[] = []
  if (specificTargets) {
    for (const targetId of specificTargets) {
      const foundInCandidates = Array.from(candidateMap.values()).some((c) => c.targetId === targetId)
      if (!foundInCandidates) {
        const verification = verifyLifetimeTarget(
          context,
          targetId,
          query.targetType ?? 'vocabulary',
          { cutoffTimestamp },
        )

        if (verification.status === 'insufficient_evidence') {
          missingTargets.push({
            targetId,
            targetType: query.targetType ?? 'vocabulary',
            reason: 'insufficient_evidence',
            recommendedPolicy: 'defer_until_evidence_loaded',
          })
        } else if (verification.status === 'not_retrieved') {
          missingTargets.push({
            targetId,
            targetType: query.targetType ?? 'vocabulary',
            reason: 'not_retrieved',
            recommendedPolicy: 'defer_until_evidence_loaded',
          })
        } else {
          missingTargets.push({
            targetId,
            targetType: query.targetType ?? 'vocabulary',
            reason: 'no_prior_learning_evidence',
            recommendedPolicy: 'treat_as_new_learning',
          })
        }
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

  // Compute immutable provenance hash pinning this exact retrieved slice, results, timestamps, and claim/source identity
  const provenancePayload = JSON.stringify({
    childId: query.childId ?? context.childId ?? 'anonymous-child',
    sourceClaimId: query.sourceClaimId ?? 'unspecified-claim',
    cutoffTimestamp,
    retrieved: retrievedTargets.map((r) => ({
      targetType: r.targetType,
      targetId: r.targetId,
      status: r.status,
      priorityRank: r.priorityRank,
      results: r.recentResults.map((res) => ({
        result: res.result,
        observedAt: res.observedAt,
      })),
    })),
    missing: missingTargets.map((m) => ({
      targetType: m.targetType,
      targetId: m.targetId,
      reason: m.reason,
    })),
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
