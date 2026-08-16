export function countWords(paragraphs: string[]): number {
  return paragraphs.join(' ').trim().split(/\s+/u).filter(Boolean).length
}

/**
 * Deterministic Normalization Layer
 *
 * Core Principle: Only derive information for which there is exactly one deterministic correct value.
 * Computer may calculate. Computer may not invent pedagogy.
 *
 * Automatically computes machine-derivable fields (such as actual wordCount)
 * so that LLMs are never failed or retried due to arithmetic counting discrepancies.
 */
export function normalizeCurriculumPackage(input: unknown): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input

  const pkg = structuredClone(input) as Record<string, any>

  if (
    pkg.studentLesson &&
    typeof pkg.studentLesson === 'object' &&
    pkg.studentLesson.reading &&
    typeof pkg.studentLesson.reading === 'object' &&
    Array.isArray(pkg.studentLesson.reading.paragraphs)
  ) {
    const actualWords = countWords(pkg.studentLesson.reading.paragraphs)
    pkg.studentLesson.reading.wordCount = actualWords
  }

  return pkg
}
