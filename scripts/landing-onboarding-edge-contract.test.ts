import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const edgePath = resolve(root, 'supabase/functions/start-landing-onboarding/index.ts')
const config = readFileSync(resolve(root, 'supabase/config.toml'), 'utf8')
const source = existsSync(edgePath) ? readFileSync(edgePath, 'utf8') : ''

describe('start-landing-onboarding Edge Function contract', () => {
  it('is explicitly public while keeping privileged DB operations behind the service client', () => {
    expect(source).not.toBe('')
    expect(config).toMatch(/\[functions\.start-landing-onboarding\]\s+verify_jwt = false/u)
    expect(source).toContain("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')")
    expect(source).toContain("client.rpc('prepare_landing_onboarding'")
    expect(source).toContain("client.rpc('activate_landing_onboarding'")
  })

  it('uses the trusted orchestrator and sends the Magic Link between prepare and activation', () => {
    expect(source).toContain("import { startLandingOnboarding } from '../_shared/landing-onboarding-start.ts'")
    expect(source).toContain('startLandingOnboarding(')
    expect(source).toContain('client.auth.signInWithOtp')
    expect(source).toContain('emailRedirectTo: redirectTo')
    expect(source).toContain('shouldCreateUser: true')
  })

  it('never exposes account classification or child identifiers in the public response', () => {
    expect(source).toContain("return json(200, { accepted: true })")
    expect(source).not.toMatch(/json\(200,[\s\S]*?(accountExisted|account_existed|childId|child_id)/u)
  })

  it('supports browser CORS and rejects non-POST methods', () => {
    expect(source).toContain("request.method === 'OPTIONS'")
    expect(source).toContain("request.method !== 'POST'")
    expect(source).toContain("'cache-control': 'no-store'")
  })
})
