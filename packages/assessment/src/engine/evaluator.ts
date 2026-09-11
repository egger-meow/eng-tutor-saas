import type {
  AssessmentItem,
  AssessmentResponseOutcome,
  AssessmentSkill,
} from '../contracts.js'
import { SKILL_TO_DOMAIN_MAP } from '../contracts.js'
import { matchesAcceptedAnswer } from '../bank/normalizer.js'
import type { SkillEvidence } from './types.js'

/**
 * Pure server-side grading function for assessment items.
 * Single-choice: exact choice ID match (case-insensitive).
 * Short-answer: deterministic normalized match against accepted answers.
 * Skip or empty answer: 'skipped'.
 */
export function gradeAssessmentAnswer(
  item: AssessmentItem,
  rawAnswer: string | null | undefined,
  isSkipped: boolean
): AssessmentResponseOutcome {
  if (isSkipped || rawAnswer === null || rawAnswer === undefined) {
    return 'skipped'
  }

  const trimmed = rawAnswer.trim()
  if (trimmed.length === 0) {
    return 'skipped'
  }

  if (item.responseType === 'single_choice') {
    if (!item.correctChoice) return 'incorrect'
    return trimmed.toUpperCase() === item.correctChoice.trim().toUpperCase()
      ? 'correct'
      : 'incorrect'
  }

  if (item.responseType === 'short_answer') {
    if (!item.acceptedAnswers || item.acceptedAnswers.length === 0) return 'incorrect'
    return matchesAcceptedAnswer(trimmed, item.acceptedAnswers)
      ? 'correct'
      : 'incorrect'
  }

  return 'incorrect'
}

/**
 * Creates empty initial evidence for a skill.
 */
export function createInitialSkillEvidence(skill: AssessmentSkill): SkillEvidence {
  return {
    skill,
    domain: SKILL_TO_DOMAIN_MAP[skill],
    attempts: 0,
    correct: 0,
    incorrect: 0,
    skipped: 0,
    difficulties: [],
    outcomes: [],
    itemIds: [],
    hasContradiction: false,
  }
}

/**
 * Pure function to record a response into a skill's evidence and evaluate contradiction.
 */
export function recordSkillResponse(
  existing: SkillEvidence | undefined,
  item: AssessmentItem,
  outcome: AssessmentResponseOutcome
): SkillEvidence {
  const current: SkillEvidence = existing
    ? {
        ...existing,
        difficulties: [...existing.difficulties],
        outcomes: [...existing.outcomes],
        itemIds: [...existing.itemIds],
      }
    : createInitialSkillEvidence(item.skill)

  current.attempts++
  current.itemIds.push(item.id)
  current.difficulties.push(item.difficulty)
  current.outcomes.push(outcome)

  if (outcome === 'correct') {
    current.correct++
  } else if (outcome === 'incorrect') {
    current.incorrect++
  } else if (outcome === 'skipped') {
    current.skipped++
  }

  // Evaluate contradiction:
  // If the student has answered correctly at difficulty D_corr,
  // but answered incorrectly or skipped at difficulty D_fail where D_corr >= D_fail.
  let hasContradiction = false
  for (let i = 0; i < current.outcomes.length; i++) {
    if (current.outcomes[i] === 'correct') {
      const corrDiff = current.difficulties[i]
      for (let j = 0; j < current.outcomes.length; j++) {
        if (current.outcomes[j] === 'incorrect' || current.outcomes[j] === 'skipped') {
          const failDiff = current.difficulties[j]
          if (corrDiff >= failDiff) {
            hasContradiction = true
            break
          }
        }
      }
    }
    if (hasContradiction) break
  }

  current.hasContradiction = hasContradiction
  return current
}
