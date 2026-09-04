import { describe, expect, it } from 'vitest'
import { upgradeV23ToV24 } from './curriculum-package-schema.js'
import { validPackage } from './curriculum-package.test.js'
import { makeGroundedCurriculumPackage } from './fixtures/grounded-curriculum-packages.js'
import { upgradeV20ToV21 } from './upgrade-v20-to-v21.js'
import { upgradeV21ToV22 } from './upgrade-v21-to-v22.js'
import { validateCurriculumPackage } from './validate-curriculum-package.js'

function groundedV24Package(): any {
  const v21 = upgradeV20ToV21(validPackage())
  const v22 = upgradeV21ToV22(v21)
  delete (v22.studentLesson.reading as any).paragraphs
  return upgradeV23ToV24(makeGroundedCurriculumPackage(v22, 'technology'))
}

function reduceToStructurallyValidEightQuestionPackage(pkg: any): void {
  for (const section of pkg.studentLesson.practice) {
    section.questions = section.questions.slice(0, 1)
  }
  // Schema 2.4 requires at least three homework questions. Keep that real structural floor.
  pkg.studentLesson.homework.questions = pkg.studentLesson.homework.questions.slice(0, 3)

  const keptQuestionIds = new Set([
    ...pkg.studentLesson.practice.flatMap((section: any) => section.questions.map((question: any) => question.id)),
    ...pkg.studentLesson.homework.questions.map((question: any) => question.id),
  ])
  pkg.answers = pkg.answers.filter((answer: any) => keptQuestionIds.has(answer.questionId))
}

describe('Finisher deterministic validation boundary regressions', () => {
  it('does not hard-fail a structurally complete 60-minute package solely for having fewer than 12 answerable items', () => {
    const pkg = groundedV24Package()
    pkg.learningPlan.estimatedMinutes = 60
    reduceToStructurallyValidEightQuestionPackage(pkg)

    const answerableItems = [
      ...pkg.studentLesson.practice.flatMap((section: any) => section.questions),
      ...pkg.studentLesson.homework.questions,
    ]
    expect(answerableItems).toHaveLength(8)

    const result = validateCurriculumPackage(pkg)
    expect(result.success ? [] : result.issues).toEqual([])
  })

  it('does not hard-fail solely because the semantic Critic omitted the grounding-copyright bookkeeping label', () => {
    const pkg = groundedV24Package()
    pkg.qualityEvidence.criticalChecks = pkg.qualityEvidence.criticalChecks.filter(
      (check: any) => check.id !== 'grounding-copyright',
    )

    const result = validateCurriculumPackage(pkg)
    expect(result.success).toBe(true)
  })

  it('still hard-fails a question whose targetIds do not reference learningPlan.targets', () => {
    const pkg = groundedV24Package()
    const question = pkg.studentLesson.practice[0]!.questions[0]!
    question.targetIds = ['v-movement']

    const result = validateCurriculumPackage(pkg)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues).toContainEqual({
      path: `questions.${question.id}.targetIds`,
      message: 'Unknown learning target: v-movement',
    })
  })
})
