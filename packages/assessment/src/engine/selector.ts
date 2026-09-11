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
  currentPassageId?: string | null
): AssessmentItem | null {
  const usedSet = usedItemIds instanceof Set ? usedItemIds : new Set(usedItemIds)

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
  // 1. Closest difficulty distance
  // 2. Reading domain: prefer same passage if one was recently read and still has questions
  // 3. Stable tie-breaker by ID
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

    return a.id.localeCompare(b.id)
  })

  return candidates[0] || null
}
