import type { AssessmentItem, AssessmentSkill } from '../contracts.js'

/**
 * Deterministically selects the best candidate item for a skill and target difficulty,
 * guaranteeing no item repetition within the same session.
 */
export function selectCandidateItem(
  items: readonly AssessmentItem[],
  targetSkill: AssessmentSkill,
  targetDifficulty: number,
  usedItemIds: ReadonlySet<string> | readonly string[],
  currentPassageId?: string | null,
  previousSessionItemIds?: ReadonlySet<string> | readonly string[] | null,
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

  return candidates[0] || null
}
