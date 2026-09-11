/**
 * Deterministic short-answer normalization for Direct Assessment.
 * Performs whitespace trimming, case-insensitivity, and terminal punctuation removal.
 * Does NOT perform fuzzy matching or semantic equivalence.
 */
export function normalizeShortAnswer(answer: string | null | undefined): string {
  if (!answer) return ''
  return answer
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[.,?!;:'"“”‘’]+|[.,?!;:'"“”‘’]+$/g, '')
    .trim()
}

/**
 * Checks if a candidate answer matches any of the accepted answers deterministically.
 */
export function matchesAcceptedAnswer(
  candidate: string | null | undefined,
  acceptedAnswers: readonly string[]
): boolean {
  const normalizedCandidate = normalizeShortAnswer(candidate)
  if (!normalizedCandidate) return false

  return acceptedAnswers.some((accepted) => normalizeShortAnswer(accepted) === normalizedCandidate)
}
