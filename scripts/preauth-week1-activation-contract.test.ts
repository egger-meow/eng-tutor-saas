import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDir = resolve(import.meta.dirname, '..', 'supabase', 'migrations')
const onboardingSql = readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort()
  .map((name) => readFileSync(resolve(migrationsDir, name), 'utf8'))
  .join('\n')

describe('pre-auth Week 1 activation contract', () => {
  it('stores private pre-auth lifecycle state without exposing account classification', () => {
    expect(onboardingSql).toContain('account_existed_at_prepare')
    expect(onboardingSql).toContain('provisioned_child_id')
    expect(onboardingSql).toContain('preauth_started_at')
    expect(onboardingSql).toContain('anonymous_id')
    expect(onboardingSql).toContain('session_id')
    expect(onboardingSql).toContain('revoke all on table private_generation.pending_onboardings from public, anon, authenticated')
  })

  it('makes prepare and activation service-only and removes browser pending creation', () => {
    expect(onboardingSql).toContain('create or replace function public.prepare_landing_onboarding')
    expect(onboardingSql).toContain('create or replace function public.activate_landing_onboarding')
    expect(onboardingSql).toContain('grant execute on function public.prepare_landing_onboarding')
    expect(onboardingSql).toContain('grant execute on function public.activate_landing_onboarding')
    expect(onboardingSql).toMatch(/grant execute on function public\.prepare_landing_onboarding[\s\S]*?to service_role/u)
    expect(onboardingSql).toMatch(/grant execute on function public\.activate_landing_onboarding[\s\S]*?to service_role/u)
    expect(onboardingSql).not.toContain('grant execute on function public.create_pending_onboarding(text, jsonb, text, text) to anon, authenticated, service_role')
  })

  it('preserves the original account classification across live retry preparation', () => {
    expect(onboardingSql).toContain('account_existed_at_prepare = existing.account_existed_at_prepare')
  })

  it('reuses the canonical child subscription and explicit Week 1 job triggers', () => {
    expect(onboardingSql).toContain('insert into public.children')
    expect(onboardingSql).toContain('update public.child_profiles')
    expect(onboardingSql).not.toMatch(/activate_landing_onboarding[\s\S]*?insert into public\.generation_jobs/u)
    expect(onboardingSql).not.toMatch(/activate_landing_onboarding[\s\S]*?insert into public\.subscriptions/u)
  })

  it('binds an already provisioned child after Magic Link instead of creating it twice', () => {
    expect(onboardingSql).toContain('v_pending.provisioned_child_id is not null')
    expect(onboardingSql).toContain('return v_pending.provisioned_child_id')
    expect(onboardingSql).toContain('Authenticated email does not match onboarding email')
  })

  it('records acquisition events server-side without child-profile PII metadata', () => {
    expect(onboardingSql).toContain("'email_submit'")
    expect(onboardingSql).toContain("'child_created'")
    expect(onboardingSql).toContain("'onboarding_complete'")
    expect(onboardingSql).not.toContain("'child_name'")
  })
})
