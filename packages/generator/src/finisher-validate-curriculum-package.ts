import { z, type ZodError } from 'zod'

import {
  CurriculumPackageV24Schema,
  type CurriculumPackage,
} from './curriculum-package-schema.js'
import {
  VALID_COMMUNICATION_FUNCTION_IDS,
  VALID_GRAMMAR_UNIT_IDS,
} from './curriculum-maps/student-curriculum-tracker.js'
import { normalizeCurriculumPackage } from './normalize-curriculum-package.js'
import {
  validateCurriculumPackage as validateCurriculumPackageStrict,
  type CurriculumValidationResult,
} from './validate-curriculum-package.js'
import type { LessonValidationIssue } from './validate-lesson.js'

const targetSchema = CurriculumPackageV24Schema.shape.learningPlan.shape.targets.element
const openingSchema = CurriculumPackageV24Schema.shape.studentLesson.shape.opening
const readingSchema = CurriculumPackageV24Schema.shape.studentLesson.shape.reading
const instructionSchema = CurriculumPackageV24Schema.shape.studentLesson.shape.instruction.element
const homeworkSchema = CurriculumPackageV24Schema.shape.studentLesson.shape.homework

/**
 * Finisher accepts the canonical 2.4 structure without turning pedagogical cardinality
 * preferences into publication blockers. Non-empty content stays structural; richer counts
 * remain Author/Critic guidance and telemetry.
 */
const FinisherCurriculumPackageV24Schema = CurriculumPackageV24Schema.extend({
  learningPlan: CurriculumPackageV24Schema.shape.learningPlan.extend({
    targets: z.array(targetSchema).min(1).max(10),
  }),
  studentLesson: CurriculumPackageV24Schema.shape.studentLesson.extend({
    opening: openingSchema.extend({
      goalsZh: z.array(openingSchema.shape.goalsZh.element).min(1).max(6),
    }),
    reading: readingSchema.extend({
      wordCount: z.number().int().min(1).max(900),
    }),
    instruction: z.array(instructionSchema.extend({
      workedExamples: z.array(instructionSchema.shape.workedExamples.element).min(1).max(8),
      commonMistakes: z.array(instructionSchema.shape.commonMistakes.element).max(6),
    })).min(1).max(4),
    selfCheckZh: z.array(CurriculumPackageV24Schema.shape.studentLesson.shape.selfCheckZh.element).min(1).max(8),
    homework: homeworkSchema.extend({
      questions: z.array(homeworkSchema.shape.questions.element).min(1).max(20),
    }),
  }),
})

function schemaIssues(error: ZodError): LessonValidationIssue[] {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
}

function objectiveRelationshipIssues(value: CurriculumPackage): LessonValidationIssue[] {
  const issues: LessonValidationIssue[] = []
  const targetIds = value.learningPlan.targets.map((target) => target.id)
  const targetSet = new Set(targetIds)
  const questions = [
    ...value.studentLesson.practice.flatMap((section) => section.questions),
    ...value.studentLesson.homework.questions,
  ]
  const questionIds = questions.map((question) => question.id)
  const answerIds = value.answers.map((answer) => answer.questionId)

  const duplicateIds = (ids: string[], path: string, label: string) => {
    const seen = new Set<string>()
    for (const id of ids) {
      if (seen.has(id)) issues.push({ path, message: `Duplicate ${label} ID: ${id}` })
      seen.add(id)
    }
  }

  duplicateIds(targetIds, 'learningPlan.targets', 'learning target')
  duplicateIds(questionIds, 'studentLesson.practice', 'question')
  duplicateIds(answerIds, 'answers', 'question')

  const questionSet = new Set(questionIds)
  const answerSet = new Set(answerIds)
  for (const id of questionSet) {
    if (!answerSet.has(id)) issues.push({ path: 'answers', message: `Missing answer for question ID: ${id}` })
  }
  for (const id of answerSet) {
    if (!questionSet.has(id)) issues.push({ path: 'answers', message: `Answer has no matching question ID: ${id}` })
  }

  for (const question of questions) {
    for (const targetId of question.targetIds) {
      if (!targetSet.has(targetId)) {
        issues.push({ path: `questions.${question.id}.targetIds`, message: `Unknown learning target: ${targetId}` })
      }
    }
  }

  const stages = new Set(value.studentLesson.practice.map((section) => section.stage))
  for (const stage of ['guided', 'independent', 'cap-transfer', 'production'] as const) {
    if (!stages.has(stage)) issues.push({ path: 'studentLesson.practice', message: `Missing required learning stage: ${stage}` })
  }

  if (value.qualityEvidence.criticFindings.some((finding) => finding.severity === 'critical' && !finding.resolution)) {
    issues.push({ path: 'qualityEvidence.criticFindings', message: 'Unresolved critical critic finding' })
  }

  issues.push(...groundingIntegrityIssues(value))

  for (const id of value.trackingDelta.exposedGrammarTargetIds) {
    if (!VALID_GRAMMAR_UNIT_IDS.has(id)) {
      issues.push({
        path: 'trackingDelta.exposedGrammarTargetIds',
        message: `Unknown canonical grammar target ID: "${id}". Must be one of the derived grammar progression units.`,
      })
    }
  }
  for (const id of value.trackingDelta.exposedCommunicationFunctionIds) {
    if (!VALID_COMMUNICATION_FUNCTION_IDS.has(id)) {
      issues.push({
        path: 'trackingDelta.exposedCommunicationFunctionIds',
        message: `Unknown canonical communication function ID: "${id}". Must be an official communication function ID.`,
      })
    }
  }

  return issues
}

const GROUNDED_READING_LOCATION = /^studentLesson\.reading\.blocks\.(\d+)\.(text|heading|timeOrStep|event|detail)$/u

function groundingIntegrityIssues(value: CurriculumPackage): LessonValidationIssue[] {
  if (!('grounding' in value)) return []

  const issues: LessonValidationIssue[] = []
  const sourceIds = new Set<string>()
  const factIds = new Set<string>()
  const claimIds = new Set<string>()
  const referencedSourceIds = new Set<string>()
  const referencedFactIds = new Set<string>()
  const normalizedFactTexts = new Set<string>()
  const claimBindings = new Set<string>()
  const researchedAt = Date.parse(value.grounding.researchedAt)

  for (const source of value.grounding.sources) {
    if (sourceIds.has(source.id)) issues.push({ path: 'grounding.sources', message: `Duplicate grounding source ID: ${source.id}` })
    sourceIds.add(source.id)

    const accessedAt = Date.parse(source.accessedAt)
    const publishedAt = source.publishedAt ? Date.parse(source.publishedAt) : undefined
    if (accessedAt > researchedAt) {
      issues.push({ path: `grounding.sources.${source.id}.accessedAt`, message: 'Grounding source accessedAt must not be later than researchedAt' })
    }
    if (publishedAt !== undefined && publishedAt > accessedAt) {
      issues.push({ path: `grounding.sources.${source.id}.publishedAt`, message: 'Grounding source publishedAt must not be later than accessedAt' })
    }
    if (publishedAt !== undefined && publishedAt > researchedAt) {
      issues.push({ path: `grounding.sources.${source.id}.publishedAt`, message: 'Grounding source publishedAt must not be later than researchedAt' })
    }
    if (value.grounding.temporalMode === 'current' && !source.publishedAt) {
      issues.push({ path: `grounding.sources.${source.id}.publishedAt`, message: 'Current grounding requires publishedAt for every source' })
    }
  }

  for (const fact of value.grounding.facts) {
    if (factIds.has(fact.id)) issues.push({ path: 'grounding.facts', message: `Duplicate grounding fact ID: ${fact.id}` })
    factIds.add(fact.id)

    const normalizedFactText = fact.text.trim().replace(/\s+/gu, ' ').toLocaleLowerCase()
    if (normalizedFactTexts.has(normalizedFactText)) issues.push({ path: 'grounding.facts', message: `Duplicate grounding fact proposition: ${fact.id}` })
    normalizedFactTexts.add(normalizedFactText)

    if (new Set(fact.sourceIds).size !== fact.sourceIds.length) {
      issues.push({ path: `grounding.facts.${fact.id}.sourceIds`, message: 'Grounding sourceIds must be unique within a fact' })
    }
    for (const sourceId of fact.sourceIds) {
      referencedSourceIds.add(sourceId)
      if (!sourceIds.has(sourceId)) issues.push({ path: `grounding.facts.${fact.id}.sourceIds`, message: `Unknown grounding source ID: ${sourceId}` })
    }
  }

  for (const claim of value.grounding.claims) {
    if (claimIds.has(claim.id)) issues.push({ path: 'grounding.claims', message: `Duplicate grounding claim ID: ${claim.id}` })
    claimIds.add(claim.id)

    if (new Set(claim.factIds).size !== claim.factIds.length) {
      issues.push({ path: `grounding.claims.${claim.id}.factIds`, message: 'Grounding factIds must be unique within a claim' })
    }
    for (const factId of claim.factIds) {
      referencedFactIds.add(factId)
      if (!factIds.has(factId)) issues.push({ path: `grounding.claims.${claim.id}.factIds`, message: `Unknown grounding fact ID: ${factId}` })
    }

    const normalizedClaimText = claim.text.trim().replace(/\s+/gu, ' ').toLocaleLowerCase()
    const claimBinding = `${claim.location}\u0000${normalizedClaimText}`
    if (claimBindings.has(claimBinding)) issues.push({ path: 'grounding.claims', message: `Duplicate grounding claim binding: ${claim.id}` })
    claimBindings.add(claimBinding)

    const match = GROUNDED_READING_LOCATION.exec(claim.location)
    if (!match) {
      issues.push({ path: `grounding.claims.${claim.id}.location`, message: 'Claim location must resolve to an authored studentLesson.reading.blocks field' })
      continue
    }

    const blockIndex = Number(match[1])
    const field = match[2]!
    const block = value.studentLesson.reading.blocks[blockIndex] as unknown as Record<string, unknown> | undefined
    const authoredProse = block?.[field]
    if (typeof authoredProse !== 'string') {
      issues.push({ path: `grounding.claims.${claim.id}.location`, message: `Claim location does not resolve to a canonical string field: ${claim.location}` })
    } else if (!authoredProse.includes(claim.text)) {
      issues.push({ path: `grounding.claims.${claim.id}.text`, message: 'Claim text must occur exactly in the canonical field identified by location' })
    }
  }

  for (const sourceId of sourceIds) {
    if (!referencedSourceIds.has(sourceId)) issues.push({ path: 'grounding.sources', message: `Unused grounding source ID: ${sourceId}` })
  }
  for (const factId of factIds) {
    if (!referencedFactIds.has(factId)) issues.push({ path: 'grounding.facts', message: `Unclaimed grounding fact ID: ${factId}` })
  }

  return issues
}

/**
 * Production Finisher validation boundary.
 *
 * Legacy packages retain their historical strict validator. Newly authored Schema 2.4
 * packages use objective integrity validation with pedagogical cardinalities relaxed.
 */
export function validateCurriculumPackageForFinisher(input: unknown): CurriculumValidationResult {
  const normalized = normalizeCurriculumPackage(input)
  const version = normalized && typeof normalized === 'object' && !Array.isArray(normalized)
    ? (normalized as Record<string, any>).metadata?.schemaVersion
    : undefined

  if (version !== '2.4.0') return validateCurriculumPackageStrict(normalized)

  const parsed = FinisherCurriculumPackageV24Schema.safeParse(normalized)
  if (!parsed.success) return { success: false, issues: schemaIssues(parsed.error) }

  const curriculumPackage = parsed.data as CurriculumPackage
  const issues = objectiveRelationshipIssues(curriculumPackage)
  return issues.length > 0
    ? { success: false, issues }
    : { success: true, curriculumPackage }
}
