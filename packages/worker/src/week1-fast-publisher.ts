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

export type Week1FastPublishStage =
  | 'context_loading'
  | 'release_validation'
  | 'schema_integrity_validation'
  | 'rendering'
  | 'pdf_inspection'
  | 'upload'
  | 'db_completion'

export type Week1FastPublishResult = {
  jobId: string
  status: 'completed' | 'technical_failed' | 'quality_rejected'
  materialId?: string
  errorCode?: string
  errorMessage?: string
  stage?: Week1FastPublishStage
}

export type Week1FastFailureClassification = {
  outcome: 'technical_failed' | 'quality_rejected'
  errorCode: string
  evidence?: Record<string, unknown>
}

export function classifyWeek1FastFailure(
  stage: Week1FastPublishStage,
  error: unknown,
): Week1FastFailureClassification {
  const message = error instanceof Error ? error.message : String(error)

  if (stage === 'release_validation' || /Release mismatch/iu.test(message)) {
    return {
      outcome: 'technical_failed',
      errorCode: 'RELEASE_MISMATCH',
    }
  }

  if (stage === 'schema_integrity_validation') {
    return {
      outcome: 'quality_rejected',
      errorCode: 'QUALITY_REJECTED',
    }
  }

  if (stage === 'context_loading') {
    return {
      outcome: 'technical_failed',
      errorCode: 'CONTEXT_LOAD_FAILED',
    }
  }

  if (stage === 'rendering') {
    return {
      outcome: 'technical_failed',
      errorCode: 'PDF_RENDER_FAILED',
    }
  }

  if (stage === 'pdf_inspection') {
    return {
      outcome: 'technical_failed',
      errorCode: 'PDF_INSPECTION_FAILED',
    }
  }

  if (stage === 'upload') {
    return {
      outcome: 'technical_failed',
      errorCode: 'STORAGE_UPLOAD_FAILED',
    }
  }

  if (stage === 'db_completion') {
    return {
      outcome: 'technical_failed',
      errorCode: 'COMPLETION_RPC_FAILED',
    }
  }

  return {
    outcome: 'technical_failed',
    errorCode: 'WEEK1_FAST_PUBLISH_FAILED',
  }
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
  stage: Week1FastPublishStage,
  error: unknown,
  classified: Week1FastFailureClassification,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error)
  const diagnostics = {
    jobId: submission.job_id,
    authoringAttempt: submission.authoring_attempt,
    processorId,
    publicationPath: 'week1_fast',
    stage,
    errorCode: classified.errorCode,
    originalMessage: message,
  }

  process.stderr.write(`[week1-fast] publication failure: ${JSON.stringify(diagnostics)}\n`)

  const failureEvidence = {
    stage,
    publicationPath: 'week1_fast',
    processorId,
    originalMessage: message.slice(0, 2000),
    ...(classified.evidence ?? {}),
  }

  const result = await client.rpc('worker_fail_week1_fast_submission', {
    p_job_id: submission.job_id,
    p_authoring_attempt: submission.authoring_attempt,
    p_processor_id: processorId,
    p_error_code: classified.errorCode,
    p_error_message: message.slice(0, 2000),
    p_failure_evidence: failureEvidence,
    p_outcome: classified.outcome,
  })

  if (result.error) {
    throw new Error(`[week1-fast] recordFailure RPC error for job ${submission.job_id}: ${result.error.message}`)
  }
  if (result.data !== true) {
    throw new Error(`[week1-fast] recordFailure RPC failed for job ${submission.job_id}: lease lost or unexpected response (${JSON.stringify(result.data)})`)
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
    let stage: Week1FastPublishStage = 'context_loading'
    try {
      if (!submission.generation_worker_id || submission.generation_worker_id.length < 3) {
        throw new Error('Week 1 submission is missing its authoring worker identity')
      }

      const context = await loadGenerationContext(client, submission.job_id, submission.generation_worker_id)
      if ((context.job as { sourceMaterialId?: unknown }).sourceMaterialId) {
        throw new Error('Week 2+ job reached Week 1 publisher')
      }

      stage = 'release_validation'
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

      stage = 'schema_integrity_validation'
      // Validate and render from the immutable submission. The parsed package is an in-memory
      // normalized view only; the completion RPC receives the original canonical source.
      const parsed = validateCurriculumPackageForFinisher(submission.canonical_source)
      if (!parsed.success) {
        const issuesMessage = parsed.issues.map((issue) => `${issue.path}:${issue.message}`).join(' | ')
        const err = new Error(`Week 1 package integrity invalid: ${issuesMessage}`)
        ;(err as any).evidence = {
          failureType: 'QUALITY_REJECTED',
          findings: parsed.issues.map((issue) => ({
            source: 'validation',
            path: issue.path,
            dimension: 'deterministic-validation',
            message: issue.message,
          })),
        }
        throw err
      }
      const pkg = parsed.curriculumPackage
      if (pkg.metadata.jobId !== submission.job_id || pkg.metadata.childId !== context.job.childId) {
        throw new Error('Week 1 package identity does not match claimed job')
      }

      stage = 'rendering'
      const rendered = await render(pkg)

      stage = 'pdf_inspection'
      const expectedInspection = await inspect(pkg, rendered)

      stage = 'upload'
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

      stage = 'db_completion'
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
      const classified = classifyWeek1FastFailure(stage, error)
      if ((error as any)?.evidence) {
        classified.evidence = { ...(classified.evidence ?? {}), ...(error as any).evidence }
      }
      await recordFailure(client, submission, processorId, stage, error, classified)
      results.push({
        jobId: submission.job_id,
        status: classified.outcome,
        errorCode: classified.errorCode,
        errorMessage: error instanceof Error ? error.message : String(error),
        stage,
      })
    }
  }

  return results
}
