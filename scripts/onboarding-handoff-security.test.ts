import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(import.meta.dirname, '..', 'supabase', 'migrations', '20260902021500_landing_first_onboarding_handoff.sql'),
  'utf8',
)

describe('landing-first onboarding handoff security contract', () => {
  it('keeps pre-auth child data private and exposes only reviewed RPCs', () => {
    expect(migration).toContain('create table if not exists private_generation.pending_onboardings')
    expect(migration).toContain('revoke all on table private_generation.pending_onboardings from public, anon, authenticated')
    expect(migration).toContain('grant execute on function public.create_pending_onboarding(text, jsonb, text, text) to anon, authenticated, service_role')
    expect(migration).toContain('revoke all on function public.finalize_pending_onboarding(text) from public, anon')
    expect(migration).toContain('grant execute on function public.finalize_pending_onboarding(text) to authenticated, service_role')
  })

  it('stores only a token hash and binds finalization to the authenticated email', () => {
    expect(migration).toContain("extensions.digest(v_token, 'sha256')")
    expect(migration).not.toMatch(/insert into private_generation\.pending_onboardings[\s\S]*?\bv_token\s*,/u)
    expect(migration).toContain('if v_pending.normalized_email <> v_auth_email then')
    expect(migration).toContain("raise exception 'Authenticated email does not match onboarding email'")
    expect(migration).toContain('if v_pending.expires_at < now() then')
  })

  it('finalizes idempotently into the existing child/profile pipeline', () => {
    expect(migration).toContain('if v_pending.consumed_by = v_user_id and v_pending.child_id is not null then')
    expect(migration).toContain('return v_pending.child_id')
    expect(migration).toContain('insert into public.children')
    expect(migration).toContain('update public.child_profiles')
    expect(migration).toContain('consumed_by = v_user_id')
  })

  it('scrubs the pre-auth email and child draft immediately after successful binding', () => {
    expect(migration).toContain("normalized_email = 'consumed:' || v_pending.id::text")
    expect(migration).toContain("draft = '{}'::jsonb")
    expect(migration).not.toContain("consumed_at is not null and consumed_at < now() - interval '1 day'")
  })
})
