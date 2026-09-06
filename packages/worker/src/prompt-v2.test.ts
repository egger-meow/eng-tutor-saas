import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'
import { buildCurriculumPromptBundle } from './prompt-v2.js'

it('uses the exact current production bundle and preserves private claimed context', async () => {
  const canonical = await readFile(new URL('../../generator/bundles/production-authoring-bundle.md', import.meta.url), 'utf8')
  const output = await buildCurriculumPromptBundle({ job: { id: 'job-1', childId: 'child-1', materialWeek: '2026-08-18', ruleVersion: 'curriculum/2.0.0' }, qualityTrends: [] })
  expect(output.startsWith(canonical)).toBe(true)
  expect(output).toContain('child-1')
  expect(output).toContain('does not authorize legacy complete-v2 publication')
  expect(output).not.toContain('Prompt 2.8.0')
})
