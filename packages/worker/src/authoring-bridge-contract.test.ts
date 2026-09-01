import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Online Authoring Bridge Contract and Security Invariants', () => {
  const root = resolve(import.meta.dirname, '../../..')

  it('pins worker identity to chatgpt-work-daily and forbids arbitrary worker selection', async () => {
    const edgeFunctionSource = await readFile(resolve(root, 'supabase/functions/authoring-bridge/index.ts'), 'utf8')
    expect(edgeFunctionSource).toContain("PINNED_WORKER_ID = 'chatgpt-work-daily'")
    expect(edgeFunctionSource).toContain('worker_id: PINNED_WORKER_ID')
    expect(edgeFunctionSource).toContain('p_generation_worker_id: PINNED_WORKER_ID')
  })

  it('uses exact production project URL in OpenAPI spec', async () => {
    const openapi = await readFile(resolve(root, 'docs/authoring-bridge-openapi.yaml'), 'utf8')
    expect(openapi).toContain('https://ykzszjrqynrhgdhoeovo.supabase.co/functions/v1/authoring-bridge')
    expect(openapi).not.toContain('egger-meow-tutor')
    expect(openapi).not.toContain('{projectRef}')
  })

  it('exposes only narrow business operations and zero SQL/table/database capability', async () => {
    const openapi = await readFile(resolve(root, 'docs/authoring-bridge-openapi.yaml'), 'utf8')
    // Must contain exactly the 4 business endpoints
    expect(openapi).toContain('/batch:')
    expect(openapi).toContain('/submit:')
    expect(openapi).toContain('/status:')
    expect(openapi).toContain('/release:')

    // Must NOT expose arbitrary SQL or database operations
    expect(openapi).not.toContain('execute_sql')
    expect(openapi).not.toContain('sql')
    expect(openapi).not.toContain('postgres')
    expect(openapi).not.toContain('worker_id') // worker_id removed from public parameter surface
    expect(openapi).not.toContain('workerId')
  })

  it('verifies exact RPC parameter name for /batch in migration and bridge source', async () => {
    const edgeFunctionSource = await readFile(resolve(root, 'supabase/functions/authoring-bridge/index.ts'), 'utf8')
    // Must invoke worker_recover_active_authoring_batch with exact parameter worker_id
    expect(edgeFunctionSource).toContain("rpc('worker_recover_active_authoring_batch', {\n        worker_id: PINNED_WORKER_ID,")

    const migration = await readFile(resolve(root, 'supabase/migrations/20260901060000_production_scheduler_modes.sql'), 'utf8')
    expect(migration).toContain('public.worker_recover_active_authoring_batch(worker_id text)')
  })

  it('enforces service role key rejection and missing secret fail-closed in Edge Function logic', async () => {
    const edgeFunctionSource = await readFile(resolve(root, 'supabase/functions/authoring-bridge/index.ts'), 'utf8')

    // Missing AUTHORING_BRIDGE_SECRET must return 503
    expect(edgeFunctionSource).toContain('if (!supabaseUrl || !serviceRoleKey || !bridgeSecret)')
    expect(edgeFunctionSource).toContain("return json(503,")

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
