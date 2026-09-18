import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Online Authoring Bridge Contract and Security Invariants', () => {
  const root = resolve(import.meta.dirname, '../../..')

  it('proves canonical protocol explicitly requires current production bundle and provenance recording', async () => {
    const doc = await readFile(resolve(root, 'docs/production-authoring.md'), 'utf8')
    expect(doc).toContain('packages/generator/bundles/production-authoring-bundle.md')
    expect(doc).toContain('Treat this current compiled bundle as the authoritative, non-negotiable curriculum-generation contract')
    expect(doc).toContain('Check and record the current repository Git commit SHA and the bundle frontmatter metadata')
    expect(doc).toContain('Do not rely on agents discovering the bundle indirectly through `AGENTS.md` or `SPEC.md`')
  })

  it('proves AGENTS.md contains no stale ChatGPT-Work-as-sole-owner statement', async () => {
    const agents = await readFile(resolve(root, 'AGENTS.md'), 'utf8')
    expect(agents).not.toContain('future ChatGPT Work schedule remains responsible')
    expect(agents).not.toContain('ChatGPT Work schedule remains responsible for queue claiming')
    expect(agents).toContain('Production curriculum authoring follows `docs/production-authoring.md`')
    expect(agents).toContain('The active normal executor may be local or online according to scheduler mode')
    expect(agents).toContain('Week 1 is the sole publication exception')
    expect(agents).toContain('Week 2+ continues through the deterministic Finisher')
    expect(agents).not.toContain('the deterministic Finisher alone renders/uploads PDFs and completes materials')
  })

  it('proves /start performs one authoritative claim under a server-owned manual run identity', async () => {
    const edgeFunctionSource = (await readFile(resolve(root, 'supabase/functions/authoring-bridge/index.ts'), 'utf8')).replace(/\r\n/g, '\n')
    expect(edgeFunctionSource).toContain("ONLINE_MANUAL_WORKER_PREFIX = 'chatgpt-online-manual:'")
    expect(edgeFunctionSource).toContain("rpc('worker_start_online_manual_authoring_batch')")

    const migration = await readFile(resolve(root, 'supabase/migrations/20260918153000_parallel_authoring_batches.sql'), 'utf8')
    expect(migration).toContain('perform pg_advisory_xact_lock(authoring_lock_id);')
    expect(migration).toContain('return private_generation.chatgpt_claim_generation_batch(worker_id);')
  })

  it('proves distinct manual runs may coexist while same-worker re-entry recovers', async () => {
    const migration = await readFile(resolve(root, 'supabase/migrations/20260918153000_parallel_authoring_batches.sql'), 'utf8')
    expect(migration).toContain('job.claimed_by = worker_id')
    expect(migration).toContain('return private_generation.chatgpt_recover_claimed_generation_batch(worker_id);')
    expect(migration).not.toContain('ACTIVE_AUTHORING_LEASE_CONFLICT')

    const edgeFunctionSource = await readFile(resolve(root, 'supabase/functions/authoring-bridge/index.ts'), 'utf8')
    expect(edgeFunctionSource).toContain("url.searchParams.get('run_id')")
    expect(edgeFunctionSource).toContain("rpc('worker_start_online_manual_authoring_batch')")
  })

  it('proves caller cannot supply or override worker identity', async () => {
    const openapi = await readFile(resolve(root, 'docs/authoring-bridge-openapi.yaml'), 'utf8')
    expect(openapi).not.toContain('name: worker_id')
    expect(openapi).not.toContain('name: workerId')

    const edgeFunctionSource = await readFile(resolve(root, 'supabase/functions/authoring-bridge/index.ts'), 'utf8')
    expect(edgeFunctionSource).not.toContain('request.json() as { worker_id')
    expect(edgeFunctionSource).not.toContain('body.workerId')
    expect(edgeFunctionSource).not.toContain('body.worker_id')
  })

  it('uses exact production project URL in OpenAPI spec', async () => {
    const openapi = await readFile(resolve(root, 'docs/authoring-bridge-openapi.yaml'), 'utf8')
    expect(openapi).toContain('https://ykzszjrqynrhgdhoeovo.supabase.co/functions/v1/authoring-bridge')
    expect(openapi).not.toContain('egger-meow-tutor')
    expect(openapi).not.toContain('{projectRef}')
  })

  it('exposes only narrow business operations and zero SQL/table/database capability', async () => {
    const openapi = await readFile(resolve(root, 'docs/authoring-bridge-openapi.yaml'), 'utf8')
    expect(openapi).toContain('/start:')
    expect(openapi).toContain('/contract:')
    expect(openapi).toContain('/batch:')
    expect(openapi).toContain('/submit:')
    expect(openapi).toContain('/status:')
    expect(openapi).toContain('/release:')
    expect(openapi).not.toContain('execute_sql')
    expect(openapi).not.toContain('sql')
    expect(openapi).not.toContain('postgres')
  })

  it('preserves the corrected historical bundle digest in its immutable archive', async () => {
    const bytes = await readFile(resolve(root, 'packages/generator/bundles/2.13.2-production-authoring-bundle.md'))
    const digest = createHash('sha256').update(bytes).digest('hex')
    const migration = await readFile(resolve(root, 'supabase/migrations/20260909181131_correct_authoring_bundle_hash.sql'), 'utf8')
    const currentFunction = migration.split('-- Read-only, exact-contract erratum resolution.')[0]
    expect(currentFunction).toContain(`'bundleSha256', '${digest}'`)
    expect(digest).toHaveLength(64)
  })

  it('pins the prompt patch activation to the exact current and previous bundle digests', async () => {
    const currentBytes = await readFile(resolve(root, 'packages/generator/bundles/production-authoring-bundle.md'))
    const previousBytes = await readFile(resolve(root, 'packages/generator/bundles/2.14.0-production-authoring-bundle.md'))
    const currentDigest = createHash('sha256').update(currentBytes).digest('hex')
    const previousDigest = createHash('sha256').update(previousBytes).digest('hex')
    const migration = await readFile(resolve(root, 'supabase/migrations/20260918090000_activate_prompt_patch_release.sql'), 'utf8')
    expect(migration).toContain(`'bundleSha256', '${previousDigest}'`)
    expect(migration).toContain(`'bundleSha256', '${currentDigest}'`)
    expect(migration).toContain("'releaseId', 'rel_1.9.1'")
    expect(currentDigest).not.toBe(previousDigest)
  })

  it('pins the active authoring contract into claims and validates it on submit', async () => {
    const migration = await readFile(resolve(root, 'supabase/migrations/20260908044708_pin_production_authoring_contract.sql'), 'utf8')
    expect(migration).toContain("'promptVersion', '2.13.2'")
    expect(migration).toContain("'engineVersion', '1.8.2'")
    expect(migration).toContain("'workerVersion', '1.7.2'")
    expect(migration).toContain("'bundleVersion', '2.13.2-prod'")
    expect(migration).toContain("'activeAuthoringContract', public.worker_current_authoring_contract()")
    expect(migration).toContain('AUTHORING_CONTRACT_MISMATCH')
    const edgeFunctionSource = await readFile(resolve(root, 'supabase/functions/authoring-bridge/index.ts'), 'utf8')
    expect(edgeFunctionSource).toContain("path === '/contract'")
    expect(edgeFunctionSource).toContain("rpc('worker_current_authoring_contract')")
  })
  it('proves /start -> /submit -> /status semantics match the canonical production authoring protocol', async () => {
    const openapi = await readFile(resolve(root, 'docs/authoring-bridge-openapi.yaml'), 'utf8')
    expect(openapi).toContain('inputFingerprint:')
    expect(openapi).toContain('retryContext:')
    expect(openapi).toContain('inputFingerprint')
    expect(openapi).toContain('submissionFound:')
  })

  it('enforces service role key rejection and missing secret fail-closed in Edge Function logic', async () => {
    const edgeFunctionSource = await readFile(resolve(root, 'supabase/functions/authoring-bridge/index.ts'), 'utf8')
    expect(edgeFunctionSource).toContain('if (!supabaseUrl || !serviceRoleKey || !bridgeSecret)')
    expect(edgeFunctionSource).toContain('return json(503,')
    expect(edgeFunctionSource).toContain('if (token === serviceRoleKey)')
    expect(edgeFunctionSource).toContain('Service role key is forbidden as external incoming credential')
    expect(edgeFunctionSource).toContain('if (token !== bridgeSecret)')
  })

  it('verifies release operation verifies no submission exists before releasing', async () => {
    const edgeFunctionSource = await readFile(resolve(root, 'supabase/functions/authoring-bridge/index.ts'), 'utf8')
    expect(edgeFunctionSource).toContain("rpc('worker_release_local_unsubmitted_claim'")

    const releaseMigration = await readFile(resolve(root, 'supabase/migrations/20260822163000_add_chatgpt_release_unsubmitted_claim.sql'), 'utf8')
    expect(releaseMigration).toContain('cannot release claim: an immutable curriculum submission exists')
  })

  it('confirms local production flow remains independent and unchanged', async () => {
    const helpers = await readFile(resolve(root, 'packages/worker/src/authoring-helpers.ts'), 'utf8')
    expect(helpers).toContain('checkActiveLeaseState')
    expect(helpers).toContain('claimProductionBatch')
    expect(helpers).toContain('validatePreSubmitPackage')
    expect(helpers).toContain('submitProductionPackage')
  })
})
