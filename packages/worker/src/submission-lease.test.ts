import { afterEach, describe, expect, it, vi } from 'vitest'
import { withSubmissionLeaseHeartbeat } from './submission-lease.js'
import type { WorkerClient } from './pipeline.js'

afterEach(() => vi.useRealTimers())
describe('submission heartbeat', () => {
  it('renews the processor leases during slow work and stops after completion', async () => {
    vi.useFakeTimers()
    const rpc = vi.fn(async () => ({ data: 2, error: null }))
    let finish!: (value: string) => void
    const result = withSubmissionLeaseHeartbeat({ rpc } as unknown as WorkerClient, 'run-1',
      () => new Promise<string>(resolve => { finish = resolve }), 100)
    await vi.advanceTimersByTimeAsync(250)
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc).toHaveBeenCalledWith('worker_renew_submission_leases', { p_processor_id: 'run-1' })
    finish('done')
    await expect(result).resolves.toBe('done')
    await vi.advanceTimersByTimeAsync(500)
    expect(rpc).toHaveBeenCalledTimes(2)
  })
  it('reports renewal failure without abandoning in-flight work or leaking the timer', async () => {
    vi.useFakeTimers()
    const rpc = vi.fn(async () => ({ data: null, error: { message: 'transport failed' } }))
    let finish!: () => void
    const result = withSubmissionLeaseHeartbeat({ rpc } as unknown as WorkerClient, 'run-2',
      () => new Promise<void>(resolve => { finish = resolve }), 100)
    const rejection = expect(result).rejects.toThrow('Submission lease renewal failed')
    await vi.advanceTimersByTimeAsync(100)
    finish()
    await rejection
    expect(vi.getTimerCount()).toBe(0)
  })
})
