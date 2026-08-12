import { ZodError } from 'zod'
import { CurriculumPackageSchema, type CurriculumPackage } from './curriculum-package-schema.js'
import type { LessonValidationIssue } from './validate-lesson.js'

export type CurriculumValidationResult = { success: true; curriculumPackage: CurriculumPackage } | { success: false; issues: LessonValidationIssue[] }

function countWords(paragraphs: string[]): number {
  return paragraphs.join(' ').trim().split(/\s+/u).filter(Boolean).length
}

function relationshipIssues(value: CurriculumPackage): LessonValidationIssue[] {
  const issues: LessonValidationIssue[] = []
  const targets = new Set(value.learningPlan.targets.map((target) => target.id))
  const questions = [...value.studentLesson.practice.flatMap((section) => section.questions), ...value.studentLesson.homework.questions]
  const questionIds = questions.map((question) => question.id)
  const answerIds = value.answers.map((answer) => answer.questionId)

  for (const [path, ids] of [['studentLesson.practice', questionIds], ['answers', answerIds]] as const) {
    const seen = new Set<string>()
    for (const id of ids) {
      if (seen.has(id)) issues.push({ path, message: `Duplicate question ID: ${id}` })
      seen.add(id)
    }
  }
  const questionSet = new Set(questionIds)
  const answerSet = new Set(answerIds)
  for (const id of questionSet) if (!answerSet.has(id)) issues.push({ path: 'answers', message: `Missing answer for question ID: ${id}` })
  for (const id of answerSet) if (!questionSet.has(id)) issues.push({ path: 'answers', message: `Answer has no matching question ID: ${id}` })
  for (const question of questions) {
    for (const targetId of question.targetIds) if (!targets.has(targetId)) issues.push({ path: `questions.${question.id}.targetIds`, message: `Unknown learning target: ${targetId}` })
    if (question.itemType === 'short-response' && question.writingLines === 0) issues.push({ path: `questions.${question.id}.writingLines`, message: 'Written responses require writing space' })
  }

  const actualWords = countWords(value.studentLesson.reading.paragraphs)
  if (Math.abs(actualWords - value.studentLesson.reading.wordCount) > 3) issues.push({ path: 'studentLesson.reading.wordCount', message: `Declared ${value.studentLesson.reading.wordCount} words but found ${actualWords}` })
  const stages = new Set(value.studentLesson.practice.map((section) => section.stage))
  for (const stage of ['guided', 'independent', 'cap-transfer', 'production'] as const) if (!stages.has(stage)) issues.push({ path: 'studentLesson.practice', message: `Missing required learning stage: ${stage}` })
  if (questions.length < 12) issues.push({ path: 'studentLesson.practice', message: 'A weekly package requires at least 12 answerable items' })
  const capSections = value.studentLesson.practice.filter((section) => section.stage === 'cap-transfer')
  if (!capSections.some((section) => section.questions.some((question) => question.options?.length === 4))) issues.push({ path: 'studentLesson.practice', message: 'CAP transfer requires at least one four-option item' })
  if (!value.qualityEvidence.criticalChecks.every((check) => check.passed)) issues.push({ path: 'qualityEvidence.criticalChecks', message: 'Every critical quality check must pass before publication' })
  if (value.qualityEvidence.criticFindings.some((finding) => finding.severity === 'critical' && !finding.resolution)) issues.push({ path: 'qualityEvidence.criticFindings', message: 'Unresolved critical critic finding' })
  return issues
}

function schemaIssues(error: ZodError): LessonValidationIssue[] {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
}

export function validateCurriculumPackage(input: unknown): CurriculumValidationResult {
  const parsed = CurriculumPackageSchema.safeParse(input)
  if (!parsed.success) return { success: false, issues: schemaIssues(parsed.error) }
  const issues = relationshipIssues(parsed.data)
  return issues.length > 0 ? { success: false, issues } : { success: true, curriculumPackage: parsed.data }
}
