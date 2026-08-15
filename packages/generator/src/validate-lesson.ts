import { ZodError } from 'zod'
import { WeeklyLessonSchema, type WeeklyLesson } from './lesson-schema.js'
import { findForbiddenPersonalizationJargon } from './validate-curriculum-package.js'

export type LessonValidationIssue = {
  path: string
  message: string
}

export type LessonValidationResult =
  | { success: true; lesson: WeeklyLesson }
  | { success: false; issues: LessonValidationIssue[] }

function schemaIssues(error: ZodError): LessonValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

function relationshipIssues(lesson: WeeklyLesson): LessonValidationIssue[] {
  const issues: LessonValidationIssue[] = []
  const questionIds = [
    ...lesson.exercises.flatMap((group) => group.questions.map((question) => question.questionId)),
    ...lesson.homework.tasks.map((task) => task.questionId),
  ]
  const answerIds = lesson.answers.map((answer) => answer.questionId)

  for (const [label, ids, path] of [
    ['question', questionIds, 'exercises'],
    ['answer', answerIds, 'answers'],
  ] as const) {
    const seen = new Set<string>()
    for (const id of ids) {
      if (seen.has(id)) issues.push({ path, message: `Duplicate ${label} ID: ${id}` })
      seen.add(id)
    }
  }

  const questionSet = new Set(questionIds)
  const answerSet = new Set(answerIds)
  for (const id of questionSet) {
    if (!answerSet.has(id)) issues.push({ path: 'answers', message: `Missing answer for question ID: ${id}` })
  }
  for (const id of answerSet) {
    if (!questionSet.has(id)) issues.push({ path: 'answers', message: `Answer has no matching question ID: ${id}` })
  }

  if (lesson.personalization.personalizationZh) {
    for (const [index, reason] of lesson.personalization.personalizationZh.entries()) {
      const jargon = findForbiddenPersonalizationJargon(reason)
      if (jargon) {
        issues.push({
          path: `personalization.personalizationZh.${index}`,
          message: `Contains forbidden internal/curriculum-engine terminology ("${jargon}"). Must be written for a Taiwanese parent in plain Traditional Chinese without engine or debug jargon.`,
        })
      }
    }
  }

  return issues
}

export function validateWeeklyLesson(input: unknown): LessonValidationResult {
  const parsed = WeeklyLessonSchema.safeParse(input)
  if (!parsed.success) return { success: false, issues: schemaIssues(parsed.error) }
  const issues = relationshipIssues(parsed.data)
  return issues.length === 0 ? { success: true, lesson: parsed.data } : { success: false, issues }
}

export function parseWeeklyLesson(input: unknown): WeeklyLesson {
  const result = validateWeeklyLesson(input)
  if (result.success) return result.lesson
  throw new Error(`Invalid weekly lesson:\n${result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n')}`)
}
