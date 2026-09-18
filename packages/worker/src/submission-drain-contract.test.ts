import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../../..')

async function source(path: string): Promise<string> {
  return readFile(resolve(root, path), 'utf8')
}

describe('Finisher drain contract', () => {
  it('drains bounded batches in one workflow run', async () => {
    const workflow = await source('.github/workflows/finish-curriculum-submissions.yml')
    expect(workflow).toContain('process-submissions --processor github-actions-finisher --limit 15 --drain')
    expect(workflow).toContain('timeout-minutes: 180')
  })

  it('does not immediately reclaim a technical failure in the same drain run', async () => {
    const migration = await source('supabase/migrations/20260918160000_drain_finisher_queue.sql')
    expect(migration).toContain("submission.status = 'technical_failed'")
    expect(migration).toContain("submission.processor_id is distinct from $1")
    expect(migration).toContain('for update of submission skip locked')
  })
})
