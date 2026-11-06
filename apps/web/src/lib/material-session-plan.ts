import type { Question, StudentLesson } from '../types/student-material'

export interface SessionPlanStep {
  id: string
  label: string
  chapterId: string
  questionIds: string[]
  answerKeys?: string[]
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

  const questions = [...practiceQuestions, ...(lesson.homework?.questions ?? [])]
  const answerKeysFor = (question: Question): string[] => {
    if (question.options?.length) return extractQuestionIds([question])
    const layout = question.responseLayout
    const units = layout?.type === 'table' || layout?.type === 'organizer'
      ? layout.rows.flatMap(row => (row.cells ?? []).flatMap(cell => cell.responseUnitId ? [cell.responseUnitId] : []))
      : layout?.type === 'sequence'
        ? layout.items.flatMap(item => item.responseUnitId ? [item.responseUnitId] : [])
        : []
    return units.length ? units : extractQuestionIds([question])
  }
  for (const step of steps) {
    step.answerKeys = step.questionIds.flatMap(id => {
      const question = questions.find(q => (q.id || q.questionId) === id)
      return question ? answerKeysFor(question) : [id]
    })
  }

  return {
    firstStep: steps[0]?.id ?? '',
    steps,
  }
}

/**
 * Checks if a session plan step has all its questions answered in the draft answers.
 * Reading-only steps have no tracked completion evidence.
 */
export function isStepCompleted(step: SessionPlanStep, answers?: Record<string, string> | null): boolean {
  if (step.questionIds.length === 0) return false
  if (!answers) return false
  return (step.answerKeys ?? step.questionIds).every((id) => {
    const val = answers[id]
    return typeof val === 'string' && val.trim().length > 0
  })
}

/**
 * Prefer unanswered practice on return; untracked reading remains available for review.
 */
export function getCurrentStep(plan: MaterialSessionPlan, answers?: Record<string, string> | null): SessionPlanStep | null {
  if (plan.steps.length === 0) return null
  const hasAnswers = Object.values(answers ?? {}).some(value => value.trim().length > 0)
  if (!hasAnswers) return plan.steps[0]
  const incomplete = plan.steps.find((step) => step.questionIds.length > 0 && !isStepCompleted(step, answers))
  return incomplete ?? null
}
