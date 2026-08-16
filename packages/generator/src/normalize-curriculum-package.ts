export function countWords(texts: string[]): number {
  return texts.join(' ').trim().split(/\s+/u).filter(Boolean).length
}

export function extractBlockTexts(blocks: any[]): string[] {
  const texts: string[] = []
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue
    if (typeof block.text === 'string') texts.push(block.text)
    if (typeof block.speaker === 'string') texts.push(block.speaker)
    if (typeof block.heading === 'string') texts.push(block.heading)
    if (typeof block.timeOrStep === 'string') texts.push(block.timeOrStep)
    if (typeof block.event === 'string') texts.push(block.event)
    if (typeof block.detail === 'string') texts.push(block.detail)
  }
  return texts
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
    typeof pkg.studentLesson.reading === 'object'
  ) {
    if (Array.isArray(pkg.studentLesson.reading.blocks)) {
      const texts = extractBlockTexts(pkg.studentLesson.reading.blocks)
      pkg.studentLesson.reading.wordCount = countWords(texts)
    } else if (Array.isArray(pkg.studentLesson.reading.paragraphs)) {
      pkg.studentLesson.reading.wordCount = countWords(pkg.studentLesson.reading.paragraphs)
    }
  }

  return pkg
}
