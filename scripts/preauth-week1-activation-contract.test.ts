import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDir = resolve(import.meta.dirname, '..', 'supabase', 'migrations')
const migrationNames = readdirSync(migrationsDir)
  .filter((name) => name.includes('preauth_week1_activation') && name.endsWith('.sql'))
  .sort()
const migrationSql = migrationNames.map((name) => readFileSync(resolve(migrationsDir, name), 'utf8')).join('\n')

function functionBody(functionName: string): string {
  const marker = `create or replace function ${functionName}`
  const start = migrationSql.indexOf(marker)
  if (start < 0) return ''
  const bodyStart = migrationSql.indexOf('as $$', start)
  if (bodyStart < 0) return ''
  const end = migrationSql.indexOf('\n$$;', bodyStart)
  return end < 0 ? migrationSql.slice(bodyStart) : migrationSql.slice(bodyStart, end)
}

describe('pre-auth Week 1 activation contract', () => {
  it('stores private pre-auth lifecycle state without exposing account classification', () => {
    expect(migrationNames.length).toBeGreaterThan(0)
    expect(migrationSql).toContain('account_existed_at_prepare')
    expect(migrationSql).toContain('provisioned_child_id')
    expect(migrationSql).toContain('preauth_started_at')
    expect(migrationSql).toContain('anonymous_id')
    expect(migrationSql).toContain('session_id')
    expect(migrationSql).toContain('revoke all on table private_generation.pending_onboardings from public, anon, authenticated')
  })

  it('makes prepare and activation service-only and retires browser pending creation', () => {
    expect(migrationSql).toContain('create or replace function public.prepare_landing_onboarding')
    expect(migrationSql).toContain('create or replace function public.activate_landing_onboarding')
    expect(migrationSql).toMatch(/revoke all on function public\.create_pending_onboarding\(text, jsonb, text, text\)\s+from public, anon, authenticated/u)
    expect(migrationSql).toMatch(/grant execute on function public\.prepare_landing_onboarding[\s\S]*?to service_role/u)
    expect(migrationSql).toMatch(/grant execute on function public\.activate_landing_onboarding[\s\S]*?to service_role/u)
  })

  it('preserves the original account classification across live retry preparation', () => {
    expect(migrationSql).toMatch(/account_existed_at_prepare\s*=\s*(?:existing|private_generation\.pending_onboardings)\.account_existed_at_prepare/u)
  })

  it('reuses the canonical child subscription and explicit Week 1 job triggers', () => {
    const activationBody = functionBody('public.activate_landing_onboarding')
    expect(activationBody).toContain('insert into public.children')
    expect(activationBody).toContain('update public.child_profiles')
    expect(activationBody).not.toContain('insert into public.generation_jobs')
    expect(activationBody).not.toContain('insert into public.subscriptions')
  })

  it('binds an already provisioned child after Magic Link instead of creating it twice', () => {
    const finalizeBody = functionBody('public.finalize_pending_onboarding')
    expect(finalizeBody).toContain('v_pending.provisioned_child_id is not null')
    expect(finalizeBody).toContain('return v_pending.provisioned_child_id')
    expect(finalizeBody).toContain('Authenticated email does not match onboarding email')
  })

  it('records acquisition events server-side without child-profile PII metadata', () => {
    const activationBody = functionBody('public.activate_landing_onboarding')
    expect(activationBody).toContain("'email_submit'")
    expect(activationBody).toContain("'child_created'")
    expect(activationBody).toContain("'onboarding_complete'")
    expect(activationBody).not.toContain("'child_name'")
  })
})
