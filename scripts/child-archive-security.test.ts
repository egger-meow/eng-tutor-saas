import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDir = resolve(import.meta.dirname, '..', 'supabase', 'migrations')
const childArchiveMigrations = readdirSync(migrationsDir)
  .filter((name) => name.includes('child_archive'))
  .sort()
  .map((name) => readFileSync(resolve(migrationsDir, name), 'utf8'))
  .join('\n')

describe('safe parent child archive contract', () => {
  it('soft-archives only an authenticated owned child and never hard-deletes history', () => {
    expect(childArchiveMigrations).toContain('create or replace function public.archive_owned_child(p_child_id uuid)')
    expect(childArchiveMigrations).toContain('parent_id = v_user_id')
    expect(childArchiveMigrations).toContain('is_active = false')
    expect(childArchiveMigrations).not.toContain('delete from public.children')
    expect(childArchiveMigrations).toContain('grant execute on function public.archive_owned_child(uuid) to authenticated, service_role')
    expect(childArchiveMigrations).toContain('revoke all on function public.archive_owned_child(uuid) from public, anon')
  })

  it('blocks live Paddle billing but safely closes beta, waitlist, and unmaterialized generation work', () => {
    expect(childArchiveMigrations).toContain("provider = 'paddle'")
    expect(childArchiveMigrations).toContain("status in ('trialing', 'active', 'past_due', 'paused')")
    expect(childArchiveMigrations).toContain("raise exception '這位孩子目前仍有付費訂閱")
    expect(childArchiveMigrations).toContain("provider = 'beta'")
    expect(childArchiveMigrations).toContain("status = 'canceled'")
    expect(childArchiveMigrations).toContain("update public.waitlist")
    expect(childArchiveMigrations).toContain("update public.generation_jobs")
    expect(childArchiveMigrations).toContain("status in ('pending', 'claimed')")
  })

  it('does not strand checkout reservations when a child is removed during an unfinished checkout', () => {
    expect(childArchiveMigrations).toContain('private_generation.founder_checkout_claims')
    expect(childArchiveMigrations).toContain('private_generation.capacity_checkout_claims')
    expect(childArchiveMigrations).toContain("status in ('bound', 'release_pending')")
    expect(childArchiveMigrations).toContain('尚未完成的結帳')
    expect(childArchiveMigrations).toContain("set status = 'released'")
    expect(childArchiveMigrations).toContain("release_reason = 'superseded'")
  })

  it('prevents archived children from receiving newly queued material email and revokes old scoped links', () => {
    expect(childArchiveMigrations).toContain('perform delivery.id')
    expect(childArchiveMigrations).toContain('from public.material_email_deliveries as delivery')
    expect(childArchiveMigrations).toContain('where delivery.child_id = p_child_id')
    expect(childArchiveMigrations).toContain('for update;')
    expect(childArchiveMigrations).toContain('update public.material_email_deliveries')
    expect(childArchiveMigrations).toContain("status = 'dead'")
    expect(childArchiveMigrations).toContain('access_revoked_at = coalesce(access_revoked_at, now())')
    expect(childArchiveMigrations).toContain('create or replace function public.worker_claim_material_email_deliveries')
    expect(childArchiveMigrations).toContain('join public.children as child on child.id = material.child_id and child.is_active')
    expect(childArchiveMigrations).toContain('join public.children as child on child.id = delivery.child_id and child.is_active')
  })
})
