import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'
import { buildCurriculumPromptBundle } from './prompt-v2.js'
import { restoreModelContext } from './model-context.js'

it('makes duplicate context resolvable in the manual adapter without changing the claim', async () => {
  const evidence = { uniqueQualifier: 'Synthetic original evidence with a condition and uncertainty. '.repeat(12) }
  const context = { job: { id: 'synthetic', childId: 'synthetic', materialWeek: '2026-09-18', ruleVersion: 'curriculum/2.0.0' }, learningMemory: evidence, unknownEvidence: evidence }
  const snapshot = JSON.stringify(context)
  const prompt = await buildCurriculumPromptBundle(context)
  const section = prompt.split('## Private claimed context\n\n')[1].split('\n\nComplete research')[0]
  expect(section).toContain('Context encoding:')
  expect(restoreModelContext(section.slice(section.indexOf('\n') + 1))).toEqual(context)
  expect(JSON.stringify(context)).toBe(snapshot)
})

it('uses the exact current production bundle and preserves private claimed context', async () => {
  const canonical = await readFile(new URL('../../generator/bundles/production-authoring-bundle.md', import.meta.url), 'utf8')
  const output = await buildCurriculumPromptBundle({ job: { id: 'job-1', childId: 'child-1', materialWeek: '2026-08-18', ruleVersion: 'curriculum/2.0.0' }, qualityTrends: [] })
  expect(output.startsWith(canonical)).toBe(true)
  expect(output).toContain('child-1')
  expect(output).toContain('does not authorize legacy complete-v2 publication')
  expect(output).not.toContain('Prompt 2.8.0')
})


it.each([
  ['PREVIOUS_AUTHORING_CONTRACT', '../../generator/bundles/2.14.0-production-authoring-bundle.md'],
  ['LEGACY_AUTHORING_CONTRACT', '../../generator/bundles/2.13.2-production-authoring-bundle.md'],
] as const)('keeps an in-flight %s claim on its frozen bundle after the desired release changes', async (contractName, bundlePath) => {
  const contracts = await import('./authoring-claim-contract.js')
  const contract = contracts[contractName]
  const canonical = await readFile(new URL(bundlePath, import.meta.url), 'utf8')
  const context = {
    job: { id: 'old-job', childId: 'child-1', materialWeek: '2026-09-10', ruleVersion: 'curriculum/2.0.0' },
    targetReleaseId: contract.releaseId,
    activeAuthoringContract: { ...contract },
  }
  const snapshot = structuredClone(context)
  expect((await buildCurriculumPromptBundle(context)).startsWith(canonical)).toBe(true)
  expect(context).toEqual(snapshot)
  await expect(buildCurriculumPromptBundle({ ...context,
    activeAuthoringContract: { ...context.activeAuthoringContract, bundleSha256: '0'.repeat(64) },
  })).rejects.toThrow('AUTHORING_BUNDLE_HASH_MISMATCH')
})
