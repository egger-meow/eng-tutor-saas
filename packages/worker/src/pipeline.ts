import {
  auditCurriculumPackage,
  buildCapCoverageCapsule,
  buildDiversityCapsule,
  createEmptyStudentCurriculumStore,
  findForbiddenPersonalizationJargon,
  getGrammarUnit,
  parseWeeklyLesson,
  recordExposureFromTrackingDelta,
  validateCurriculumPackage,
  type CapCoverageCapsule,
  type CurriculumPackage,
  type DiversityCapsule,
  type HistoricalPackageSummary,
  type WeeklyLesson,
} from '@paper-english/generator'
import { inspectCurriculumPdfPair, renderCurriculumPackageBytes, renderLessonPdfBytes, type CurriculumPdfBytes, type CurriculumPdfPairInspection, type LessonPdfBytes } from '@paper-english/pdf'

const BUCKET = 'weekly-materials'

export type ClaimedJob = {
  id: string
  child_id: string
  material_week: string
  rule_version: string
  release_at: string
}

export type GenerationContext = {
  job: {
    id: string
    childId: string
    materialWeek: string
    ruleVersion: string
  }
  profile?: {
    weekly_minutes?: number | null
  }
  vocabularyCapsule?: {
    dueForReview: string[]
    weakRecent: string[]
    uncertain: string[]
    recentlyMastered: string[]
    historicalCount: number
  }
  grammarCapsule?: {
    dueForReview: string[]
    weakRecent: string[]
    uncertain: string[]
    recentlyMastered?: string[]
    historicalCount: number
  }
  communicationCapsule?: {
    dueForReview: string[]
    weakRecent: string[]
    recentlyMastered: string[]
    historicalCount: number
  }
  capCoverageCapsule?: CapCoverageCapsule | {
    dueReviewVocabulary: string[]
    dueReviewGrammar: string[]
    dueReviewCommunication: string[]
    recommendedVocabulary?: string[]
    recommendedGrammar?: string[]
    recommendedCommunicationFunctions?: string[]
    coverage: unknown
  }
  diversityCapsule?: DiversityCapsule
  recentHistory?: HistoricalPackageSummary[]
  [key: string]: unknown
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function progressionSet(capsule: Record<string, unknown> | undefined, keys: string[]): Set<string> {
  return new Set(keys.flatMap((key) => stringArray(capsule?.[key])))
}

function feedbackExplicitlyRequestsGrammarRepair(context: GenerationContext): boolean {
  const feedback = context.feedback
  if (!feedback || typeof feedback !== 'object') return false
  const text = JSON.stringify(feedback).toLocaleLowerCase()
  return /grammar|文法|repeat|again|review|複習|再練|重做|不熟|錯|弱/u.test(text)
}

/** Context-aware publish gate: package-only schema validation cannot detect week-over-week regressions. */
export function forwardProgressionIssues(pkg: CurriculumPackage, context: GenerationContext): CurriculumFailureEvidence['findings'] {
  const findings: CurriculumFailureEvidence['findings'] = []
  const vocabCapsule = context.vocabularyCapsule as Record<string, unknown> | undefined
  const knownVocabulary = progressionSet(vocabCapsule, ['dueForReview', 'weakRecent', 'uncertain', 'recentlyMastered'])
  const dueVocabulary = progressionSet(vocabCapsule, ['dueForReview', 'weakRecent'])
  const introduced = new Set(pkg.trackingDelta.introducedVocabularyIds)
  const reviewed = new Set(pkg.trackingDelta.reviewedVocabularyIds)
  const reviewCards = pkg.studentLesson.vocabulary.filter((item) => item.status === 'review' || item.status === 'repeated-miss')
  const newCards = pkg.studentLesson.vocabulary.filter((item) => item.status === 'new' || item.status === 'extension')

  if (reviewCards.length > 4) {
    findings.push({ source: 'validation', dimension: 'forward-progression', path: 'studentLesson.vocabulary', message: `Review vocabulary is capped at 4 cards; received ${reviewCards.length}.` })
  }
  if (newCards.length < 7) {
    findings.push({ source: 'validation', dimension: 'forward-progression', path: 'studentLesson.vocabulary', message: `The new-word quota requires at least 7 genuinely new cards; received ${newCards.length}.` })
  }
  for (const item of pkg.studentLesson.vocabulary) {
    const wasExposed = knownVocabulary.has(item.id)
    if (wasExposed && (item.status === 'new' || item.status === 'extension')) {
      findings.push({ source: 'validation', dimension: 'forward-progression', path: `studentLesson.vocabulary.${item.id}`, message: `Previously exposed vocabulary "${item.word}" cannot be labeled new or consume the new-word quota.` })
    }
    if ((item.status === 'new' || item.status === 'extension') && !introduced.has(item.id)) {
      findings.push({ source: 'validation', dimension: 'forward-progression', path: 'trackingDelta.introducedVocabularyIds', message: `New vocabulary card "${item.word}" is missing from introducedVocabularyIds.` })
    }
    if ((item.status === 'review' || item.status === 'repeated-miss') && !reviewed.has(item.id)) {
      findings.push({ source: 'validation', dimension: 'forward-progression', path: 'trackingDelta.reviewedVocabularyIds', message: `Review vocabulary card "${item.word}" is missing from reviewedVocabularyIds.` })
    }
    if ((item.status === 'review' || item.status === 'repeated-miss') && knownVocabulary.size > 0 && !dueVocabulary.has(item.id)) {
      findings.push({ source: 'validation', dimension: 'forward-progression', path: `studentLesson.vocabulary.${item.id}`, message: `Review vocabulary "${item.word}" is not due or supported by actual difficulty evidence.` })
    }
  }
  for (const id of introduced) {
    if (knownVocabulary.has(id)) {
      findings.push({ source: 'validation', dimension: 'forward-progression', path: 'trackingDelta.introducedVocabularyIds', message: `Previously exposed vocabulary ID "${id}" cannot consume the new-word quota.` })
    }
  }

  const grammarCapsule = context.grammarCapsule as Record<string, unknown> | undefined
  const knownGrammar = progressionSet(grammarCapsule, ['dueForReview', 'weakRecent', 'uncertain', 'recentlyMastered'])
  const weakGrammar = progressionSet(grammarCapsule, ['weakRecent'])
  const primaryGrammar = pkg.trackingDelta.exposedGrammarTargetIds[0]
  if (primaryGrammar && knownGrammar.has(primaryGrammar) && !weakGrammar.has(primaryGrammar) && !feedbackExplicitlyRequestsGrammarRepair(context)) {
    const recommended = stringArray((context.capCoverageCapsule as Record<string, unknown> | undefined)?.recommendedGrammar)
    const prerequisiteRepair = recommended.some((id) => getGrammarUnit(id)?.prerequisites.includes(primaryGrammar))
      && !progressionSet(grammarCapsule, ['recentlyMastered']).has(primaryGrammar)
    if (!prerequisiteRepair) {
      findings.push({ source: 'validation', dimension: 'forward-progression', path: 'trackingDelta.exposedGrammarTargetIds.0', message: `Previously exposed grammar "${primaryGrammar}" cannot be primary again without explicit feedback, actual failure evidence, or prerequisite repair.` })
    }
  }

  return findings
}

type RpcResult = Promise<{ data: unknown; error: { message: string } | null }>
type StorageResult = Promise<{ data: unknown; error: { message: string } | null }>
type StorageDownloadResult = Promise<{ data: Blob | null; error: { message: string } | null }>

export type WorkerClient = {
  rpc(name: string, params: Record<string, unknown>): RpcResult
  storage: {
    from(bucket: string): {
      upload(path: string, body: Uint8Array, options: { contentType: string; upsert: boolean }): StorageResult
      download(path: string): StorageDownloadResult
      remove(paths: string[]): StorageResult
    }
  }
}

async function downloadArtifact(
  storage: ReturnType<WorkerClient['storage']['from']>,
  path: string,
): Promise<Uint8Array | null> {
  const result = await storage.download(path)
  if (result.error || !result.data) return null
  return new Uint8Array(await result.data.arrayBuffer())
}

async function createOrRecoverArtifact(
  storage: ReturnType<WorkerClient['storage']['from']>,
  path: string,
  bytes: Uint8Array,
  label: string,
): Promise<{ bytes: Uint8Array; created: boolean }> {
  const uploaded = await storage.upload(path, bytes, { contentType: 'application/pdf', upsert: false })
  if (!uploaded.error) return { bytes, created: true }
  const existing = await downloadArtifact(storage, path)
  if (!existing) throw new Error(`${label}: ${uploaded.error.message}`)
  return { bytes: existing, created: false }
}

async function recordPipelineFailure(
  client: WorkerClient,
  workerId: string,
  jobId: string,
  errorCode: string,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  try {
    await failClaimedJob(client, workerId, jobId, errorCode, message)
  } catch (failureError) {
    const failureMessage = failureError instanceof Error ? failureError.message : String(failureError)
    console.warn(`Could not record pipeline failure for ${jobId}: ${failureMessage}`)
  }
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, operation: string): T {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`)
  if (result.data === null) throw new Error(`${operation}: empty response`)
  return result.data
}

export async function claimJobs(client: WorkerClient, workerId: string): Promise<ClaimedJob[]> {
  const result = await client.rpc('worker_claim_generation_jobs', { worker_id: workerId })
  return unwrap(result, 'claim jobs') as ClaimedJob[]
}

export async function failClaimedJob(
  client: WorkerClient,
  workerId: string,
  jobId: string,
  errorCode: string,
  errorMessage: string,
): Promise<void> {
  const failed = unwrap(await client.rpc('worker_fail_generation_job', {
    job_id: jobId,
    worker_id: workerId,
    p_error_code: errorCode.slice(0, 100),
    p_error_message: errorMessage.slice(0, 2000),
  }), 'fail generation job') as boolean
  if (!failed) throw new Error('generation job was not actively claimed by this worker')
}

export async function loadGenerationContext(client: WorkerClient, jobId: string, workerId: string): Promise<GenerationContext> {
  const result = await client.rpc('worker_generation_context', { job_id: jobId, worker_id: workerId })
  const mayBeCompleted = result.error?.message.includes('job is not actively claimed by this worker') ?? false
  const context = (mayBeCompleted
    ? unwrap(await client.rpc('worker_completed_generation_context', { job_id: jobId, worker_id: workerId }), 'load completed generation recovery context')
    : unwrap(result, 'load generation context')) as GenerationContext
  if (context.job.childId) {
    try {
      const trends = await client.rpc('worker_quality_trends', { child_id: context.job.childId })
      context.qualityTrends = unwrap(trends, 'load quality trends')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown quality trend error'
      console.warn(`Quality trends unavailable for ${context.job.childId}: ${message}`)
      context.qualityTrends = []
    }
  }

  // 1. Build Diversity Capsule from recent history
  if (Array.isArray(context.recentHistory)) {
    context.diversityCapsule = buildDiversityCapsule(context.recentHistory as HistoricalPackageSummary[], 4)
  } else if (!context.diversityCapsule) {
    context.diversityCapsule = {
      recentGenres: [],
      recentContextKeys: [],
      recentItemFamilies: [],
    }
  }

  // 2. Guarantee CAP Gap recommendations are populated in capCoverageCapsule
  if (!context.capCoverageCapsule || !(context.capCoverageCapsule as any).recommendedVocabulary) {
    const gradeStage = ((context.child as any)?.gradeStage ?? 'grade_7') as 'grade_7' | 'grade_8' | 'grade_9'
    const grade = (context.child as any)?.grade ?? 7
    const store = createEmptyStudentCurriculumStore(context.job.childId ?? 'anonymous', grade)

    if (context.vocabularyCapsule) {
      const vocabDue = (context.vocabularyCapsule as any).dueForReview ?? []
      const vocabWeak = (context.vocabularyCapsule as any).weakRecent ?? []
      const vocabUncertain = (context.vocabularyCapsule as any).uncertain ?? []
      const vocabMastered = (context.vocabularyCapsule as any).recentlyMastered ?? []
      recordExposureFromTrackingDelta(store, {
        introducedVocabularyIds: [...vocabDue, ...vocabWeak, ...vocabUncertain, ...vocabMastered],
        reviewedVocabularyIds: [],
        exposedGrammarTargetIds: [],
      })
    }
    if (context.grammarCapsule) {
      const grammarDue = (context.grammarCapsule as any).dueForReview ?? []
      const grammarWeak = (context.grammarCapsule as any).weakRecent ?? []
      const grammarUncertain = (context.grammarCapsule as any).uncertain ?? []
      const grammarMastered = (context.grammarCapsule as any).recentlyMastered ?? []
      recordExposureFromTrackingDelta(store, {
        introducedVocabularyIds: [],
        reviewedVocabularyIds: [],
        exposedGrammarTargetIds: [...grammarDue, ...grammarWeak, ...grammarUncertain, ...grammarMastered],
      })
    }
    if (context.communicationCapsule) {
      const commDue = (context.communicationCapsule as any).dueForReview ?? []
      const commWeak = (context.communicationCapsule as any).weakRecent ?? []
      const commUncertain = (context.communicationCapsule as any).uncertain ?? []
      const commMastered = (context.communicationCapsule as any).recentlyMastered ?? []
      recordExposureFromTrackingDelta(store, {
        introducedVocabularyIds: [],
        reviewedVocabularyIds: [],
        exposedGrammarTargetIds: [],
        exposedCommunicationFunctionIds: [...commDue, ...commWeak, ...commUncertain, ...commMastered],
      })
    }

    const calculatedCapsule = buildCapCoverageCapsule(store, { gradeStage })
    if (context.capCoverageCapsule && typeof context.capCoverageCapsule === 'object') {
      context.capCoverageCapsule = {
        ...calculatedCapsule,
        ...context.capCoverageCapsule,
        recommendedVocabulary: calculatedCapsule.recommendedVocabulary,
        recommendedGrammar: calculatedCapsule.recommendedGrammar,
        recommendedCommunicationFunctions: calculatedCapsule.recommendedCommunicationFunctions,
      }
    } else {
      context.capCoverageCapsule = calculatedCapsule
    }
  }

  return context
}

function assertLessonMatchesContext(lesson: WeeklyLesson, context: GenerationContext): void {
  const metadata = lesson.metadata
  if (metadata.jobId !== context.job.id) throw new Error('lesson jobId does not match claimed job')
  if (metadata.childId !== context.job.childId) throw new Error('lesson childId does not match claimed job')
  if (metadata.ruleVersion !== context.job.ruleVersion) throw new Error('lesson ruleVersion does not match claimed job')
}

function cleanPersonalizationReasons(reasons: unknown[]): string[] {
  return reasons
    .filter((r): r is string => typeof r === 'string' && Boolean(r.trim()))
    .map((r) => r.trim())
    .filter((r) => !findForbiddenPersonalizationJargon(r))
}

function buildSummary(lesson: WeeklyLesson): Record<string, unknown> {
  const canonicalReasons = Array.isArray(lesson.personalization.personalizationZh)
    ? cleanPersonalizationReasons(lesson.personalization.personalizationZh)
    : []

  let reasons = canonicalReasons
  if (reasons.length === 0) {
    if (lesson.metadata.weekNumber === 1) {
      reasons = [
        '這是第一週教材，先用適中的難度了解孩子目前的閱讀、字彙與文法程度，再依這週的學習情況調整之後的內容。',
      ]
    } else if (typeof lesson.personalization.rationale === 'string' && !findForbiddenPersonalizationJargon(lesson.personalization.rationale)) {
      const isEnglishRationale = /^[A-Za-z\s,.'"-]{20,}/.test(lesson.personalization.rationale) &&
        !/[\u4e00-\u9fa5]/.test(lesson.personalization.rationale)
      if (!isEnglishRationale) {
        reasons = [lesson.personalization.rationale.trim()]
      }
    }
  }

  return {
    title: lesson.metadata.title,
    theme: lesson.reading.title,
    grammarTopic: lesson.grammar.topic,
    coreVocabulary: lesson.vocabulary.map((item) => item.word),
    focusAreas: lesson.personalization.focusAreas,
    learningAdjustmentSummary: reasons.join('；') || null,
    personalizationReasons: reasons,
  }
}

export type CompleteInput = {
  client: WorkerClient
  workerId: string
  context: GenerationContext
  lesson: unknown
  promptVersion: string
  generatorVersion: string
  modelName: string
  render?: (lesson: WeeklyLesson) => Promise<LessonPdfBytes>
}

export async function completeJob(input: CompleteInput): Promise<string> {
  const lesson = parseWeeklyLesson(input.lesson)
  assertLessonMatchesContext(lesson, input.context)
  const paths = {
    student: `${input.context.job.childId}/${input.context.job.id}/student.pdf`,
    parent: `${input.context.job.childId}/${input.context.job.id}/parent-answer.pdf`,
  }
  const storage = input.client.storage.from(BUCKET)
  let databaseCompleted = false
  let completionStarted = false

  try {
    const pdfs = await (input.render ?? renderLessonPdfBytes)(lesson)
    await storage.remove([paths.student, paths.parent])
    unwrap(await storage.upload(paths.student, pdfs.student, { contentType: 'application/pdf', upsert: false }), 'upload student PDF')
    unwrap(await storage.upload(paths.parent, pdfs.parentAnswer, { contentType: 'application/pdf', upsert: false }), 'upload parent PDF')

    completionStarted = true
    const materialId = unwrap(await input.client.rpc('worker_complete_generation_job', {
      job_id: input.context.job.id,
      worker_id: input.workerId,
      student_pdf_path: paths.student,
      parent_answer_pdf_path: paths.parent,
      canonical_source: lesson,
      generation_summary: buildSummary(lesson),
      prompt_version: input.promptVersion,
      generator_version: input.generatorVersion,
      model_name: input.modelName,
    }), 'complete generation job') as string
    databaseCompleted = true
    return materialId
  } catch (error) {
    if (!databaseCompleted && !completionStarted) {
      await storage.remove([paths.student, paths.parent])
      const message = error instanceof Error ? error.message : 'Unknown generation failure'
      await input.client.rpc('worker_fail_generation_job', {
        job_id: input.context.job.id,
        worker_id: input.workerId,
        error_code: 'GENERATION_PIPELINE_FAILED',
        error_message: message.slice(0, 2000),
      })
    }
    throw error
  }
}

function assertCurriculumMatchesContext(pkg: CurriculumPackage, context: GenerationContext): void {
  if (pkg.metadata.jobId !== context.job.id) throw new Error('curriculum package jobId does not match claimed job')
  if (pkg.metadata.childId !== context.job.childId) throw new Error('curriculum package childId does not match claimed job')
  if (pkg.metadata.curriculumVersion.length === 0 || pkg.metadata.promptVersion.length === 0) throw new Error('curriculum package version metadata is required')
}

function curriculumSummary(pkg: CurriculumPackage): Record<string, unknown> {
  const canonicalReasons = Array.isArray(pkg.parentSummary?.personalizationZh)
    ? cleanPersonalizationReasons(pkg.parentSummary.personalizationZh)
    : []

  let finalReasons: string[] = []

  if (canonicalReasons.length > 0) {
    finalReasons = canonicalReasons
  } else {
    const fallback = [
      ...cleanPersonalizationReasons(pkg.qualityEvidence?.improvementComparedToPrevious ?? []),
      ...cleanPersonalizationReasons(pkg.qualityEvidence?.feedbackApplied ?? []),
    ]
    if (typeof pkg.learningPlan?.personalizationStrategy === 'string' && !findForbiddenPersonalizationJargon(pkg.learningPlan.personalizationStrategy)) {
      fallback.push(pkg.learningPlan.personalizationStrategy.trim())
    }
    finalReasons = Array.from(new Set(fallback.filter(Boolean)))
  }

  if (finalReasons.length === 0) {
    if (pkg.metadata.weekNumber === 1) {
      finalReasons = [
        '這是第一週教材，先用適中的難度了解孩子目前的閱讀、字彙與文法程度，再依這週的學習情況調整之後的內容。',
      ]
    } else {
      const focus = pkg.parentSummary?.focusZh || pkg.studentLesson.reading.title
      finalReasons = [
        `本週重點加強${focus}，透過生活化情境與循序練習幫助孩子掌握。`,
      ]
    }
  }

  return {
    title: pkg.metadata.title,
    theme: pkg.studentLesson.reading.title,
    curriculumVersion: pkg.metadata.curriculumVersion,
    targets: pkg.learningPlan.targets.map((target) => target.id),
    coreVocabulary: pkg.studentLesson.vocabulary.map((item) => item.word),
    feedbackApplied: pkg.qualityEvidence.feedbackApplied,
    improvementComparedToPrevious: pkg.qualityEvidence.improvementComparedToPrevious,
    trackingHypotheses: pkg.trackingDelta.hypothesesToVerify,
    personalizationStrategy: pkg.learningPlan.personalizationStrategy,
    learningAdjustmentSummary: finalReasons.join('；'),
    learningFocus: pkg.parentSummary?.focusZh ?? null,
    personalizationReasons: finalReasons,
  }
}

export type CompleteCurriculumInput = {
  client: WorkerClient
  workerId: string
  context: GenerationContext
  curriculumPackage: unknown
  render?: (pkg: CurriculumPackage) => Promise<CurriculumPdfBytes>
  inspect?: (pkg: CurriculumPackage, pair: CurriculumPdfBytes) => Promise<CurriculumPdfPairInspection>
  recordJobFailure?: boolean
  allowSoftQualityOverride?: boolean
  qualityOverride?: {
    authoringAttempt: number
    processorId: string
    reason: string
    rejectionEvidence: CurriculumFailureEvidence
    rejectionMessage: string
  }
}

export const SOFT_QUALITY_OVERRIDE_DIMENSIONS = new Set([
  'cognitive-load',
  'lexical-unit-mix',
  'evidence-plan',
])

export function isSoftQualityOverrideEligible(error: unknown): error is CurriculumQualityError {
  return error instanceof CurriculumQualityError
    && error.evidence.findings.length > 0
    && error.evidence.findings.every((finding) =>
      finding.source === 'audit' && SOFT_QUALITY_OVERRIDE_DIMENSIONS.has(finding.dimension),
    )
}

export type CurriculumFailureEvidence = {
  failureType: 'QUALITY_REJECTED'
  findings: Array<{ source: 'validation' | 'audit'; path?: string; dimension: string; message: string }>
}

export class CurriculumQualityError extends Error {
  readonly evidence: CurriculumFailureEvidence

  constructor(evidence: CurriculumFailureEvidence) {
    const label = evidence.findings.every((finding) => finding.source === 'validation')
      ? 'Invalid curriculum package'
      : 'Curriculum quality rejected'
    super(`${label}:\n${evidence.findings.map((finding) => `${finding.path ?? finding.dimension}: ${finding.message}`).join('\n')}`)
    this.name = 'CurriculumQualityError'
    this.evidence = evidence
  }
}

function assertMatchingPdfPair(
  expected: CurriculumPdfPairInspection,
  actual: CurriculumPdfPairInspection,
): void {
  if (expected.student.layoutFingerprint !== actual.student.layoutFingerprint) {
    throw new Error('existing Student artifact does not match the current canonical render')
  }
  if (expected.parentAnswer.layoutFingerprint !== actual.parentAnswer.layoutFingerprint) {
    throw new Error('existing Parent artifact does not match the current canonical render')
  }
}

export async function completeCurriculumJob(input: CompleteCurriculumInput): Promise<string> {
  const paths = {
    student: `${input.context.job.childId}/${input.context.job.id}/student.pdf`,
    parent: `${input.context.job.childId}/${input.context.job.id}/parent-answer.pdf`,
  }
  const storage = input.client.storage.from(BUCKET)
  const createdPaths: string[] = []
  let completionStarted = false
  try {
    const parsed = validateCurriculumPackage(input.curriculumPackage)
    if (!parsed.success) throw new CurriculumQualityError({
      failureType: 'QUALITY_REJECTED',
      findings: parsed.issues.map((issue) => ({
        source: 'validation', path: issue.path, dimension: 'deterministic-validation', message: issue.message,
      })),
    })
    const pkg = parsed.curriculumPackage
    assertCurriculumMatchesContext(pkg, input.context)
    const progressionFindings = forwardProgressionIssues(pkg, input.context)
    if (progressionFindings.length > 0) throw new CurriculumQualityError({
      failureType: 'QUALITY_REJECTED',
      findings: progressionFindings,
    })
    const audit = auditCurriculumPackage(pkg, { targetMinutes: input.context.profile?.weekly_minutes ?? undefined })
    if (!audit.passed) {
      const findings = audit.findings.filter((finding) => finding.severity === 'critical')
      const qualityError = new CurriculumQualityError({
        failureType: 'QUALITY_REJECTED',
        findings: findings.map((finding) => ({ source: 'audit', dimension: finding.dimension, message: finding.message })),
      })
      if (!input.allowSoftQualityOverride || !isSoftQualityOverrideEligible(qualityError)) throw qualityError
    }

    const inspect = input.inspect ?? inspectCurriculumPdfPair
    const rendered = await (input.render ?? renderCurriculumPackageBytes)(pkg)
    const expectedInspection = await inspect(pkg, rendered)
    let student = await downloadArtifact(storage, paths.student)
    let parentAnswer = await downloadArtifact(storage, paths.parent)
    if (!student) {
      const result = await createOrRecoverArtifact(storage, paths.student, rendered.student, 'upload student v2 PDF')
      student = result.bytes
      if (result.created) createdPaths.push(paths.student)
    }
    if (!parentAnswer) {
      const result = await createOrRecoverArtifact(storage, paths.parent, rendered.parentAnswer, 'upload parent v2 PDF')
      parentAnswer = result.bytes
      if (result.created) createdPaths.push(paths.parent)
    }
    const actualInspection = student === rendered.student && parentAnswer === rendered.parentAnswer
      ? expectedInspection
      : await inspect(pkg, { student, parentAnswer })
    assertMatchingPdfPair(expectedInspection, actualInspection)
    completionStarted = true
    const completionRpc = input.qualityOverride
      ? 'worker_complete_generation_job_with_quality_override'
      : 'worker_complete_generation_job'
    const completionArgs: Record<string, unknown> = {
      job_id: input.context.job.id,
      worker_id: input.workerId,
      student_pdf_path: paths.student,
      parent_answer_pdf_path: paths.parent,
      canonical_source: pkg,
      generation_summary: curriculumSummary(pkg),
      prompt_version: pkg.metadata.promptVersion,
      generator_version: pkg.metadata.curriculumVersion,
      model_name: pkg.metadata.model,
    }
    if (input.qualityOverride) {
      completionArgs.authoring_attempt = input.qualityOverride.authoringAttempt
      completionArgs.processor_id = input.qualityOverride.processorId
      completionArgs.override_reason = input.qualityOverride.reason
      completionArgs.rejection_evidence = input.qualityOverride.rejectionEvidence
      completionArgs.rejection_message = input.qualityOverride.rejectionMessage
    }
    const materialId = unwrap(await input.client.rpc(completionRpc, completionArgs), 'complete curriculum generation job') as string
    try {
      unwrap(await input.client.rpc('worker_record_curriculum_observations', { material_id: materialId, worker_id: input.workerId, canonical_source: pkg }), 'record curriculum observations')
    } catch (observationError) {
      const message = observationError instanceof Error ? observationError.message : 'Unknown observation error'
      console.warn(`Curriculum observations were not recorded for ${materialId}: ${message}`)
    }
    return materialId
  } catch (error) {
    if (!completionStarted) {
      if (createdPaths.length > 0) await storage.remove(createdPaths)
      if (input.recordJobFailure !== false) {
        const errorCode = error instanceof CurriculumQualityError ? 'QUALITY_REJECTED' : 'CURRICULUM_PIPELINE_FAILED'
        await recordPipelineFailure(input.client, input.workerId, input.context.job.id, errorCode, error)
      }
    }
    throw error
  }
}
