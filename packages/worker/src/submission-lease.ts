import type { WorkerClient } from './pipeline.js'

/** Keep both submission and authoring leases alive while a serial claimed batch is processed. */
export async function withSubmissionLeaseHeartbeat<T>(
  client: WorkerClient,
  processorId: string,
  work: () => Promise<T>,
  intervalMs = 5 * 60 * 1000,
): Promise<T> {
  let pending: Promise<void> | null = null
  let failure: Error | null = null
  const timer = setInterval(() => {
    if (pending) return
    pending = (async () => {
      try {
        const result = await client.rpc('worker_renew_submission_leases', { p_processor_id: processorId })
        if (result.error) throw new Error('Submission lease renewal failed')
      } catch {
        failure = new Error('Submission lease renewal failed; durable lease checks remain authoritative')
      } finally {
        pending = null
      }
    })()
  }, intervalMs)
  timer.unref()
  try {
    const result = await work()
    if (pending) await pending
    if (failure) throw failure
    return result
  } finally {
    clearInterval(timer)
    if (pending) await pending
  }
}
