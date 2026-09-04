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
  pkg.studentLesson.homework.questions = pkg.studentLesson.homework.questions.slice(0, 3)

  const keptQuestionIds = new Set([
    ...pkg.studentLesson.practice.flatMap((section: any) => section.questions.map((question: any) => question.id)),
    ...pkg.studentLesson.homework.questions.map((question: any) => question.id),
  ])
  pkg.answers = pkg.answers.filter((answer: any) => keptQuestionIds.has(answer.questionId))
}

function keepOnlyAnswersForExistingQuestions(pkg: any): void {
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

  it('does not hard-fail solely because a semantic criticalCheck is marked passed false', () => {
    const pkg = groundedV24Package()
    pkg.qualityEvidence.criticalChecks.push({
      id: 'critic-level-calibration-regression',
      passed: false,
      evidence: 'Semantic Critic wants a level adjustment; this is repair evidence, not structural integrity.',
    })

    const result = validateCurriculumPackage(pkg)
    expect(result.success).toBe(true)
  })

  it('does not require an exact grounding-freshness bookkeeping label for current grounding', () => {
    const pkg = groundedV24Package()
    pkg.grounding.temporalMode = 'current'
    for (const source of pkg.grounding.sources) {
      source.publishedAt = source.publishedAt ?? source.accessedAt
    }
    pkg.qualityEvidence.criticalChecks = pkg.qualityEvidence.criticalChecks.filter(
      (check: any) => check.id !== 'grounding-freshness',
    )

    const result = validateCurriculumPackage(pkg)
    expect(result.success).toBe(true)
  })

  it('still hard-fails an unresolved explicit critical Critic finding', () => {
    const pkg = groundedV24Package()
    pkg.qualityEvidence.criticFindings.push({
      dimension: 'answer-entailment',
      severity: 'critical',
      finding: 'The recorded correct answer is not entailed by the passage.',
      resolution: null,
    })

    const result = validateCurriculumPackage(pkg)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.issues).toContainEqual({
      path: 'qualityEvidence.criticFindings',
      message: 'Unresolved critical critic finding',
    })
  })

  it('does not use pedagogical item counts as structural schema gates in Schema 2.4', () => {
    const pkg = groundedV24Package()
    const onlyTarget = pkg.learningPlan.targets[0]!
    pkg.learningPlan.targets = [onlyTarget]
    pkg.studentLesson.opening.goalsZh = pkg.studentLesson.opening.goalsZh.slice(0, 1)
    pkg.studentLesson.selfCheckZh = pkg.studentLesson.selfCheckZh.slice(0, 1)
    for (const instruction of pkg.studentLesson.instruction) {
      instruction.workedExamples = instruction.workedExamples.slice(0, 1)
      instruction.commonMistakes = []
    }
    pkg.studentLesson.homework.questions = pkg.studentLesson.homework.questions.slice(0, 1)
    for (const section of pkg.studentLesson.practice) {
      for (const question of section.questions) question.targetIds = [onlyTarget.id]
    }
    for (const question of pkg.studentLesson.homework.questions) question.targetIds = [onlyTarget.id]
    keepOnlyAnswersForExistingQuestions(pkg)

    const result = validateCurriculumPackage(pkg)
    expect(result.success ? [] : result.issues).toEqual([])
  })

  it('does not structurally reject a short but non-empty primary reading solely for being under 120 words', () => {
    const pkg = groundedV24Package()
    const claim = pkg.grounding.claims[0]!
    const factIds = new Set(claim.factIds)
    const facts = pkg.grounding.facts.filter((fact: any) => factIds.has(fact.id))
    const sourceIds = new Set(facts.flatMap((fact: any) => fact.sourceIds))
    const sources = pkg.grounding.sources.filter((source: any) => sourceIds.has(source.id))

    pkg.studentLesson.reading.genre = 'article'
    pkg.studentLesson.reading.blocks = [{ type: 'paragraph', text: claim.text }]
    pkg.grounding.claims = [{ ...claim, location: 'studentLesson.reading.blocks.0.text' }]
    pkg.grounding.facts = facts
    pkg.grounding.sources = sources

    const result = validateCurriculumPackage(pkg)
    expect(result.success ? [] : result.issues).toEqual([])
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
