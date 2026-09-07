import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../../..')

async function source(path: string): Promise<string> {
  return readFile(resolve(root, path), 'utf8')
}

describe('Week 1 Fast Publisher fallback contract', () => {
  it('hands an explicit fast-publish failure to the normal Finisher without racing fresh Week 1 work', async () => {
    const migration = await source('supabase/migrations/20260907020000_week1_fast_finisher_fallback.sql')

    expect(migration).toContain("coalesce(submission.error_code, '') = 'WEEK1_FAST_PUBLISH_FAILED'")
    expect(migration).toContain("submission.status = 'technical_failed'")
    expect(migration).toContain("submission.publication_path = 'week1_fast'")
    expect(migration).toContain('job.source_material_id is null')
    expect(migration).toContain('job.source_material_id is not null')
    expect(migration).toContain('job.claimed_by = submission.generation_worker_id')
    expect(migration).toContain("submission.status = 'pending'")
    expect(migration).not.toContain("generation_worker_id = 'chatgpt-week1-fast'")
  })
})
