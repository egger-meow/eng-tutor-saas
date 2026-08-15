import { auditCurriculumPackage, parseWeeklyLesson, validateCurriculumPackage, type CurriculumPackage, type WeeklyLesson } from '@paper-english/generator'
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
  [key: string]: unknown
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
  return context
}

function assertLessonMatchesContext(lesson: WeeklyLesson, context: GenerationContext): void {
  const metadata = lesson.metadata
  if (metadata.jobId !== context.job.id) throw new Error('lesson jobId does not match claimed job')
  if (metadata.childId !== context.job.childId) throw new Error('lesson childId does not match claimed job')
  if (metadata.ruleVersion !== context.job.ruleVersion) throw new Error('lesson ruleVersion does not match claimed job')
}

function buildSummary(lesson: WeeklyLesson): Record<string, unknown> {
  return {
    title: lesson.metadata.title,
    theme: lesson.reading.title,
    grammarTopic: lesson.grammar.topic,
    coreVocabulary: lesson.vocabulary.map((item) => item.word),
    focusAreas: lesson.personalization.focusAreas,
    learningAdjustmentSummary: lesson.personalization.rationale,
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
  return {
    title: pkg.metadata.title,
    theme: pkg.studentLesson.reading.title,
    curriculumVersion: pkg.metadata.curriculumVersion,
    targets: pkg.learningPlan.targets.map((target) => target.id),
    coreVocabulary: pkg.studentLesson.vocabulary.map((item) => item.word),
    feedbackApplied: pkg.qualityEvidence.feedbackApplied,
    improvementComparedToPrevious: pkg.qualityEvidence.improvementComparedToPrevious,
    trackingHypotheses: pkg.trackingDelta.hypothesesToVerify,
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
    const audit = auditCurriculumPackage(pkg)
    if (!audit.passed) {
      const findings = audit.findings.filter((finding) => finding.severity === 'critical')
      throw new CurriculumQualityError({
        failureType: 'QUALITY_REJECTED',
        findings: findings.map((finding) => ({ source: 'audit', dimension: finding.dimension, message: finding.message })),
      })
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
    const materialId = unwrap(await input.client.rpc('worker_complete_generation_job', {
      job_id: input.context.job.id,
      worker_id: input.workerId,
      student_pdf_path: paths.student,
      parent_answer_pdf_path: paths.parent,
      canonical_source: pkg,
      generation_summary: curriculumSummary(pkg),
      prompt_version: pkg.metadata.promptVersion,
      generator_version: pkg.metadata.curriculumVersion,
      model_name: pkg.metadata.model,
    }), 'complete curriculum generation job') as string
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
