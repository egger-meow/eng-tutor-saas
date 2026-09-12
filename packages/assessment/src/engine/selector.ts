import type { AssessmentItem, AssessmentSkill } from '../contracts.js'

/**
 * Deterministically selects the best candidate item for a skill and target difficulty,
 * guaranteeing no item repetition within the same session.
 *
 * When multiple candidates tie for the highest priority (same difficulty distance,
 * same passage continuity, and same previous-session avoidance), an optional randomizer
 * selects randomly among the tied top-tier candidates. If no randomizer is provided,
 * stable alphabetical tie-breaking by ID is preserved.
 */
export function selectCandidateItem(
  items: readonly AssessmentItem[],
  targetSkill: AssessmentSkill,
  targetDifficulty: number,
  usedItemIds: ReadonlySet<string> | readonly string[],
  currentPassageId?: string | null,
  previousSessionItemIds?: ReadonlySet<string> | readonly string[] | null,
  randomizer?: () => number
): AssessmentItem | null {
  const usedSet = usedItemIds instanceof Set ? usedItemIds : new Set(usedItemIds)
  const previousSet = previousSessionItemIds
    ? previousSessionItemIds instanceof Set
      ? previousSessionItemIds
      : new Set(previousSessionItemIds)
    : null

  // Filter candidates for this skill
  const candidates = items.filter(
    (item) =>
      item.skill === targetSkill &&
      item.status === 'active' &&
      !usedSet.has(item.id)
  )

  if (candidates.length === 0) {
    return null
  }

  // Sort deterministically:
  // 1. Closest difficulty distance (preserves difficulty routing)
  // 2. Reading domain: prefer same passage if one was recently read and still has questions
  // 3. Immediate repetition avoidance: prefer item not used in learner's previous assessment
  // 4. Stable tie-breaker by ID
  candidates.sort((a, b) => {
    const distA = Math.abs(a.difficulty - targetDifficulty)
    const distB = Math.abs(b.difficulty - targetDifficulty)
    if (distA !== distB) {
      return distA - distB
    }

    if (currentPassageId) {
      const matchA = a.passageId === currentPassageId ? 1 : 0
      const matchB = b.passageId === currentPassageId ? 1 : 0
      if (matchA !== matchB) {
        return matchB - matchA // prefer matching passage
      }
    }

    if (previousSet && previousSet.size > 0) {
      const prevA = previousSet.has(a.id) ? 1 : 0
      const prevB = previousSet.has(b.id) ? 1 : 0
      if (prevA !== prevB) {
        return prevA - prevB // prefer item not in previous session (0 < 1)
      }
    }

    return a.id.localeCompare(b.id)
  })

  if (!randomizer) {
    return candidates[0] || null
  }

  // Identify all candidates that tie on the top priority tier
  const best = candidates[0]
  const bestDist = Math.abs(best.difficulty - targetDifficulty)
  const bestMatch = currentPassageId && best.passageId === currentPassageId ? 1 : 0
  const bestPrev = previousSet && previousSet.has(best.id) ? 1 : 0

  const topTier = candidates.filter((item) => {
    const dist = Math.abs(item.difficulty - targetDifficulty)
    const match = currentPassageId && item.passageId === currentPassageId ? 1 : 0
    const prev = previousSet && previousSet.has(item.id) ? 1 : 0
    return dist === bestDist && match === bestMatch && prev === bestPrev
  })

  const randVal = randomizer()
  const idx = Math.min(topTier.length - 1, Math.max(0, Math.floor(randVal * topTier.length)))
  return topTier[idx] || null
}
