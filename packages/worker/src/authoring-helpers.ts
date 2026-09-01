import {
  auditCurriculumPackage,
  validateCurriculumPackage,
  CURRENT_ENGINE_VERSION,
  CURRENT_PROMPT_VERSION,
  CURRENT_SCHEMA_VERSION,
  type CurriculumPackage,
} from '@paper-english/generator'
import type { WorkerClient } from './pipeline.js'

export const DEFAULT_PRODUCTION_MODEL = 'gpt-5.6-sol'

export type LeaseStatus = {
  hasActiveClaim: boolean
  isOwnedByCaller: boolean
  claimedBy: string | null
  jobIds: string[]
  canClaim: boolean
  message: string
}

export type ClaimBatchResult = {
  source: 'new_claim' | 'active_recovery'
  bridgeVersion?: string
  claimed: Array<Record<string, unknown>>
  claimedCount: number
  normalCapacity?: number | null
  mandatoryCapacityOverride?: boolean
  oldestOutstandingDeadline?: string | null
}

export type PreSubmitValidationResult = {
  valid: boolean
  issues: string[]
  curriculumPackage?: CurriculumPackage
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, operation: string): T {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`)
  if (result.data === null) throw new Error(`${operation}: empty response`)
  return result.data
}

export async function checkActiveLeaseState(client: WorkerClient, workerId?: string): Promise<LeaseStatus> {
  const leasesResult = await client.rpc('worker_get_active_generation_leases', {})
  if (leasesResult.error) {
    // Fail-closed for production collision safety: if lease state cannot be verified, block claiming
    return {
      hasActiveClaim: true,
      isOwnedByCaller: false,
      claimedBy: 'unknown',
      jobIds: [],
      canClaim: false,
      message: `Active lease check failed (${leasesResult.error.message}); claiming blocked for collision safety (fail-closed)`,
    }
  }

  const activeLeases = (leasesResult.data ?? []) as Array<{ id?: string; jobId?: string; claimed_by?: string; workerId?: string; lease_expires_at?: string; claimExpiresAt?: string }>
  if (!Array.isArray(activeLeases) || activeLeases.length === 0) {
    return {
      hasActiveClaim: false,
      isOwnedByCaller: false,
      claimedBy: null,
      jobIds: [],
      canClaim: true,
      message: 'No active lease. Ready to claim.',
    }
  }

  const distinctClaimants = [...new Set(activeLeases.map((l) => l.claimed_by ?? l.workerId ?? 'unknown'))]
  const primaryClaimant = distinctClaimants[0] ?? 'unknown'
  const isOwned = Boolean(workerId && primaryClaimant === workerId)
  const jobIds = activeLeases.map((l) => l.id ?? l.jobId ?? '')

  return {
    hasActiveClaim: true,
    isOwnedByCaller: isOwned,
    claimedBy: primaryClaimant,
    jobIds,
    canClaim: false,
    message: isOwned
      ? `Active lease held by current worker: ${workerId} (${jobIds.length} jobs)`
      : `Active lease held by another worker: ${primaryClaimant} (${jobIds.length} jobs)`,
  }
}

export async function claimProductionBatch(
  client: WorkerClient,
  workerId: string,
  options?: { force?: boolean },
): Promise<ClaimBatchResult> {
  if (!workerId || workerId.trim().length < 3) {
    throw new Error('workerId is required (min 3 chars)')
  }

  const leaseState = await checkActiveLeaseState(client, workerId)
  if (leaseState.hasActiveClaim) {
    if (!leaseState.isOwnedByCaller && !options?.force) {
      throw new Error(`ACTIVE_LEASE_EXISTS: Active lease held by ${leaseState.claimedBy}`)
    }

    if (leaseState.isOwnedByCaller) {
      // Recover existing active batch for this worker
      const recovery = await client.rpc('worker_recover_active_authoring_batch', { worker_id: workerId })
      if (!recovery.error && recovery.data) {
        const data = recovery.data as Record<string, unknown>
        return {
          source: 'active_recovery',
          bridgeVersion: typeof data.bridgeVersion === 'string' ? data.bridgeVersion : '1.4.0',
          claimed: Array.isArray(data.claimed) ? data.claimed as Array<Record<string, unknown>> : [],
          claimedCount: typeof data.claimedCount === 'number' ? data.claimedCount : 0,
          normalCapacity: typeof data.normalCapacity === 'number' ? data.normalCapacity : null,
          mandatoryCapacityOverride: Boolean(data.mandatoryCapacityOverride),
          oldestOutstandingDeadline: typeof data.oldestOutstandingDeadline === 'string' ? data.oldestOutstandingDeadline : null,
        }
      }
    }
  }

  const claimResult = unwrap(
    await client.rpc('worker_claim_local_authoring_batch', { worker_id: workerId }),
    'claim production batch',
  ) as Record<string, unknown>

  return {
    source: 'new_claim',
    bridgeVersion: typeof claimResult.bridgeVersion === 'string' ? claimResult.bridgeVersion : undefined,
    claimed: Array.isArray(claimResult.claimed) ? claimResult.claimed as Array<Record<string, unknown>> : [],
    claimedCount: typeof claimResult.claimedCount === 'number' ? claimResult.claimedCount : 0,
    normalCapacity: typeof claimResult.normalCapacity === 'number' ? claimResult.normalCapacity : null,
    mandatoryCapacityOverride: Boolean(claimResult.mandatoryCapacityOverride),
    oldestOutstandingDeadline: typeof claimResult.oldestOutstandingDeadline === 'string' ? claimResult.oldestOutstandingDeadline : null,
  }
}

export function validatePreSubmitPackage(
  rawPackage: unknown,
  context: Record<string, unknown>,
): PreSubmitValidationResult {
  const issues: string[] = []

  const rawMeta = (rawPackage && typeof rawPackage === 'object' && 'metadata' in rawPackage && typeof (rawPackage as any).metadata === 'object')
    ? (rawPackage as any).metadata
    : null
  const job = (context.job ?? {}) as Record<string, unknown>
  const expectedJobId = typeof job.id === 'string' ? job.id : ''
  const expectedChildId = typeof job.childId === 'string' ? job.childId : ''
  const expectedFingerprint = typeof context.inputFingerprint === 'string' ? context.inputFingerprint : ''

  if (rawMeta) {
    if (expectedJobId && rawMeta.jobId !== expectedJobId) {
      issues.push(`METADATA_JOB_ID_MISMATCH: expected ${expectedJobId}, got ${rawMeta.jobId}`)
    }
    if (expectedChildId && rawMeta.childId !== expectedChildId) {
      issues.push(`METADATA_CHILD_ID_MISMATCH: expected ${expectedChildId}, got ${rawMeta.childId}`)
    }
    if (expectedFingerprint && rawMeta.inputFingerprint !== expectedFingerprint) {
      issues.push(`FINGERPRINT_MISMATCH: expected ${expectedFingerprint}, got ${rawMeta.inputFingerprint}`)
    }
  }

  const parsed = validateCurriculumPackage(rawPackage)
  if (!parsed.success) {
    for (const issue of parsed.issues) {
      issues.push(`${issue.path}: ${issue.message}`)
    }
    return {
      valid: false,
      issues,
    }
  }

  const pkg = parsed.curriculumPackage

  const modelNormalized = pkg.metadata.model?.toLowerCase() ?? ''
  if (!modelNormalized.includes('gpt-5.6-sol')) {
    issues.push(`MODEL_METADATA_MISMATCH: expected gpt-5.6-sol, got ${pkg.metadata.model}`)
  }

  if (pkg.metadata.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    issues.push(`SCHEMA_VERSION_MISMATCH: expected ${CURRENT_SCHEMA_VERSION}, got ${pkg.metadata.schemaVersion}`)
  }
  if (pkg.metadata.promptVersion !== `prompt/${CURRENT_PROMPT_VERSION}`) {
    issues.push(`PROMPT_VERSION_MISMATCH: expected prompt/${CURRENT_PROMPT_VERSION}, got ${pkg.metadata.promptVersion}`)
  }
  if (pkg.metadata.engineVersion !== CURRENT_ENGINE_VERSION) {
    issues.push(`ENGINE_VERSION_MISMATCH: expected ${CURRENT_ENGINE_VERSION}, got ${pkg.metadata.engineVersion}`)
  }

  // Verify written response questions have writing space
  const allPracticeQuestions = (pkg.studentLesson?.practice ?? []).flatMap((stage) => stage.questions ?? [])
  const homeworkQuestions = pkg.studentLesson?.homework?.questions ?? []
  const allQuestions: Array<{ id: string; itemType?: string; options?: string[]; writingLines?: number; responseLayout?: unknown }> = [
    ...allPracticeQuestions,
    ...homeworkQuestions,
  ]

  for (const q of allQuestions) {
    const hasOptions = Array.isArray(q.options) && q.options.length > 0
    const itemType = typeof q.itemType === 'string' ? q.itemType : ''
    const isWrittenResponse = !hasOptions || ['short-response', 'sentence-production', 'translation', 'open-response'].includes(itemType)

    if (isWrittenResponse) {
      const writingLines = typeof q.writingLines === 'number' ? q.writingLines : undefined
      const responseLayout = q.responseLayout
      const hasLayout = responseLayout && typeof responseLayout === 'object' && Object.keys(responseLayout).length > 0

      if ((writingLines === undefined || writingLines < 1) && !hasLayout) {
        issues.push(`questions.${q.id}.writingLines: Written responses require writing space (writingLines >= 1 or non-empty responseLayout)`)
      }
    }
  }

  const targetMinutes = typeof (context.profile as Record<string, unknown> | undefined)?.weekly_minutes === 'number'
    ? (context.profile as Record<string, number>).weekly_minutes
    : undefined

  const audit = auditCurriculumPackage(pkg, { targetMinutes })
  for (const finding of audit.findings) {
    if (finding.severity === 'critical') {
      issues.push(`AUDIT_CRITICAL:${finding.dimension}: ${finding.message}`)
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    curriculumPackage: issues.length === 0 ? pkg : undefined,
  }
}

export async function submitProductionPackage(
  client: WorkerClient,
  jobId: string,
  workerId: string,
  payload: unknown,
): Promise<{ submitted: boolean; status: string; jobId: string }> {
  const payloadText = typeof payload === 'string' ? payload : JSON.stringify(payload)
  const submitted = await client.rpc('worker_submit_local_curriculum_package', {
    p_job_id: jobId,
    p_generation_worker_id: workerId,
    p_payload_text: payloadText,
  })

  if (submitted.error) {
    // Attempt read-after-write recovery
    const status = await getSubmissionStatus(client, jobId, workerId)
    if (status.submissionFound) {
      return { submitted: true, status: 'SUBMITTED_RECOVERED', jobId }
    }
    throw new Error(`SUBMIT_FAILED: ${submitted.error.message}`)
  }

  return { submitted: true, status: 'SUBMITTED_AWAITING_FINISHER', jobId }
}

export async function getSubmissionStatus(
  client: WorkerClient,
  jobId: string,
  workerId: string,
): Promise<{ submissionFound: boolean; status?: string; [key: string]: unknown }> {
  const result = unwrap(
    await client.rpc('worker_local_curriculum_submission_status', { job_id: jobId, worker_id: workerId }),
    'read submission status',
  ) as Record<string, unknown>
  return {
    submissionFound: result.submissionFound === true,
    status: typeof result.status === 'string' ? result.status : undefined,
    ...result,
  }
}

export async function releaseUnsubmittedClaim(
  client: WorkerClient,
  jobId: string,
  workerId: string,
  code: string,
  message?: string,
): Promise<void> {
  const status = await getSubmissionStatus(client, jobId, workerId)
  if (status.submissionFound) {
    throw new Error(`CANNOT_RELEASE_SUBMITTED_CLAIM: Submission already exists for job ${jobId}`)
  }

  unwrap(
    await client.rpc('worker_release_local_unsubmitted_claim', {
      job_id: jobId,
      worker_id: workerId,
      error_code: code,
      error_message: message ?? 'Local authoring ended before an immutable submission was confirmed.',
    }),
    'release unsubmitted claim',
  )
}

export async function getSchedulerMode(client: WorkerClient): Promise<{ mode: 'local' | 'online' }> {
  const res = await client.rpc('worker_get_scheduler_mode', {})
  if (!res.error && res.data) {
    const mode = String(res.data).toLowerCase()
    if (mode === 'online') return { mode: 'online' }
  }
  return { mode: 'local' }
}

export async function setSchedulerMode(client: WorkerClient, mode: 'local' | 'online'): Promise<{ mode: 'local' | 'online' }> {
  if (mode !== 'local' && mode !== 'online') {
    throw new Error("Mode must be 'local' or 'online'")
  }
  unwrap(await client.rpc('worker_set_scheduler_mode', { mode }), 'set scheduler mode')
  return { mode }
}
