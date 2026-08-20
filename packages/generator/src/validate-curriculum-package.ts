import { ZodError } from 'zod'
import {
  CurriculumPackageSchema,
  CurriculumPackageV20Schema,
  CurriculumPackageV21Schema,
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

  const parsed = CurriculumPackageSchema.safeParse(normalized)
  if (!parsed.success) return { success: false, issues: schemaIssues(parsed.error) }
  const issues = relationshipIssues(parsed.data)
  return issues.length > 0 ? { success: false, issues } : { success: true, curriculumPackage: parsed.data }
}
