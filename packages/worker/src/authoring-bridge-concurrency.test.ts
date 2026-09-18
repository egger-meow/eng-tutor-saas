import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Production Authoring Parallel Claim Invariants', () => {
  const root = resolve(import.meta.dirname, '../../..')

  it('serializes only the short start/claim critical section', async () => {
    const migration = await readFile(
      resolve(root, 'supabase/migrations/20260918153000_parallel_authoring_batches.sql'),
      'utf8',
    )

    expect(migration).toContain('perform pg_advisory_xact_lock(authoring_lock_id);')
    expect(migration).toContain('job.claimed_by = worker_id')
    expect(migration).toContain('return private_generation.chatgpt_recover_claimed_generation_batch(worker_id);')
    expect(migration).toContain('return private_generation.chatgpt_claim_generation_batch(worker_id);')
    expect(migration).not.toContain('ACTIVE_AUTHORING_LEASE_CONFLICT')
  })

  it('keeps row claims atomic and bounded by the shared setting', async () => {
    const migration = await readFile(
      resolve(root, 'supabase/migrations/20260918153000_parallel_authoring_batches.sql'),
      'utf8',
    )
    const capMigration = await readFile(
      resolve(root, 'supabase/migrations/20260918123000_feedback_requested_generation_and_authoring_cap.sql'),
      'utf8',
    )

    expect(migration).toContain("'authoring_batch_limit'")
    expect(migration).toContain('for update of job skip locked')
    expect(migration).toContain('limit claim_limit')
    expect(capMigration).toContain('limit claim_limit')
  })

  it('gives each online manual start a server-owned run identity', async () => {
    const edgeFunction = await readFile(
      resolve(root, 'supabase/functions/authoring-bridge/index.ts'),
      'utf8',
    )

    expect(edgeFunction).toContain("ONLINE_MANUAL_WORKER_PREFIX = 'chatgpt-online-manual:'")
    expect(edgeFunction).toContain('const runId = crypto.randomUUID()')
    expect(edgeFunction).toContain('worker_id: workerId')
    expect(edgeFunction).toContain("url.searchParams.get('run_id')")
    expect(edgeFunction).toContain('worker_recover_active_authoring_batch')
  })

  it('routes submit/status/release through the exact server-owned claimed_by identity', async () => {
    const edgeFunction = await readFile(
      resolve(root, 'supabase/functions/authoring-bridge/index.ts'),
      'utf8',
    )

    expect(edgeFunction).toContain('const claimedBy = data?.claimed_by')
    expect(edgeFunction).toContain('claimedBy.startsWith(ONLINE_MANUAL_WORKER_PREFIX)')
    expect(edgeFunction).toContain('p_generation_worker_id: route.workerId')
  })
})
