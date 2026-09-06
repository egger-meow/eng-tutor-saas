import type { WorkerClient } from './pipeline.js'

export interface FetchTargetedHistoryOptions {
  jobId: string
  workerId: string
  claimSnapshotId?: string
  targetIds?: string[]
  cutoffTimestamp?: string
  evidenceLimit?: number
}

export interface TargetedHistoryItem {
  targetType: string
  targetId: string
  result: string
  observedAt: string
}

export interface TargetedStudentHistoryResult {
  jobId: string
  childId: string
  cutoffTimestamp: string
  targetIds: string[]
  evidence: TargetedHistoryItem[]
  evidenceCount: number
  manifestHash: string
}

/**
 * Invokes public.worker_fetch_targeted_student_history via the worker client.
 * Fails fast with an explicit error on transport/database failure;
 * never swallows errors or treats RPC failures as empty history.
 */
export async function fetchTargetedStudentHistory(
  client: WorkerClient,
  options: FetchTargetedHistoryOptions,
): Promise<TargetedStudentHistoryResult> {
  if (!options.jobId) throw new Error('FETCH_TARGETED_HISTORY_FAILED: jobId is required')
  if (!options.workerId) throw new Error('FETCH_TARGETED_HISTORY_FAILED: workerId is required')

  const rpcParams = {
    job_id: options.jobId,
    worker_id: options.workerId,
    claim_snapshot_id: options.claimSnapshotId ?? options.jobId,
    target_ids: options.targetIds ?? [],
    cutoff_timestamp: options.cutoffTimestamp ?? null,
    evidence_limit: options.evidenceLimit ?? 10,
  }

  const res = await client.rpc('worker_fetch_targeted_student_history', rpcParams)
  if (res.error) {
    throw new Error(`FETCH_TARGETED_HISTORY_FAILED: ${res.error.message || 'Unknown database error'}`)
  }
  if (!res.data || typeof res.data !== 'object') {
    throw new Error('FETCH_TARGETED_HISTORY_FAILED: No data returned from RPC')
  }

  const data = res.data as Record<string, unknown>
  return {
    jobId: String(data.jobId ?? options.jobId),
    childId: String(data.childId ?? ''),
    cutoffTimestamp: String(data.cutoffTimestamp ?? options.cutoffTimestamp ?? ''),
    targetIds: Array.isArray(data.targetIds) ? (data.targetIds as string[]) : (options.targetIds ?? []),
    evidence: Array.isArray(data.evidence) ? (data.evidence as TargetedHistoryItem[]) : [],
    evidenceCount: typeof data.evidenceCount === 'number' ? data.evidenceCount : 0,
    manifestHash: String(data.manifestHash ?? ''),
  }
}
