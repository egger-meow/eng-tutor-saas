import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Feedback-requested generation context invariant', () => {
  const root = resolve(import.meta.dirname, '../../..')

  it('snapshots the triggering feedback and fails closed on an excluding cutoff', async () => {
    const migration = await readFile(
      resolve(root, 'supabase/migrations/20260919135000_feedback_request_source_context_invariant.sql'),
      'utf8',
    )

    const legacyRequestSchedule =
      "'''pending'', now(), p_material_id, now() + interval ''24 hours'', now() - interval ''24 hours'', now()'"
    const fixedRequestSchedule =
      "'''pending'', now(), p_material_id, now() + interval ''24 hours'', now(), now()'"

    expect(migration).toContain('patched := replace(')
    expect(migration).toContain(legacyRequestSchedule)
    expect(migration).toContain(fixedRequestSchedule)
    expect(migration.indexOf(legacyRequestSchedule)).toBeLessThan(
      migration.indexOf(fixedRequestSchedule),
    )
    expect(migration).toContain('FEEDBACK_REQUEST_SOURCE_FEEDBACK_MISSING')
    expect(migration).toContain('FEEDBACK_REQUEST_SOURCE_FEEDBACK_EXCLUDED')
    expect(migration).toContain('source_feedback_created_at > new.feedback_cutoff_at')
    expect(migration).toContain('set feedback_cutoff_at = feedback.created_at')
    expect(migration).toContain('feedback_missing = false')
    expect(migration).toContain('feedback.created_at > job.feedback_cutoff_at')
  })

  it('preserves the exact legacy schedule for non-request jobs', async () => {
    const migration = await readFile(
      resolve(root, 'supabase/migrations/20260919135000_feedback_request_source_context_invariant.sql'),
      'utf8',
    )

    expect(migration).toContain("idempotency_key not like '%:feedback-next'")
    expect(migration).toContain("feedback_cutoff_at = release_at - interval '48 hours'")
    expect(migration).toContain("generation_due_at = release_at - interval '24 hours'")
  })
})
