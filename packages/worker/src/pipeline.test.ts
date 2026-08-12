import { describe, expect, it, vi } from 'vitest'
import { syntheticWeekOne } from '@paper-english/generator'
import { completeJob, type GenerationContext, type WorkerClient } from './pipeline.js'

function setup() {
  const uploads: string[] = []
  const removals: string[][] = []
  const rpc = vi.fn(async (name: string) => ({ data: name === 'worker_complete_generation_job' ? 'material-1' : true, error: null }))
  const client: WorkerClient = {
    rpc,
    storage: { from: () => ({
      upload: async (path) => { uploads.push(path); return { data: {}, error: null } },
      remove: async (paths) => { removals.push(paths); return { data: {}, error: null } },
    }) },
  }
  const context: GenerationContext = { job: { id: 'synthetic-week-1', childId: 'synthetic-child', materialWeek: '2026-08-18', ruleVersion: 'weekly-material/1.0.0' } }
  return { client, context, rpc, uploads, removals }
}

describe('completeJob', () => {
  it('uploads both PDFs before completing the database job', async () => {
    const state = setup()
    const materialId = await completeJob({
      client: state.client, workerId: 'worker-1', context: state.context,
      lesson: syntheticWeekOne, promptVersion: 'prompt-v1', generatorVersion: 'generator-v1', modelName: 'model-v1',
      render: async () => ({ student: new Uint8Array([1]), parentAnswer: new Uint8Array([2]) }),
    })
    expect(materialId).toBe('material-1')
    expect(state.uploads).toEqual([
      'synthetic-child/synthetic-week-1/student.pdf',
      'synthetic-child/synthetic-week-1/parent-answer.pdf',
    ])
    expect(state.rpc).toHaveBeenCalledWith('worker_complete_generation_job', expect.objectContaining({ job_id: 'synthetic-week-1' }))
  })

  it('cleans artifacts and marks the job failed when upload fails', async () => {
    const state = setup()
    state.client.storage.from = () => ({
      upload: async () => ({ data: null, error: { message: 'storage unavailable' } }),
      remove: async (paths) => { state.removals.push(paths); return { data: {}, error: null } },
    })
    await expect(completeJob({
      client: state.client, workerId: 'worker-1', context: state.context,
      lesson: syntheticWeekOne, promptVersion: 'prompt-v1', generatorVersion: 'generator-v1', modelName: 'model-v1',
      render: async () => ({ student: new Uint8Array([1]), parentAnswer: new Uint8Array([2]) }),
    })).rejects.toThrow('storage unavailable')
    expect(state.rpc).toHaveBeenCalledWith('worker_fail_generation_job', expect.objectContaining({ job_id: 'synthetic-week-1' }))
    expect(state.removals).toHaveLength(2)
  })

  it('keeps uploaded artifacts when database completion has an ambiguous transport failure', async () => {
    const state = setup()
    state.rpc.mockImplementation(async (name: string) => {
      if (name === 'worker_complete_generation_job') throw new Error('connection reset')
      return { data: true, error: null }
    })
    await expect(completeJob({
      client: state.client, workerId: 'worker-1', context: state.context,
      lesson: syntheticWeekOne, promptVersion: 'prompt-v1', generatorVersion: 'generator-v1', modelName: 'model-v1',
      render: async () => ({ student: new Uint8Array([1]), parentAnswer: new Uint8Array([2]) }),
    })).rejects.toThrow('connection reset')
    expect(state.removals).toHaveLength(1)
    expect(state.rpc).not.toHaveBeenCalledWith('worker_fail_generation_job', expect.anything())
  })
})
