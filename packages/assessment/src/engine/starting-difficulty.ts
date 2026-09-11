import type { ChildGradeStage, OnboardingLevel } from './types.js'

/**
 * Computes the starting difficulty (1 to 5) for a child.
 * Baseline by grade stage:
 *   - incoming_grade_7, grade_7 -> 2
 *   - grade_8 -> 3
 *   - grade_9 -> 4
 * Weak onboarding prior adjustment (at most +/- 1):
 *   - needs-support -> -1
 *   - developing, on-level -> 0
 *   - advanced -> +1
 * Clamped strictly to range [1, 5].
 */
export function computeStartingDifficulty(
  gradeStage: ChildGradeStage | string | null | undefined,
  onboardingLevel?: OnboardingLevel | string | null
): number {
  let baseline = 2

  if (gradeStage === 'grade_8') {
    baseline = 3
  } else if (gradeStage === 'grade_9') {
    baseline = 4
  } else if (gradeStage === 'incoming_grade_7' || gradeStage === 'grade_7') {
    baseline = 2
  } else {
    // Fallback for any undefined or other grade stages
    baseline = 2
  }

  let adjustment = 0
  if (onboardingLevel === 'needs-support') {
    adjustment = -1
  } else if (onboardingLevel === 'advanced') {
    adjustment = 1
  }

  const finalDifficulty = baseline + adjustment
  return Math.max(1, Math.min(5, finalDifficulty))
}
