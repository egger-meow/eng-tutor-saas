import { CURRENT_ENGINE_VERSION } from './engine-version.js'

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

const OPTION_PREFIX_REGEX = /^(?:\([A-Da-d]\)|\[[A-Da-d]\]|[A-Da-d][).:])\s*/u

/**
 * Strips accidental option prefix markers such as `(A) `, `(B) `, `A) `, `A. `, `A: `, `[A] `
 * so options always contain only the clean answer content and never render as `(A) (A) ...` or `(A) A) ...`.
 */
export function cleanOptionPrefix(text: string): string {
  if (typeof text !== 'string') return text
  return text.replace(OPTION_PREFIX_REGEX, '').trim()
}

export function computeQuestionDuration(question: any): number {
  if (!question || typeof question !== 'object') return 2

  const itemType = question.itemType
  const writingLines = typeof question.writingLines === 'number' ? question.writingLines : 0

  if (itemType === 'sentence-production' || itemType === 'short-response' || itemType === 'translation' || writingLines >= 2) {
    return 3.5
  }
  if (itemType === 'inference' || itemType === 'context-clue' || itemType === 'author-purpose' || itemType === 'sequence' || itemType === 'main-idea') {
    return 2.5
  }
  return 1.5
}

export function computeDeterministicHomeworkMinutes(homework: any): number {
  if (!homework || typeof homework !== 'object' || !Array.isArray(homework.questions)) return 15

  let total = 2 // base transition buffer
  for (const q of homework.questions) {
    const itemType = q?.itemType
    const lines = typeof q?.writingLines === 'number' ? q.writingLines : 0
    if (itemType === 'sentence-production' || itemType === 'short-response' || itemType === 'translation' || lines >= 2) {
      total += 3.0
    } else {
      total += 1.5
    }
  }
  return Math.max(5, Math.min(90, Math.round(total)))
}

export function computeDeterministicPlanMinutes(pkg: Record<string, any>): number {
  const lesson = pkg.studentLesson
  if (!lesson || typeof lesson !== 'object') return 60

  const wordCount = typeof lesson.reading?.wordCount === 'number' ? lesson.reading.wordCount : 250
  const vocabCount = Array.isArray(lesson.vocabulary) ? lesson.vocabulary.length : 8

  const readingMinutes = Math.round(wordCount / 70) + 2
  const vocabMinutes = vocabCount * 1.0
  const instructionMinutes = 7
  const baseMinutes = 4

  let practiceMinutes = 0
  if (Array.isArray(lesson.practice)) {
    for (const stage of lesson.practice) {
      if (stage && Array.isArray(stage.questions)) {
        for (const q of stage.questions) {
          practiceMinutes += computeQuestionDuration(q)
        }
      }
    }
  }

  const homeworkMinutes = computeDeterministicHomeworkMinutes(lesson.homework)
  const total = readingMinutes + vocabMinutes + instructionMinutes + baseMinutes + practiceMinutes + homeworkMinutes

  return Math.max(30, Math.min(240, Math.round(total)))
}

/**
 * Deterministic Normalization Layer
 *
 * Core Principle: Only derive information for which there is exactly one deterministic correct value.
 * Computer may calculate. Computer may not invent pedagogy.
 *
 * Automatically computes machine-derivable fields (such as actual wordCount, estimatedMinutes, homework.estimatedMinutes)
 * and strips redundant formatting artifacts (such as duplicated option letter prefixes)
 * so that LLMs are never failed or retried due to arithmetic or formatting discrepancies.
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

  // Deterministically strip duplicate option prefixes across practice & homework questions
  if (pkg.studentLesson && typeof pkg.studentLesson === 'object') {
    if (Array.isArray(pkg.studentLesson.practice)) {
      for (const section of pkg.studentLesson.practice) {
        if (section && typeof section === 'object' && Array.isArray(section.questions)) {
          for (const question of section.questions) {
            if (question && Array.isArray(question.options)) {
              question.options = question.options.map((opt: unknown) =>
                typeof opt === 'string' ? cleanOptionPrefix(opt) : opt,
              )
            }
          }
        }
      }
    }

    if (
      pkg.studentLesson.homework &&
      typeof pkg.studentLesson.homework === 'object' &&
      Array.isArray(pkg.studentLesson.homework.questions)
    ) {
      for (const question of pkg.studentLesson.homework.questions) {
        if (question && Array.isArray(question.options)) {
          question.options = question.options.map((opt: unknown) =>
            typeof opt === 'string' ? cleanOptionPrefix(opt) : opt,
          )
        }
      }
    }

    // Deterministically compute calibrated homework duration
    if (pkg.studentLesson.homework && typeof pkg.studentLesson.homework === 'object') {
      pkg.studentLesson.homework.estimatedMinutes = computeDeterministicHomeworkMinutes(pkg.studentLesson.homework)
    }
  }

  // Deterministically compute calibrated total lesson plan duration
  if (pkg.learningPlan && typeof pkg.learningPlan === 'object') {
    pkg.learningPlan.estimatedMinutes = computeDeterministicPlanMinutes(pkg)
  }

  // Ensure canonical engineVersion is present in metadata
  if (pkg.metadata && typeof pkg.metadata === 'object' && !pkg.metadata.engineVersion) {
    pkg.metadata.engineVersion = CURRENT_ENGINE_VERSION
  }

  return pkg
}
