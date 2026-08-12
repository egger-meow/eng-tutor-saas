import { describe, expect, it } from 'vitest'
import type { GenerationJob } from './index.js'

describe('generation contract', () => {
  it('keeps idempotency explicit', () => {
    const job: GenerationJob = {
      id: 'job-1',
      childId: 'child-1',
      materialWeek: '2026-W33',
      ruleVersion: 'curriculum-rules/1.0.0',
      idempotencyKey: 'child-1:2026-W33:curriculum-rules/1.0.0',
    }
    expect(job.idempotencyKey).toContain(job.materialWeek)
  })
})
