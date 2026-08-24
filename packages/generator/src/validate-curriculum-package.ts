import { ZodError } from 'zod'
import {
  CurriculumPackageSchema,
  CurriculumPackageV20Schema,
  CurriculumPackageV21Schema,
  CurriculumPackageV22Schema,
  type CurriculumPackage,
} from './curriculum-package-schema.js'
import {
  VALID_GRAMMAR_UNIT_IDS,
  VALID_COMMUNICATION_FUNCTION_IDS,
} from './curriculum-maps/student-curriculum-tracker.js'
import { normalizeCurriculumPackage } from './normalize-curriculum-package.js'
import { upgradeV20ToV21 } from './upgrade-v20-to-v21.js'
import { upgradeV21ToV22 } from './upgrade-v21-to-v22.js'
import type { LessonValidationIssue } from './validate-lesson.js'

export type CurriculumValidationResult =
  | { success: true; curriculumPackage: CurriculumPackage }
  | { success: false; issues: LessonValidationIssue[] }

export const FORBIDDEN_PERSONALIZATION_JARGON_PATTERNS = [
  // Implementation / field names & schema internals
  /\bfeedbackMissing\b/i,
  /\bruleVersion\b/i,
  /\bschemaVersion\b/i,
  /\bpromptVersion\b/i,
  /\bcurriculumVersion\b/i,
  /\binputFingerprint\b/i,
  /\btrackingDelta\b/i,
  /\b[a-zA-Z_]+=(?:true|false|\d+)\b/,

  // Progress distillation & evidence categories
  /\bweakRecent\b/i,
  /\bdueReview\b/i,
  /\brecentlyMastered\b/i,
  /\bfailure evidence\b/i,
  /\bmissCount\b/i,
  /\bmiss_count\b/i,
  /\bmasteryScore\b/i,
  /\bmastery_score\b/i,
  /\bassessedCount\b/i,
  /\bexposureCount\b/i,
  /失敗證據/i,
  /評量失敗/i,
  /未通過證據/i,
  /錯誤證據/i,

  // Progression & engine mechanics
  /\bprogression mechanics\b/i,
  /\bforward progression\b/i,
  /\bprogression queue\b/i,
  /推進機制/i,
  /進度機制/i,
  /遞進機制/i,
  /演算法推進/i,
  /預設推進/i,

  // English curriculum-engine terminology & raw acronyms
  /\bproduction packet\b/i,
  /\bguided\b/i,
  /\bindependent\b/i,
  /\bcap-transfer\b/i,
  /\bcap transfer\b/i,
  /\bCAP\b/,
  /\bretrieval\b/i,
  /\bproduction\b/i,
  /\bscaffolding\b/i,
  /\bbaseline\b/i,
  /\bpacket\b/i,
  /\btoken\b/i,
  /\bcapsule\b/i,

  // Specification / rule versioning terminology
  /feedback-missing/i,
  /fallback rule/i,
  /rule version/i,
  /規格規則/i,
  /新版規則/i,
  /舊版規則/i,
  /新規則/i,
  /舊規則/i,
  /規則版本/i,
  /引擎版本/i,
  /新版引擎/i,

  // Measurement / debug language
  /observable baseline/i,
  /instrumentation/i,
  /evidence pipeline/i,
  /可量測基準/i,
  /可觀察基線/i,
  /量測基準/i,
  /觀察基線/i,
  /提示前後證據/i,
  /留下提示前後證據/i,
  /可觀察證據/i,

  // Scheduler / generator logic statements
  /\bscheduler\b/i,
  /\bgenerator\b/i,
  /\bworker\b/i,
  /排程器/i,
  /產生器/i,
  /生成管線/i,
  /佇列/i,

  // Silence-mastery tropes / AI meta reasoning
  /silence is not mastery/i,
  /不把\s*silence\s*當\s*mastery/i,
  /沒有把沉默視為掌握/i,
  /不把沉默當作掌握/i,
  /不把沉默當成掌握/i,
  /不把沉默視為掌握/i,
  /不把沉默當作學會/i,
  /沒有把沉默當作掌握/i,
]

export function findForbiddenPersonalizationJargon(text: string): string | null {
  for (const pattern of FORBIDDEN_PERSONALIZATION_JARGON_PATTERNS) {
    const match = text.match(pattern)
    if (match) return match[0]
  }
  return null
}

function relationshipIssues(value: CurriculumPackage): LessonValidationIssue[] {
  const issues: LessonValidationIssue[] = []
  const targets = new Set(value.learningPlan.targets.map((target) => target.id))
  const questions = [
    ...value.studentLesson.practice.flatMap((section) => section.questions),
    ...value.studentLesson.homework.questions,
  ]
  const questionIds = questions.map((question) => question.id)
  const answerIds = value.answers.map((answer) => answer.questionId)

  for (const [path, ids] of [
    ['studentLesson.practice', questionIds],
    ['answers', answerIds],
  ] as const) {
    const seen = new Set<string>()
    for (const id of ids) {
      if (seen.has(id)) issues.push({ path, message: `Duplicate question ID: ${id}` })
      seen.add(id)
    }
  }
  const questionSet = new Set(questionIds)
  const answerSet = new Set(answerIds)
  for (const id of questionSet)
    if (!answerSet.has(id)) issues.push({ path: 'answers', message: `Missing answer for question ID: ${id}` })
  for (const id of answerSet)
    if (!questionSet.has(id)) issues.push({ path: 'answers', message: `Answer has no matching question ID: ${id}` })
  for (const question of questions) {
    for (const targetId of question.targetIds)
      if (!targets.has(targetId))
        issues.push({ path: `questions.${question.id}.targetIds`, message: `Unknown learning target: ${targetId}` })
    if (question.itemType === 'short-response' && question.writingLines === 0)
      issues.push({ path: `questions.${question.id}.writingLines`, message: 'Written responses require writing space' })
  }

  const stages = new Set(value.studentLesson.practice.map((section) => section.stage))
  for (const stage of ['guided', 'independent', 'cap-transfer', 'production'] as const)
    if (!stages.has(stage))
      issues.push({ path: 'studentLesson.practice', message: `Missing required learning stage: ${stage}` })
  if (questions.length < 12)
    issues.push({ path: 'studentLesson.practice', message: 'A weekly package requires at least 12 answerable items' })
  const capSections = value.studentLesson.practice.filter((section) => section.stage === 'cap-transfer')
  if (!capSections.some((section) => section.questions.some((question) => question.options?.length === 4)))
    issues.push({ path: 'studentLesson.practice', message: 'CAP transfer requires at least one four-option item' })
  if (!value.qualityEvidence.criticalChecks.every((check) => check.passed))
    issues.push({
      path: 'qualityEvidence.criticalChecks',
      message: 'Every critical quality check must pass before publication',
    })
  if (value.qualityEvidence.criticFindings.some((finding) => finding.severity === 'critical' && !finding.resolution))
    issues.push({ path: 'qualityEvidence.criticFindings', message: 'Unresolved critical critic finding' })

  if ('grounding' in value) {
    issues.push(...groundingRelationshipIssues(value))
  }

  // Validate trackingDelta canonical IDs fail-closed
  if (value.trackingDelta) {
    if (Array.isArray(value.trackingDelta.exposedGrammarTargetIds)) {
      for (const id of value.trackingDelta.exposedGrammarTargetIds) {
        if (!VALID_GRAMMAR_UNIT_IDS.has(id)) {
          issues.push({
            path: 'trackingDelta.exposedGrammarTargetIds',
            message: `Unknown canonical grammar target ID: "${id}". Must be one of the 25 derived grammar progression units.`,
          })
        }
      }
    }
    if (Array.isArray(value.trackingDelta.exposedCommunicationFunctionIds)) {
      for (const id of value.trackingDelta.exposedCommunicationFunctionIds) {
        if (!VALID_COMMUNICATION_FUNCTION_IDS.has(id)) {
          issues.push({
            path: 'trackingDelta.exposedCommunicationFunctionIds',
            message: `Unknown canonical communication function ID: "${id}". Must be one of the 16 official communication function IDs.`,
          })
        }
      }
    }
  }

  return issues
}

const GROUNDED_READING_LOCATION = /^studentLesson\.reading\.blocks\.(\d+)\.(text|heading|timeOrStep|event|detail)$/u

function groundingRelationshipIssues(
  value: Extract<CurriculumPackage, { metadata: { schemaVersion: '2.3.0' } }>,
): LessonValidationIssue[] {
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
    if (sourceIds.has(source.id)) {
      issues.push({ path: 'grounding.sources', message: `Duplicate grounding source ID: ${source.id}` })
    }
    sourceIds.add(source.id)
    const accessedAt = Date.parse(source.accessedAt)
    const publishedAt = source.publishedAt ? Date.parse(source.publishedAt) : undefined
    if (accessedAt > researchedAt) {
      issues.push({
        path: `grounding.sources.${source.id}.accessedAt`,
        message: 'Grounding source accessedAt must not be later than researchedAt',
      })
    }
    if (publishedAt !== undefined && publishedAt > accessedAt) {
      issues.push({
        path: `grounding.sources.${source.id}.publishedAt`,
        message: 'Grounding source publishedAt must not be later than accessedAt',
      })
    }
    if (publishedAt !== undefined && publishedAt > researchedAt) {
      issues.push({
        path: `grounding.sources.${source.id}.publishedAt`,
        message: 'Grounding source publishedAt must not be later than researchedAt',
      })
    }
    if (value.grounding.temporalMode === 'current' && !source.publishedAt) {
      issues.push({
        path: `grounding.sources.${source.id}.publishedAt`,
        message: 'Current grounding requires publishedAt for every source',
      })
    }
  }

  for (const fact of value.grounding.facts) {
    if (factIds.has(fact.id)) {
      issues.push({ path: 'grounding.facts', message: `Duplicate grounding fact ID: ${fact.id}` })
    }
    factIds.add(fact.id)
    const normalizedFactText = fact.text.trim().replace(/\s+/gu, ' ').toLocaleLowerCase()
    if (normalizedFactTexts.has(normalizedFactText)) {
      issues.push({ path: 'grounding.facts', message: `Duplicate grounding fact proposition: ${fact.id}` })
    }
    normalizedFactTexts.add(normalizedFactText)
    if (new Set(fact.sourceIds).size !== fact.sourceIds.length) {
      issues.push({ path: `grounding.facts.${fact.id}.sourceIds`, message: 'Grounding sourceIds must be unique within a fact' })
    }
    for (const sourceId of fact.sourceIds) {
      referencedSourceIds.add(sourceId)
      if (!sourceIds.has(sourceId)) {
        issues.push({
          path: `grounding.facts.${fact.id}.sourceIds`,
          message: `Unknown grounding source ID: ${sourceId}`,
        })
      }
    }
  }

  for (const claim of value.grounding.claims) {
    if (claimIds.has(claim.id)) {
      issues.push({ path: 'grounding.claims', message: `Duplicate grounding claim ID: ${claim.id}` })
    }
    claimIds.add(claim.id)
    if (new Set(claim.factIds).size !== claim.factIds.length) {
      issues.push({ path: `grounding.claims.${claim.id}.factIds`, message: 'Grounding factIds must be unique within a claim' })
    }
    const claimTokens = claim.text.match(/[\p{L}\p{N}]+/gu) ?? []
    if (claim.text.length < 20 || claimTokens.length < 4) {
      issues.push({
        path: `grounding.claims.${claim.id}.text`,
        message: 'Grounding claim text must be a non-trivial authored proposition (at least 20 characters and four word tokens)',
      })
    }
    const normalizedClaimText = claim.text.trim().replace(/\s+/gu, ' ').toLocaleLowerCase()
    const claimBinding = `${claim.location}\u0000${normalizedClaimText}`
    if (claimBindings.has(claimBinding)) {
      issues.push({ path: 'grounding.claims', message: `Duplicate grounding claim binding: ${claim.id}` })
    }
    claimBindings.add(claimBinding)
    for (const factId of claim.factIds) {
      referencedFactIds.add(factId)
      if (!factIds.has(factId)) {
        issues.push({
          path: `grounding.claims.${claim.id}.factIds`,
          message: `Unknown grounding fact ID: ${factId}`,
        })
      }
    }

    const match = GROUNDED_READING_LOCATION.exec(claim.location)
    if (!match) {
      issues.push({
        path: `grounding.claims.${claim.id}.location`,
        message: 'Claim location must resolve to an authored studentLesson.reading.blocks field',
      })
      continue
    }

    const blockIndex = Number(match[1])
    const field = match[2]!
    const block = value.studentLesson.reading.blocks[blockIndex] as unknown as Record<string, unknown> | undefined
    const authoredProse = block?.[field]
    if (typeof authoredProse !== 'string') {
      issues.push({
        path: `grounding.claims.${claim.id}.location`,
        message: `Claim location does not resolve to a canonical string field: ${claim.location}`,
      })
    } else if (!authoredProse.includes(claim.text)) {
      issues.push({
        path: `grounding.claims.${claim.id}.text`,
        message: 'Claim text must occur exactly in the canonical field identified by location',
      })
    }
  }

  for (const sourceId of sourceIds) {
    if (!referencedSourceIds.has(sourceId)) {
      issues.push({ path: 'grounding.sources', message: `Unused grounding source ID: ${sourceId}` })
    }
  }
  for (const factId of factIds) {
    if (!referencedFactIds.has(factId)) {
      issues.push({ path: 'grounding.facts', message: `Unclaimed grounding fact ID: ${factId}` })
    }
  }

  const passedCriticalChecks = new Set(
    value.qualityEvidence.criticalChecks
      .filter((check) => check.passed)
      .map((check) => check.id),
  )
  for (const checkId of ['grounding-accuracy', 'grounding-copyright']) {
    if (!passedCriticalChecks.has(checkId)) {
      issues.push({
        path: 'qualityEvidence.criticalChecks',
        message: `Missing required passed grounding critical check: ${checkId}`,
      })
    }
  }
  if (value.grounding.temporalMode === 'current' && !passedCriticalChecks.has('grounding-freshness')) {
    issues.push({
      path: 'qualityEvidence.criticalChecks',
      message: 'Current grounding requires a passed grounding-freshness critical check',
    })
  }

  return issues
}

function schemaIssues(error: ZodError): LessonValidationIssue[] {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
}

export function validateCurriculumPackage(input: unknown): CurriculumValidationResult {
  let normalized = normalizeCurriculumPackage(input)

  if (normalized && typeof normalized === 'object' && !Array.isArray(normalized)) {
    const raw = normalized as Record<string, any>
    if (
      raw.metadata?.schemaVersion === '2.0.0' ||
      (raw.studentLesson?.reading &&
        Array.isArray(raw.studentLesson.reading.paragraphs) &&
        !raw.studentLesson.reading.blocks)
    ) {
      const parsedV20 = CurriculumPackageV20Schema.safeParse(normalized)
      if (parsedV20.success) {
        const v21 = upgradeV20ToV21(parsedV20.data)
        normalized = normalizeCurriculumPackage(upgradeV21ToV22(v21))
      }
    } else if (
      raw.metadata?.schemaVersion === '2.1.0' ||
      (raw.trackingDelta && raw.trackingDelta.grammarTargets && !raw.trackingDelta.exposedGrammarTargetIds)
    ) {
      const parsedV21 = CurriculumPackageV21Schema.safeParse(normalized)
      if (parsedV21.success) {
        normalized = normalizeCurriculumPackage(upgradeV21ToV22(parsedV21.data))
      }
    }
  }

  const normalizedVersion = normalized && typeof normalized === 'object' && !Array.isArray(normalized)
    ? (normalized as Record<string, any>).metadata?.schemaVersion
    : undefined
  const parsed = normalizedVersion === '2.2.0'
    ? CurriculumPackageV22Schema.safeParse(normalized)
    : CurriculumPackageSchema.safeParse(normalized)
  if (!parsed.success) return { success: false, issues: schemaIssues(parsed.error) }
  const issues = relationshipIssues(parsed.data)
  return issues.length > 0 ? { success: false, issues } : { success: true, curriculumPackage: parsed.data }
}
