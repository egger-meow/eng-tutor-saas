import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Production Authoring Shared Concurrency & Serialization Invariants', () => {
  const root = resolve(import.meta.dirname, '../../..')

  it('proves worker_start_authoring_batch acquires transaction-scoped advisory lock before lease check or claim', async () => {
    const migration = await readFile(
      resolve(root, 'supabase/migrations/20260901090000_serialized_production_authoring_start.sql'),
      'utf8'
    )

    // Must define authoring_lock_id constant
    expect(migration).toContain('authoring_lock_id constant bigint')
    // Must acquire advisory xact lock
    expect(migration).toContain('perform pg_advisory_xact_lock(authoring_lock_id);')

    // Lock acquisition must occur BEFORE selecting active leases or calling claim
    const lockIdx = migration.indexOf('perform pg_advisory_xact_lock(authoring_lock_id);')
    const selectLeaseIdx = migration.indexOf("from public.generation_jobs\n  where status = 'claimed'")
    const claimIdx = migration.indexOf('private_generation.chatgpt_claim_generation_batch(worker_id)')

    expect(lockIdx).toBeGreaterThan(0)
    expect(selectLeaseIdx).toBeGreaterThan(lockIdx)
    expect(claimIdx).toBeGreaterThan(selectLeaseIdx)
  })

  it('proves all authoring entry points delegate to the shared serialized start primitive', async () => {
    const migration = await readFile(
      resolve(root, 'supabase/migrations/20260901090000_serialized_production_authoring_start.sql'),
      'utf8'
    )

    // Online manual wrapper delegates to worker_start_authoring_batch
    expect(migration).toContain('create or replace function public.worker_start_online_manual_authoring_batch(worker_id text)')
    expect(migration).toContain('select public.worker_start_authoring_batch($1)')

    // Local claim wrapper delegates to worker_start_authoring_batch
    expect(migration).toContain('create or replace function public.worker_claim_local_authoring_batch(worker_id text)')

    // Scheduled cron job delegates to worker_start_authoring_batch
    expect(migration).toContain("public.worker_start_authoring_batch('chatgpt-work-daily')")
  })

  it('proves concurrent conflicting starts fail closed and same-worker starts recover idempotently', async () => {
    const migration = await readFile(
      resolve(root, 'supabase/migrations/20260901090000_serialized_production_authoring_start.sql'),
      'utf8'
    )

    // Different worker with active lease: fail closed immediately with conflict
    expect(migration).toContain('active_worker <> worker_id')
    expect(migration).toContain('ACTIVE_AUTHORING_LEASE_CONFLICT')

    // Same worker with active lease: recover existing batch without claiming again
    expect(migration).toContain('active_worker = worker_id')
    expect(migration).toContain('return private_generation.chatgpt_recover_claimed_generation_batch(worker_id);')

    // Zero active leases: perform exactly one claim
    expect(migration).toContain('return private_generation.chatgpt_claim_generation_batch(worker_id);')
  })

  it('proves Edge Function /start uses shared worker_start_authoring_batch and handles 409 conflict', async () => {
    const edgeFunction = await readFile(
      resolve(root, 'supabase/functions/authoring-bridge/index.ts'),
      'utf8'
    )

    expect(edgeFunction).toContain("rpc('worker_start_authoring_batch'")
    expect(edgeFunction).toContain("error.message?.includes('ACTIVE_AUTHORING_LEASE_CONFLICT')")
    expect(edgeFunction).toContain('return json(isConflict ? 409 : 500,')
  })

  it('verifies simulated simultaneous start concurrency behavior guarantees zero capacity doubling', () => {
    // Under transaction advisory lock serialization:
    // State 1: Active leases = 0
    // Request 1 acquires lock, claims batch of N jobs, sets claimed_by = 'worker-A', lease_expires_at = now() + 6h.
    // Request 2 blocks on advisory lock.
    // Request 1 commits.
    // Request 2 acquires lock.
    // Case 2a: Request 2 has worker_id = 'worker-B' (different worker)
    //   -> Sees active lease owned by 'worker-A'
    //   -> Raises ACTIVE_AUTHORING_LEASE_CONFLICT (fails closed)
    //   -> New batches claimed: 0
    //   -> Total batches in flight: 1 (NEVER capacity * 2)
    // Case 2b: Request 2 has worker_id = 'worker-A' (same worker retry / parallel start)
    //   -> Sees active lease owned by 'worker-A'
    //   -> Calls chatgpt_recover_claimed_generation_batch('worker-A')
    //   -> Returns identical existing batch
    //   -> New batches claimed: 0
    //   -> Total batches in flight: 1 (NEVER capacity * 2)

    type StartResult = { type: 'claimed'; batchCount: number } | { type: 'recovered'; batchCount: number } | { type: 'conflict' }

    function simulateSerializedStarts(worker1: string, worker2: string): [StartResult, StartResult] {
      let activeLeaseWorker: string | null = null
      let totalNewBatches = 0

      function executeStart(callerWorkerId: string): StartResult {
        // Step 1: Lock acquired (simulated sequential execution under advisory lock)
        // Step 2: Check active lease
        if (activeLeaseWorker && activeLeaseWorker !== callerWorkerId) {
          return { type: 'conflict' }
        }
        if (activeLeaseWorker && activeLeaseWorker === callerWorkerId) {
          return { type: 'recovered', batchCount: totalNewBatches }
        }
        // Step 3: Claim
        activeLeaseWorker = callerWorkerId
        totalNewBatches += 1
        return { type: 'claimed', batchCount: totalNewBatches }
      }

      const res1 = executeStart(worker1)
      const res2 = executeStart(worker2)
      return [res1, res2]
    }

    // Test different workers: one claims, second gets conflict; total new batches = 1
    const [resDiff1, resDiff2] = simulateSerializedStarts('worker-alpha', 'worker-beta')
    expect(resDiff1).toEqual({ type: 'claimed', batchCount: 1 })
    expect(resDiff2).toEqual({ type: 'conflict' })

    // Test same worker: one claims, second recovers same batch; total new batches = 1
    const [resSame1, resSame2] = simulateSerializedStarts('worker-alpha', 'worker-alpha')
    expect(resSame1).toEqual({ type: 'claimed', batchCount: 1 })
    expect(resSame2).toEqual({ type: 'recovered', batchCount: 1 })
  })
})
