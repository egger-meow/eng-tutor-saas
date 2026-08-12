import { parseWeeklyLesson, validateCurriculumPackage, type CurriculumPackage, type WeeklyLesson } from '@paper-english/generator'
import { renderCurriculumPackageBytes, renderLessonPdfBytes, type CurriculumPdfBytes, type LessonPdfBytes } from '@paper-english/pdf'

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

export type WorkerClient = {
  rpc(name: string, params: Record<string, unknown>): RpcResult
  storage: {
    from(bucket: string): {
      upload(path: string, body: Uint8Array, options: { contentType: string; upsert: boolean }): StorageResult
      remove(paths: string[]): StorageResult
    }
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

export async function loadGenerationContext(client: WorkerClient, jobId: string, workerId: string): Promise<GenerationContext> {
  const result = await client.rpc('worker_generation_context', { job_id: jobId, worker_id: workerId })
  return unwrap(result, 'load generation context') as GenerationContext
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
    trackingHypotheses: pkg.trackingDelta.hypothesesToVerify,
  }
}

export type CompleteCurriculumInput = {
  client: WorkerClient
  workerId: string
  context: GenerationContext
  curriculumPackage: unknown
  render?: (pkg: CurriculumPackage) => Promise<CurriculumPdfBytes>
}

export async function completeCurriculumJob(input: CompleteCurriculumInput): Promise<string> {
  const parsed = validateCurriculumPackage(input.curriculumPackage)
  if (!parsed.success) throw new Error(`Invalid curriculum package:\n${parsed.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n')}`)
  const pkg = parsed.curriculumPackage
  assertCurriculumMatchesContext(pkg, input.context)
  const paths = {
    student: `${input.context.job.childId}/${input.context.job.id}/student.pdf`,
    parent: `${input.context.job.childId}/${input.context.job.id}/parent-answer.pdf`,
  }
  const storage = input.client.storage.from(BUCKET)
  let completionStarted = false
  try {
    const pdfs = await (input.render ?? renderCurriculumPackageBytes)(pkg)
    await storage.remove([paths.student, paths.parent])
    unwrap(await storage.upload(paths.student, pdfs.student, { contentType: 'application/pdf', upsert: false }), 'upload student v2 PDF')
    unwrap(await storage.upload(paths.parent, pdfs.parentAnswer, { contentType: 'application/pdf', upsert: false }), 'upload parent v2 PDF')
    completionStarted = true
    return unwrap(await input.client.rpc('worker_complete_generation_job', {
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
  } catch (error) {
    if (!completionStarted) {
      await storage.remove([paths.student, paths.parent])
      const message = error instanceof Error ? error.message : 'Unknown curriculum generation failure'
      await input.client.rpc('worker_fail_generation_job', { job_id: input.context.job.id, worker_id: input.workerId, error_code: 'CURRICULUM_PIPELINE_FAILED', error_message: message.slice(0, 2000) })
    }
    throw error
  }
}
