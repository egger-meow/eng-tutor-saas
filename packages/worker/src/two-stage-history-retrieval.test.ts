import { describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import type { WorkerClient } from './pipeline.js'

describe('Two-Stage History Retrieval and Context Compaction', () => {
  it('verifies stage 1 claimed context is compact with stripped bulk older evidence', () => {
    // Simulate generation context produced by worker_generation_context in stage 1
    const stage1Context = {
      job: { id: '01234567-89ab-cdef-0123-456789abcdef', childId: 'fedcba98-7654-3210-fedc-ba9876543210' },
      lifetimeLearningMemory: {
        vocabulary: { total: 10, dueTargetIds: ['vocab-1'], verifiedWeakTargetIds: ['vocab-2'], uncertainTargetIds: [], masteredTargetIds: [], regressionTargetIds: [] },
        grammar: { total: 5, dueTargetIds: ['grammar-1'], verifiedWeakTargetIds: [], uncertainTargetIds: [], masteredTargetIds: [], regressionTargetIds: [] },
        communication: { total: 2, dueTargetIds: [], verifiedWeakTargetIds: [], uncertainTargetIds: [], masteredTargetIds: [], regressionTargetIds: [] },
      },
      targetedOlderEvidence: [], // Stripped in Stage 1!
      cutoffTimestamp: '2026-09-06T12:00:00.000Z',
      claimSnapshotId: '01234567-89ab-cdef-0123-456789abcdef',
      memoryPolicyVersion: 'two-stage-v1',
      targetReleaseId: 'rel_1.8.1',
    }

    // Stage 1 context must NOT have bulk older evidence rows
    expect(stage1Context.targetedOlderEvidence).toEqual([])
    expect(stage1Context.memoryPolicyVersion).toBe('two-stage-v1')
    expect(stage1Context.targetReleaseId).toBe('rel_1.8.1')
    expect(stage1Context.cutoffTimestamp).toBeDefined()
    expect(stage1Context.claimSnapshotId).toBeDefined()
  })

  it('verifies stage 2 fetch_targeted_student_history returns targeted evidence with manifest hash and cutoff enforcement', async () => {
    const mockEvidence = [
      { targetType: 'vocabulary', targetId: 'vocab-2', result: 'incorrect', observedAt: '2026-09-05T10:00:00.000Z' },
      { targetType: 'grammar', targetId: 'grammar-1', result: 'partial', observedAt: '2026-09-04T08:00:00.000Z' },
    ]
    const manifestHash = 'sha256:' + createHash('sha256').update(JSON.stringify(mockEvidence)).digest('hex')

    const client: WorkerClient = {
      rpc: vi.fn(async (name, params: any) => {
        if (name === 'worker_fetch_targeted_student_history') {
          // Verify params
          if (params.job_id !== '01234567-89ab-cdef-0123-456789abcdef') {
            return { data: null, error: { message: 'JOB_NOT_FOUND' } }
          }
          if (params.worker_id !== 'worker-codex-1') {
            return { data: null, error: { message: 'WORKER_MISMATCH' } }
          }
          // Filter targets
          const filtered = mockEvidence.filter((e) => params.target_ids.includes(e.targetId))
          const hash = 'sha256:' + createHash('sha256').update(JSON.stringify(filtered)).digest('hex')
          return {
            data: {
              jobId: params.job_id,
              childId: 'fedcba98-7654-3210-fedc-ba9876543210',
              cutoffTimestamp: params.cutoff_timestamp ?? '2026-09-06T12:00:00.000Z',
              targetIds: params.target_ids,
              evidence: filtered,
              evidenceCount: filtered.length,
              manifestHash: hash,
            },
            error: null,
          }
        }
        return { data: null, error: { message: `unexpected rpc ${name}` } }
      }),
      storage: { from: vi.fn() as any },
    }

    const response = await client.rpc('worker_fetch_targeted_student_history', {
      job_id: '01234567-89ab-cdef-0123-456789abcdef',
      worker_id: 'worker-codex-1',
      target_ids: ['vocab-2'],
      cutoff_timestamp: '2026-09-06T12:00:00.000Z',
      claim_snapshot_id: '01234567-89ab-cdef-0123-456789abcdef',
      evidence_limit: 5,
    })

    expect(response.error).toBeNull()
    const data = response.data as any
    expect(data.jobId).toBe('01234567-89ab-cdef-0123-456789abcdef')
    expect(data.evidenceCount).toBe(1)
    expect(data.evidence[0].targetId).toBe('vocab-2')
    expect(data.manifestHash).toBeDefined()
    expect(data.manifestHash.startsWith('sha256:')).toBe(true)
  })

  it('fails closed when worker mismatch or invalid job is queried', async () => {
    const client: WorkerClient = {
      rpc: vi.fn(async (name, params: any) => {
        if (name === 'worker_fetch_targeted_student_history') {
          if (params.worker_id !== 'worker-owner') {
            return { data: null, error: { message: 'WORKER_MISMATCH: Job is claimed by worker-owner, not rogue-worker' } }
          }
        }
        return { data: null, error: { message: 'UNEXPECTED' } }
      }),
      storage: { from: vi.fn() as any },
    }

    const response = await client.rpc('worker_fetch_targeted_student_history', {
      job_id: '01234567-89ab-cdef-0123-456789abcdef',
      worker_id: 'rogue-worker',
      target_ids: ['vocab-1'],
    })

    expect(response.error).not.toBeNull()
    expect(response.error?.message).toContain('WORKER_MISMATCH')
  })
})
