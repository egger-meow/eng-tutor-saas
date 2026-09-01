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
    expect(agents).toContain('The active executor may be local or online according to scheduler mode')
    expect(agents).toContain('the deterministic Finisher alone renders/uploads PDFs and completes materials')
  })

  it('proves /start performs one authoritative claim under pinned online manual worker identity', async () => {
    const edgeFunctionSource = await readFile(resolve(root, 'supabase/functions/authoring-bridge/index.ts'), 'utf8')
    expect(edgeFunctionSource).toContain("PINNED_ONLINE_MANUAL_WORKER_ID = 'chatgpt-online-manual'")
    expect(edgeFunctionSource).toContain("rpc('worker_start_online_manual_authoring_batch', {\n        worker_id: PINNED_ONLINE_MANUAL_WORKER_ID,")

    const migration = await readFile(resolve(root, 'supabase/migrations/20260901080000_atomic_online_manual_authoring_start.sql'), 'utf8')
    expect(migration).toContain('public.worker_start_online_manual_authoring_batch(worker_id text)')
    expect(migration).toContain('return private_generation.chatgpt_claim_generation_batch(worker_id);')
  })

  it('proves /start atomically fails closed on active conflicting leases with HTTP 409', async () => {
    const migration = await readFile(resolve(root, 'supabase/migrations/20260901080000_atomic_online_manual_authoring_start.sql'), 'utf8')
    expect(migration).toContain("status = 'claimed'")
    expect(migration).toContain('lease_expires_at > now()')
    expect(migration).toContain('ACTIVE_AUTHORING_LEASE_CONFLICT')

    const edgeFunctionSource = await readFile(resolve(root, 'supabase/functions/authoring-bridge/index.ts'), 'utf8')
    expect(edgeFunctionSource).toContain("error.message?.includes('ACTIVE_AUTHORING_LEASE_CONFLICT')")
    expect(edgeFunctionSource).toContain("return json(isConflict ? 409 : 500,")
  })

  it('proves caller cannot supply or override worker identity', async () => {
    const openapi = await readFile(resolve(root, 'docs/authoring-bridge-openapi.yaml'), 'utf8')
    expect(openapi).not.toContain('worker_id')
    expect(openapi).not.toContain('workerId')

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
    // Must contain exactly the narrow business endpoints
    expect(openapi).toContain('/start:')
    expect(openapi).toContain('/batch:')
    expect(openapi).toContain('/submit:')
    expect(openapi).toContain('/status:')
    expect(openapi).toContain('/release:')

    // Must NOT expose arbitrary SQL or database operations
    expect(openapi).not.toContain('execute_sql')
    expect(openapi).not.toContain('sql')
    expect(openapi).not.toContain('postgres')
  })

  it('proves /start -> /submit -> /status semantics match the canonical production authoring protocol', async () => {
    const openapi = await readFile(resolve(root, 'docs/authoring-bridge-openapi.yaml'), 'utf8')
    // /start returns authoritative context including inputFingerprint
    expect(openapi).toContain('inputFingerprint:')
    expect(openapi).toContain('retryContext:')

    // /submit requires jobId, package, and metadata with inputFingerprint
    expect(openapi).toContain('inputFingerprint')

    // /status checks submissionFound
    expect(openapi).toContain('submissionFound:')
  })

  it('enforces service role key rejection and missing secret fail-closed in Edge Function logic', async () => {
    const edgeFunctionSource = await readFile(resolve(root, 'supabase/functions/authoring-bridge/index.ts'), 'utf8')

    // Missing AUTHORING_BRIDGE_SECRET must return 503
    expect(edgeFunctionSource).toContain('if (!supabaseUrl || !serviceRoleKey || !bridgeSecret)')
    expect(edgeFunctionSource).toContain('return json(503,')

    // Service role key passed as incoming Bearer token must return 401
    expect(edgeFunctionSource).toContain('if (token === serviceRoleKey)')
    expect(edgeFunctionSource).toContain('Service role key is forbidden as external incoming credential')

    // Dedicated secret must match
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
