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

const TRAILING_TOTAL_DURATION_REGEX =
  /(?:[，,；;]\s*)?(?:(?:整體|全部|全程|總共|總計|合計)(?:學習)?(?:時間)?|(?:整份|本份|本週)(?:教材|學習)?(?:總共|總計|合計)?(?:時間)?)\s*(?:大約|約)?\s*[0-9０-９]+\s*分(?:鐘)?\s*[。.!！]?\s*$/u

/** Removes only an authored trailing whole-package duration claim. */
export function stripTrailingTotalDuration(text: string): string {
  if (typeof text !== 'string') return text
  return text.replace(TRAILING_TOTAL_DURATION_REGEX, '').trim()
}

export function computeQuestionDuration(question: any): number {
  if (!question || typeof question !== 'object') return 2

  const itemType = question.itemType
  const writingLines = typeof question.writingLines === 'number' ? question.writingLines : 0

  if (itemType === 'sentence-production' || itemType === 'short-response' || itemType === 'translation' || writingLines >= 2) {
    return Math.max(3.5, Math.min(7, 2.5 + writingLines * 0.5))
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
    total += computeQuestionDuration(q)
  }
  return Math.max(5, Math.min(90, Math.round(total)))
}

export function computeDeterministicPlanMinutes(pkg: Record<string, any>): number {
  const lesson = pkg.studentLesson
  if (!lesson || typeof lesson !== 'object') return 60

  const wordCount = typeof lesson.reading?.wordCount === 'number' ? lesson.reading.wordCount : 250
  const vocabCount = Array.isArray(lesson.vocabulary) ? lesson.vocabulary.length : 8

  const readingStrategyMinutes = Array.isArray(lesson.reading?.readingTipsZh)
    ? lesson.reading.readingTipsZh.length
    : 0
  const readingMinutes = Math.round(wordCount / 70) + 2 + readingStrategyMinutes
  const vocabMinutes = vocabCount * 1.0
  const instructionMinutes = Array.isArray(lesson.instruction)
    ? lesson.instruction.reduce((total: number, section: any) => {
      const examples = Array.isArray(section?.workedExamples) ? section.workedExamples.length : 0
      const mistakes = Array.isArray(section?.commonMistakes) ? section.commonMistakes.length : 0
      return total + 4 + examples + mistakes
    }, 0)
    : 7
  const warmUpMinutes = typeof lesson.opening?.warmUp === 'string' && lesson.opening.warmUp.trim() ? 2 : 0
  const selfCheckMinutes = Array.isArray(lesson.selfCheckZh) ? Math.ceil(lesson.selfCheckZh.length * 0.5) : 0
  const adaptiveExtensionMinutes = lesson.adaptiveExtension
    ? 2 + (lesson.adaptiveExtension.taskZh ? 2 : 0) + Math.ceil((lesson.adaptiveExtension.taskWritingLines ?? 0) * 0.5)
    : 0
  const transitionMinutes = 2

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
  const total = readingMinutes + vocabMinutes + instructionMinutes + warmUpMinutes + selfCheckMinutes + adaptiveExtensionMinutes + transitionMinutes + practiceMinutes + homeworkMinutes

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

  // Completion summary owns scope, while the normalized learning plan owns total time.
  if (typeof pkg.parentSummary?.completionCheckZh === 'string') {
    pkg.parentSummary.completionCheckZh = stripTrailingTotalDuration(pkg.parentSummary.completionCheckZh)
  }

  // Ensure canonical engineVersion is present in metadata
  if (pkg.metadata && typeof pkg.metadata === 'object' && !pkg.metadata.engineVersion) {
    pkg.metadata.engineVersion = CURRENT_ENGINE_VERSION
  }

  return pkg
}

/**
 * Resolves the 0-indexed correct option position (0 = A, 1 = B, 2 = C, 3 = D) and letter ('A'..'D')
 * for a 4-option multiple choice question from its matching answer item.
 */
export function resolveQuestionAnswerLetter(
  question: { id: string; options?: readonly unknown[] },
  answerItem?: { questionId: string; answer: string; acceptedAnswers?: readonly string[] },
): { index: number; letter: string } | null {
  if (!question.options || question.options.length !== 4 || !answerItem || typeof answerItem.answer !== 'string') {
    return null
  }
  const ansText = answerItem.answer.trim()

  // 1. Direct single letter
  const singleLetterMatch = ansText.match(/^[A-Da-d]$/u)
  if (singleLetterMatch) {
    const letter = singleLetterMatch[0].toUpperCase()
    return { index: letter.charCodeAt(0) - 65, letter }
  }

  // 2. Prefix letter: e.g. "(A)", "A.", "A)", "[A]", "A: "
  const prefixMatch = ansText.match(/^(?:\(([A-Da-d])\)|\[([A-Da-d])\]|([A-Da-d])[).:])(?:\s|$)/u)
  if (prefixMatch) {
    const letter = (prefixMatch[1] || prefixMatch[2] || prefixMatch[3])!.toUpperCase()
    return { index: letter.charCodeAt(0) - 65, letter }
  }

  // 3. Match against option texts
  const cleanAns = cleanOptionPrefix(ansText).trim().toLowerCase()
  for (let i = 0; i < question.options.length; i++) {
    const opt = question.options[i]
    if (typeof opt === 'string') {
      const cleanOpt = cleanOptionPrefix(opt).trim().toLowerCase()
      if (cleanOpt && (cleanOpt === cleanAns || cleanAns === cleanOpt)) {
        return { index: i, letter: String.fromCharCode(65 + i) }
      }
    }
  }

  // 4. Accepted answers fallback
  if (Array.isArray(answerItem.acceptedAnswers)) {
    for (const alt of answerItem.acceptedAnswers) {
      if (typeof alt === 'string') {
        const altSingle = alt.trim().match(/^[A-Da-d]$/u)
        if (altSingle) {
          const letter = altSingle[0].toUpperCase()
          return { index: letter.charCodeAt(0) - 65, letter }
        }
        const altPrefix = alt.trim().match(/^(?:\(([A-Da-d])\)|\[([A-Da-d])\]|([A-Da-d])[).:])(?:\s|$)/u)
        if (altPrefix) {
          const letter = (altPrefix[1] || altPrefix[2] || altPrefix[3])!.toUpperCase()
          return { index: letter.charCodeAt(0) - 65, letter }
        }
      }
    }
  }

  return null
}

/**
 * Safely remaps option letter references (e.g. (A), 選 A, 答案為 A) in explanation or misconception text.
 */
export function remapOptionLettersInText(text: string, letterMap: Record<string, string>): string {
  if (typeof text !== 'string' || !text) return text
  return text.replace(
    /(\((?:[A-Da-d])\)|（(?:[A-Da-d])）|\[(?:[A-Da-d])\]|(?:[選為是]|答案(?:為|是)?|選項)\s*[A-Da-d]|[A-Da-d]\s*選項)/gu,
    (match) => {
      const m = match.match(/[A-Da-d]/u)
      if (!m) return match
      const oldLetter = m[0].toUpperCase()
      const newLetter = letterMap[oldLetter] ?? oldLetter
      return match.replace(m[0], newLetter)
    },
  )
}

/**
 * Reorders the options of a 4-option multiple-choice question using a permutation array
 * and updates the corresponding answer object to preserve correctness and distractor explanations.
 *
 * @param question Question object with `options: string[]` of length 4.
 * @param newOptionOrder Permutation of [0, 1, 2, 3] indicating source indices for new positions,
 *                       e.g. [1, 0, 2, 3] moves old option 1 to index 0 and old option 0 to index 1.
 * @param answerItem Corresponding answer item in pkg.answers.
 */
export function reorderQuestionOptions<
  Q extends { id: string; options?: string[] },
  A extends { questionId: string; answer: string; acceptedAnswers?: string[]; explanationZh?: string; likelyMisconceptionZh?: string | null },
>(
  question: Q,
  newOptionOrder: number[],
  answerItem?: A,
): { question: Q; answerItem?: A } {
  if (!question.options || question.options.length !== 4) {
    return { question, answerItem }
  }
  if (newOptionOrder.length !== 4 || new Set(newOptionOrder).size !== 4 || !newOptionOrder.every((idx) => idx >= 0 && idx < 4)) {
    throw new Error(`Invalid 4-option permutation: ${JSON.stringify(newOptionOrder)}`)
  }

  const oldOptions = [...question.options]
  const resolved = answerItem ? resolveQuestionAnswerLetter(question, answerItem) : null
  const oldCorrectIdx = resolved ? resolved.index : 0
  const newCorrectIdx = newOptionOrder.indexOf(oldCorrectIdx)

  // Map old letter -> new letter: old index i moves to new index newOptionOrder.indexOf(i)
  const letterMap: Record<string, string> = {}
  for (let oldIdx = 0; oldIdx < 4; oldIdx++) {
    const oldLetter = String.fromCharCode(65 + oldIdx)
    const newIdx = newOptionOrder.indexOf(oldIdx)
    const newLetter = String.fromCharCode(65 + newIdx)
    letterMap[oldLetter] = newLetter
  }

  // Update question options
  question.options = newOptionOrder.map((srcIdx) => oldOptions[srcIdx]!)

  if (answerItem && resolved) {
    const newLetter = String.fromCharCode(65 + newCorrectIdx)
    const oldLetter = resolved.letter

    // Update answer string
    const rawAnswer = answerItem.answer.trim()
    if (/^[A-Da-d]$/u.test(rawAnswer)) {
      answerItem.answer = newLetter
    } else if (/^(?:\([A-Da-d]\)|\[[A-Da-d]\]|[A-Da-d][).:])\s*/u.test(rawAnswer)) {
      const cleanText = cleanOptionPrefix(rawAnswer)
      answerItem.answer = `${newLetter}. ${cleanText}`
    } else {
      // If answer was raw option text, preserve it
      answerItem.answer = rawAnswer
    }

    // Update acceptedAnswers
    if (Array.isArray(answerItem.acceptedAnswers)) {
      answerItem.acceptedAnswers = answerItem.acceptedAnswers.map((alt) => {
        if (typeof alt !== 'string') return alt
        const trimmed = alt.trim()
        if (/^[A-Da-d]$/u.test(trimmed)) {
          return newLetter
        }
        if (/^\([A-Da-d]\)$/u.test(trimmed)) {
          return `(${newLetter})`
        }
        if (/^\[[A-Da-d]\]$/u.test(trimmed)) {
          return `[${newLetter}]`
        }
        if (/^[A-Da-d]\.$/u.test(trimmed)) {
          return `${newLetter}.`
        }
        if (/^[A-Da-d]\)$/u.test(trimmed)) {
          return `${newLetter})`
        }
        if (/^(?:\([A-Da-d]\)|\[[A-Da-d]\]|[A-Da-d][).:])\s*/u.test(trimmed)) {
          const cleanText = cleanOptionPrefix(trimmed)
          return cleanText ? `${newLetter}. ${cleanText}` : newLetter
        }
        return alt
      })
    }

    // Update explanationZh and likelyMisconceptionZh
    if (typeof answerItem.explanationZh === 'string') {
      answerItem.explanationZh = remapOptionLettersInText(answerItem.explanationZh, letterMap)
    }
    if (typeof answerItem.likelyMisconceptionZh === 'string') {
      answerItem.likelyMisconceptionZh = remapOptionLettersInText(answerItem.likelyMisconceptionZh, letterMap)
    }
  }

  return { question, answerItem }
}

/**
 * Deterministically balances MCQ answer positions across a package by rotating options
 * so that correct answers cycle through (A), (B), (C), (D) without long runs or position concentration.
 */
export function balanceCurriculumMcqPositions<T extends Record<string, any>>(input: T): T {
  const pkg = structuredClone(input) as Record<string, any>
  if (!pkg || typeof pkg !== 'object' || !Array.isArray(pkg.answers)) return input

  const answerMap = new Map<string, any>()
  for (const a of pkg.answers) {
    if (a && typeof a === 'object' && typeof a.questionId === 'string') {
      answerMap.set(a.questionId, a)
    }
  }

  const allQuestions: any[] = []
  if (pkg.studentLesson && typeof pkg.studentLesson === 'object') {
    if (Array.isArray(pkg.studentLesson.practice)) {
      for (const section of pkg.studentLesson.practice) {
        if (section && Array.isArray(section.questions)) {
          allQuestions.push(...section.questions)
        }
      }
    }
    if (pkg.studentLesson.homework && Array.isArray(pkg.studentLesson.homework.questions)) {
      allQuestions.push(...pkg.studentLesson.homework.questions)
    }
  }

  const mcqQuestions = allQuestions.filter(
    (q) => q && typeof q === 'object' && Array.isArray(q.options) && q.options.length === 4,
  )

  // Desired target cycle: A (0), B (1), C (2), D (3), A (0), B (1), ...
  mcqQuestions.forEach((q, idx) => {
    const ans = answerMap.get(q.id)
    const resolved = resolveQuestionAnswerLetter(q, ans)
    if (!resolved) return

    const targetIdx = idx % 4
    const currIdx = resolved.index
    if (currIdx === targetIdx) return

    // Construct permutation: we want old index `currIdx` to end up at `targetIdx`.
    // Permutation array `newOrder` where newOrder[targetIdx] = currIdx, and other indices filled.
    const newOrder = [0, 1, 2, 3]
    newOrder[targetIdx] = currIdx
    newOrder[currIdx] = targetIdx

    reorderQuestionOptions(q, newOrder, ans)
  })

  return pkg as T
}
