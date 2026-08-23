import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const edgeFunction = readFileSync(new URL('../supabase/functions/material-access/index.ts', import.meta.url), 'utf8')
const hardeningMigration = readFileSync(new URL('../supabase/migrations/20260823144147_harden_material_email_delivery.sql', import.meta.url), 'utf8')

describe('scoped material access hardening', () => {
  it('mints only short-lived 30-minute private PDF URLs', () => {
    expect(edgeFunction).toContain('const PDF_SIGNED_URL_TTL_SECONDS = 30 * 60')
    expect(edgeFunction.match(/createSignedUrl\([^\n]+PDF_SIGNED_URL_TTL_SECONDS/g)).toHaveLength(2)
    expect(edgeFunction).not.toContain('getPublicUrl')
  })

  it('does not couple provisioned token authorization to sent_at', () => {
    const resolverBody = hardeningMigration.slice(hardeningMigration.indexOf('create or replace function public.resolve_material_email_access'))
    expect(resolverBody).not.toMatch(/delivery\.sent_at\s+is\s+not\s+null/i)
    expect(resolverBody).toContain("job.status = 'completed'")
    expect(resolverBody).toContain('job.release_at <= now()')
    expect(resolverBody).toContain('delivery.access_revoked_at is null')
    expect(resolverBody).toContain('delivery.access_expires_at > now()')
  })

  it('suppresses automatic resend after an abandoned SMTP send-start', () => {
    expect(hardeningMigration).toContain("status = 'dead'")
    expect(hardeningMigration).toContain('send_started_at is not null')
    expect(hardeningMigration).toContain('delivery.send_started_at is null')
    expect(hardeningMigration).toContain('send_started_at = null')
  })
})
