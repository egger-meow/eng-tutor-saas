import { describe, expect, it } from 'vitest'
import { buildCurriculumPromptBundle } from './prompt-v2.js'

describe('v2 prompt bundle', () => {
  it('includes the claimed child context and every staged prompt', async () => {
    const bundle = await buildCurriculumPromptBundle({ job: { id: 'job-1', childId: 'child-1', materialWeek: '2026-08-18', ruleVersion: 'curriculum/2.0.0' }, qualityTrends: [] })
    expect(bundle).toContain('child-1')
    expect(bundle).toContain('01-plan.md')
    expect(bundle).toContain('02-author.md')
    expect(bundle).toContain('03-critic.md')
    expect(bundle).toContain('04-repair.md')
    expect(bundle).toContain('complete-v2')
    expect(bundle).toContain('Curriculum Schema 2.3.0')
    expect(bundle).toContain('There is no N/A mode')
    expect(bundle).toContain('generalized public topic terms only')
  })
})
