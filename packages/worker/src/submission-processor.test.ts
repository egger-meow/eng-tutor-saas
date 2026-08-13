import { describe, expect, it, vi } from 'vitest'
import { processCurriculumSubmissions, type CurriculumSubmission } from './submission-processor.js'
import type { WorkerClient } from './pipeline.js'

function setup(submissions: CurriculumSubmission[]) {
  const rpc = vi.fn<WorkerClient['rpc']>(async (name: string) => {
    if (name === 'worker_claim_curriculum_submissions') return { data: submissions, error: null }
    if (name === 'worker_finish_curriculum_submission') return { data: true, error: null }
    return { data: null, error: { message: `unexpected RPC ${name}` } }
  })
  const client: WorkerClient = {
    rpc,
    storage: { from: () => ({
      upload: async () => ({ data: {}, error: null }),
      download: async () => ({ data: null, error: { message: 'not found' } }),
      remove: async () => ({ data: {}, error: null }),
    }) },
  }
  return { client, rpc }
}

const submission: CurriculumSubmission = {
  job_id: '00000000-0000-0000-0000-000000000051',
  generation_worker_id: 'chatgpt-work-daily',
  canonical_source: { metadata: { schemaVersion: '2.0.0' } },
}

describe('processCurriculumSubmissions', () => {
  it('completes a submitted package and records the material ID', async () => {
    const state = setup([submission])
    const complete = vi.fn(async () => '00000000-0000-0000-0000-000000000061')
    await expect(processCurriculumSubmissions(state.client, 'github-actions-finisher', 5, complete)).resolves.toEqual([{
      jobId: submission.job_id,
      status: 'completed',
      materialId: '00000000-0000-0000-0000-000000000061',
    }])
    expect(state.rpc).toHaveBeenCalledWith('worker_finish_curriculum_submission', expect.objectContaining({
      outcome: 'completed',
    }))
  })

  it('records a deterministic quality rejection without logging the package', async () => {
    const state = setup([submission])
    const complete = vi.fn(async () => { throw new Error('Curriculum quality rejected:\nreading: answer mismatch') })
    await expect(processCurriculumSubmissions(state.client, 'github-actions-finisher', 5, complete)).resolves.toEqual([{
      jobId: submission.job_id,
      status: 'quality_rejected',
      errorCode: 'QUALITY_REJECTED',
    }])
    expect(state.rpc).toHaveBeenCalledWith('worker_finish_curriculum_submission', expect.objectContaining({
      outcome: 'quality_rejected',
      error_code: 'QUALITY_REJECTED',
    }))
  })

  it('continues processing after a technical failure', async () => {
    const second = { ...submission, job_id: '00000000-0000-0000-0000-000000000052' }
    const state = setup([submission, second])
    const complete = vi.fn(async (item: CurriculumSubmission) => {
      if (item.job_id === submission.job_id) throw new Error('chromium crashed')
      return '00000000-0000-0000-0000-000000000062'
    })
    const results = await processCurriculumSubmissions(state.client, 'github-actions-finisher', 5, complete)
    expect(results.map((result) => result.status)).toEqual(['technical_failed', 'completed'])
    expect(complete).toHaveBeenCalledTimes(2)
  })
})
