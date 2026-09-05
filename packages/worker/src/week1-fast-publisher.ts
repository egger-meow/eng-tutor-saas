import {
  CURRENT_PDF_RENDERER_VERSION,
  CURRENT_RELEASE_ID,
  CURRENT_WORKER_VERSION,
  validateCurriculumPackageForFinisher,
  type CurriculumPackage,
} from '@paper-english/generator'
import {
  inspectCurriculumPdfPair,
  renderCurriculumPackageBytes,
  type CurriculumPdfBytes,
  type CurriculumPdfPairInspection,
} from '@paper-english/pdf'
import { loadGenerationContext, type WorkerClient } from './pipeline.js'

const BUCKET = 'weekly-materials'

export type Week1FastSubmission = {
  job_id: string
  authoring_attempt: number
  generation_worker_id: string
  canonical_source: unknown
}

export type Week1FastPublishResult = {
  jobId: string
  status: 'completed' | 'technical_failed'
  materialId?: string
  errorCode?: string
}

type Render = (pkg: CurriculumPackage) => Promise<CurriculumPdfBytes>
type Inspect = (pkg: CurriculumPackage, pair: CurriculumPdfBytes) => Promise<CurriculumPdfPairInspection>

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, operation: string): T {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`)
  if (result.data === null) throw new Error(`${operation}: empty response`)
  return result.data
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

function assertMatchingPdfPair(expected: CurriculumPdfPairInspection, actual: CurriculumPdfPairInspection): void {
  if (expected.student.layoutFingerprint !== actual.student.layoutFingerprint) {
    throw new Error('existing Student artifact does not match Week 1 canonical render')
  }
  if (expected.parentAnswer.layoutFingerprint !== actual.parentAnswer.layoutFingerprint) {
    throw new Error('existing Parent artifact does not match Week 1 canonical render')
  }
}

function buildSummary(pkg: CurriculumPackage, targetReleaseId: string): Record<string, unknown> {
  const personalizationReasons = Array.isArray(pkg.parentSummary?.personalizationZh)
    ? pkg.parentSummary.personalizationZh.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : []
  const fallback = personalizationReasons.length > 0
    ? personalizationReasons
    : ['這是第一週教材，先用適中的難度了解孩子目前的閱讀、字彙與文法程度，再依這週的學習情況調整之後的內容。']

  return {
    title: pkg.metadata.title,
    theme: pkg.studentLesson.reading.title,
    curriculumVersion: pkg.metadata.curriculumVersion,
    targets: pkg.learningPlan.targets.map((target) => target.id),
    coreVocabulary: pkg.studentLesson.vocabulary.map((item) => item.word),
    learningFocus: pkg.parentSummary?.focusZh ?? null,
    learningAdjustmentSummary: fallback.join('；'),
    personalizationReasons: fallback,
    publicationPath: 'week1_fast',
    releaseId: targetReleaseId,
    rendererVersion: CURRENT_PDF_RENDERER_VERSION,
    workerVersion: CURRENT_WORKER_VERSION,
  }
}

async function recordFailure(
  client: WorkerClient,
  submission: Week1FastSubmission,
  processorId: string,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  try {
    await client.rpc('worker_fail_week1_fast_submission', {
      p_job_id: submission.job_id,
      p_authoring_attempt: submission.authoring_attempt,
      p_processor_id: processorId,
      p_error_code: 'WEEK1_FAST_PUBLISH_FAILED',
      p_error_message: message.slice(0, 2000),
    })
  } catch {
    console.error('[week1-fast] failed to record publisher failure', { jobId: submission.job_id })
  }
}

export async function processWeek1FastSubmissions(
  client: WorkerClient,
  processorId: string,
  claimLimit: number,
  deps: { render?: Render; inspect?: Inspect } = {},
): Promise<Week1FastPublishResult[]> {
  if (!processorId || processorId.length < 3) throw new Error('processorId is required')
  if (!Number.isInteger(claimLimit) || claimLimit < 1 || claimLimit > 25) {
    throw new Error('claimLimit must be between 1 and 25')
  }

  const submissions = unwrap(await client.rpc('worker_claim_week1_fast_submissions', {
    processor_id: processorId,
    claim_limit: claimLimit,
  }), 'claim Week 1 fast submissions') as Week1FastSubmission[]

  const render = deps.render ?? renderCurriculumPackageBytes
  const inspect = deps.inspect ?? inspectCurriculumPdfPair
  const results: Week1FastPublishResult[] = []

  for (const submission of submissions) {
    const createdPaths: string[] = []
    try {
      if (!submission.generation_worker_id || submission.generation_worker_id.length < 3) {
        throw new Error('Week 1 submission is missing its authoring worker identity')
      }

      const context = await loadGenerationContext(client, submission.job_id, submission.generation_worker_id)
      if ((context.job as { sourceMaterialId?: unknown }).sourceMaterialId) {
        throw new Error('Week 2+ job reached Week 1 publisher')
      }

      const raw = submission.canonical_source && typeof submission.canonical_source === 'object'
        ? submission.canonical_source as Record<string, any>
        : {}
      const rawMetadata = raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {}
      const targetReleaseId = context.targetReleaseId ?? rawMetadata.releaseId ?? CURRENT_RELEASE_ID
      if (targetReleaseId !== CURRENT_RELEASE_ID) {
        throw new Error(`Week 1 release mismatch: ${targetReleaseId} != ${CURRENT_RELEASE_ID}`)
      }
      if (rawMetadata.releaseId && rawMetadata.releaseId !== targetReleaseId) {
        throw new Error('Week 1 immutable submission releaseId does not match claimed release')
      }

      // Validate and render from the immutable submission. The parsed package is an in-memory
      // normalized view only; the completion RPC receives the original canonical source.
      const parsed = validateCurriculumPackageForFinisher(submission.canonical_source)
      if (!parsed.success) {
        throw new Error(`Week 1 package integrity invalid: ${parsed.issues.map((issue) => `${issue.path}:${issue.message}`).join(' | ')}`)
      }
      const pkg = parsed.curriculumPackage
      if (pkg.metadata.jobId !== submission.job_id || pkg.metadata.childId !== context.job.childId) {
        throw new Error('Week 1 package identity does not match claimed job')
      }

      const rendered = await render(pkg)
      const expectedInspection = await inspect(pkg, rendered)
      const paths = {
        student: `${context.job.childId}/${submission.job_id}/student.pdf`,
        parent: `${context.job.childId}/${submission.job_id}/parent-answer.pdf`,
      }
      const storage = client.storage.from(BUCKET)
      const studentResult = await createOrRecoverArtifact(storage, paths.student, rendered.student, 'upload Week 1 Student PDF')
      if (studentResult.created) createdPaths.push(paths.student)
      const parentResult = await createOrRecoverArtifact(storage, paths.parent, rendered.parentAnswer, 'upload Week 1 Parent PDF')
      if (parentResult.created) createdPaths.push(paths.parent)

      const actualInspection = studentResult.bytes === rendered.student && parentResult.bytes === rendered.parentAnswer
        ? expectedInspection
        : await inspect(pkg, { student: studentResult.bytes, parentAnswer: parentResult.bytes })
      assertMatchingPdfPair(expectedInspection, actualInspection)

      const materialId = unwrap(await client.rpc('worker_complete_week1_fast_submission', {
        p_job_id: submission.job_id,
        p_authoring_attempt: submission.authoring_attempt,
        p_processor_id: processorId,
        p_student_pdf_path: paths.student,
        p_parent_answer_pdf_path: paths.parent,
        p_canonical_source: submission.canonical_source,
        p_generation_summary: buildSummary(pkg, targetReleaseId),
        p_prompt_version: pkg.metadata.promptVersion,
        p_generator_version: pkg.metadata.curriculumVersion,
        p_model_name: pkg.metadata.model,
      }), 'complete Week 1 fast submission') as string

      try {
        await client.rpc('worker_record_curriculum_observations', {
          material_id: materialId,
          worker_id: submission.generation_worker_id,
          canonical_source: pkg,
        })
      } catch {
        console.warn('[week1-fast] curriculum observations were not recorded', { jobId: submission.job_id })
      }

      results.push({ jobId: submission.job_id, status: 'completed', materialId })
    } catch (error) {
      if (createdPaths.length > 0) {
        try { await client.storage.from(BUCKET).remove(createdPaths) } catch { /* best effort cleanup */ }
      }
      await recordFailure(client, submission, processorId, error)
      results.push({ jobId: submission.job_id, status: 'technical_failed', errorCode: 'WEEK1_FAST_PUBLISH_FAILED' })
    }
  }

  return results
}
