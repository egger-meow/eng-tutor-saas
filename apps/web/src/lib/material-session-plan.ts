import type { StudentLesson } from '../types/student-material'

export interface SessionPlanStep {
  id: string
  label: string
  chapterId: string
  questionIds: string[]
  descriptionZh: string
  targetMinutes?: number
}

export interface MaterialSessionPlan {
  firstStep: string
  steps: SessionPlanStep[]
}

/**
 * Extracts stable question IDs from a list of questions.
 */
function extractQuestionIds(questions?: Array<{ id?: string; questionId?: string }>): string[] {
  if (!Array.isArray(questions)) return []
  return questions
    .map((q) => q.id || q.questionId)
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
}

/**
 * Builds a 3-stage recommended learning navigation plan from a student lesson projection.
 *
 * Requirements:
 * - Stage 1 (First 10 min): Read passage and try up to first 2 practice questions.
 * - Stage 2: Comprehension & remaining practice.
 * - Stage 3: Review & homework/self-check.
 * - Does NOT contain answers, scores, generation quotas, or mastery claims.
 * - Robust against missing sections or question sets.
 */
export function buildMaterialSessionPlan(lesson?: StudentLesson | null): MaterialSessionPlan {
  if (!lesson) {
    return {
      firstStep: '',
      steps: [],
    }
  }

  const hasReading = Boolean(lesson.reading && (lesson.reading.passage || (lesson.reading.blocks && lesson.reading.blocks.length > 0)))
  const hasOpening = Boolean(lesson.opening)
  const hasInstruction = Boolean(lesson.instruction && lesson.instruction.length > 0)
  const hasSelfCheck = Boolean(lesson.selfCheckZh && lesson.selfCheckZh.length > 0)
  const hasHomework = Boolean(lesson.homework && lesson.homework.questions && lesson.homework.questions.length > 0)

  // Extract practice questions in order across stages
  const practiceQuestions = (lesson.practice ?? []).flatMap((stage) => stage.questions ?? [])
  const practiceQuestionIds = extractQuestionIds(practiceQuestions)
  const homeworkQuestionIds = extractQuestionIds(lesson.homework?.questions)

  // If there are no practice questions, fallback to homework questions for first trial if any
  const allQuestionIds = practiceQuestionIds.length > 0 ? practiceQuestionIds : homeworkQuestionIds

  const firstPracticeQuestionIds = allQuestionIds.slice(0, 2)
  const remainingPracticeQuestionIds = practiceQuestionIds.length > 0
    ? practiceQuestionIds.slice(2)
    : allQuestionIds.slice(2)

  // 1. Stage 1: 先讀先試 (約 10 分鐘)
  const stage1ChapterId = hasReading ? 'reading' : hasOpening ? 'opening' : 'practice'
  let stage1Desc = '今天先安排約10分鐘。先讀這一段，再試前兩題；時間到了可以先停，之後繼續。'
  if (firstPracticeQuestionIds.length === 1) {
    stage1Desc = '今天先安排約10分鐘。先讀這一段，再試第1題；時間到了可以先停，之後繼續。'
  } else if (firstPracticeQuestionIds.length === 0) {
    stage1Desc = '今天先安排約10分鐘。先讀這一段，今天先不用做題；時間到了可以先停，之後繼續。'
  }

  const steps: SessionPlanStep[] = [
    {
      id: 'stage-1',
      label: '① 先讀先試 (約 10 分鐘)',
      chapterId: stage1ChapterId,
      questionIds: firstPracticeQuestionIds,
      descriptionZh: stage1Desc,
      targetMinutes: 10,
    },
  ]

  // 2. Stage 2: 理解與練習
  // Include Stage 2 if there is instruction or remaining practice questions
  if (hasInstruction || remainingPracticeQuestionIds.length > 0) {
    const stage2ChapterId = hasInstruction ? 'instruction' : 'practice'
    steps.push({
      id: 'stage-2',
      label: '② 理解與練習',
      chapterId: stage2ChapterId,
      questionIds: remainingPracticeQuestionIds,
      descriptionZh: remainingPracticeQuestionIds.length > 0
        ? `文法重點解析與接續 ${remainingPracticeQuestionIds.length} 題演練。`
        : '文法重點解析與自我理解。',
    })
  }

  // 3. Stage 3: 複習與作業
  // Include Stage 3 if there is homework or self-check
  if (hasHomework || hasSelfCheck) {
    const stage3ChapterId = hasHomework ? 'homework' : 'selfcheck'
    steps.push({
      id: 'stage-3',
      label: '③ 複習與作業',
      chapterId: stage3ChapterId,
      questionIds: homeworkQuestionIds,
      descriptionZh: hasHomework
        ? `課後自主複習與延遲提取作業（${homeworkQuestionIds.length} 題）。`
        : '本週自我學習檢核。',
    })
  }

  return {
    firstStep: steps[0]?.id ?? '',
    steps,
  }
}

/**
 * Checks if a session plan step has all its questions answered in the draft answers.
 * If the step has no questions (e.g. reading only), returns true.
 */
export function isStepCompleted(step: SessionPlanStep, answers?: Record<string, string> | null): boolean {
  if (step.questionIds.length === 0) return true
  if (!answers) return false
  return step.questionIds.every((id) => {
    const val = answers[id]
    return typeof val === 'string' && val.trim().length > 0
  })
}

/**
 * Returns the current active step (the first incomplete step, or the last step if all complete).
 */
export function getCurrentStep(plan: MaterialSessionPlan, answers?: Record<string, string> | null): SessionPlanStep | null {
  if (plan.steps.length === 0) return null
  const incomplete = plan.steps.find((step) => !isStepCompleted(step, answers))
  return incomplete ?? plan.steps[plan.steps.length - 1] ?? null
}
