import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PREVIOUS_AUTHORING_CONTRACT, desiredAuthoringContract, claimAuthoringContract, readClaimAuthoringBundle } from './authoring-claim-contract.js'
import { makeValidV24Package } from './authoring-helpers.test.js'
import { validatePreSubmitPackage } from './authoring-helpers.js'
import { authoringPrompt, validateAuthoredPackage } from './local-codex-authoring.js'
import { buildPacketPlanningPrompt } from './packet-planning.js'

const root = resolve(import.meta.dirname, '../../..')
async function contextFor(previous = false) {
  const contract = previous ? PREVIOUS_AUTHORING_CONTRACT : {
    ...desiredAuthoringContract,
    bundleSha256: createHash('sha256').update(await readFile(resolve(root, 'packages/generator/bundles/production-authoring-bundle.md'))).digest('hex'),
  }
  return { job: { id: '01234567-89ab-cdef-0123-456789abcdef', childId: 'fedcba98-7654-3210-fedc-ba9876543210' },
    inputFingerprint: 'fp-1234567890abcdef', targetReleaseId: contract.releaseId, activeAuthoringContract: { ...contract } }
}
function packageFor(context: Awaited<ReturnType<typeof contextFor>>) {
  const pkg: any = makeValidV24Package(context.job.id, context.job.childId, context.inputFingerprint)
  const contract = context.activeAuthoringContract
  Object.assign(pkg.metadata, contract)
  delete pkg.metadata.bundleVersion
  delete pkg.metadata.bundleSha256
  if (contract.schemaVersion === '2.5.0') {
    const opening = pkg.studentLesson.opening
    pkg.studentLesson.opening = { goalsZh: opening.goalsZh, howToUseZh: opening.howToUseZh, warmUp: '你會如何確認實驗結果？' }
    pkg.studentLesson.instruction = pkg.studentLesson.instruction.map((section: any) => ({
      id: section.id, titleZh: section.titleZh,
      explanationZh: section.blocks.find((block: any) => block.type === 'prose').textZh,
      patterns: ['Does + subject + base verb?'],
      workedExamples: section.blocks.filter((block: any) => block.type === 'worked-example').map(({ type, ...block }: any) => block),
      commonMistakes: section.blocks.filter((block: any) => block.type === 'error-analysis').map(({ type, ...block }: any) => block),
    }))
  }
  return pkg
}
describe('immutable authoring claim contracts across release changes', () => {
  it.each([false, true])('validates and authors the exact bound current/previous contract (previous=%s)', async previous => {
    const context = await contextFor(previous)
    const snapshot = structuredClone(context)
    const pkg = packageFor(context)
    const result = validatePreSubmitPackage(pkg, context)
    expect(result.valid, JSON.stringify(result)).toBe(true)
    expect(validateAuthoredPackage(pkg, context).metadata.schemaVersion).toBe(context.activeAuthoringContract.schemaVersion)
    const bundle = await readClaimAuthoringBundle(root, context)
    expect(bundle).toContain(`promptVersion: "${context.activeAuthoringContract.promptVersion}"`)
    expect(authoringPrompt(bundle, context, 'public grounding')).toContain(`promptVersion to ${context.activeAuthoringContract.promptVersion}`)
    expect(buildPacketPlanningPrompt(context, 'public grounding')).toContain(`Schema ${context.activeAuthoringContract.schemaVersion} / Prompt ${context.activeAuthoringContract.promptVersion}`)
    expect(context).toEqual(snapshot)
  })
  it.each(['schemaVersion', 'promptVersion', 'engineVersion', 'workerVersion', 'rendererVersion'])('rejects mismatched package %s in both actual adapters', async key => {
    const context = await contextFor()
    const pkg = packageFor(context)
    pkg.metadata[key] = '0.0.0'
    expect(validatePreSubmitPackage(pkg, context).valid).toBe(false)
    expect(() => validateAuthoredPackage(pkg, context)).toThrow()
  })
  it('rejects release mismatch, unsupported contracts and tampered bundles', async () => {
    const context = await contextFor(true)
    expect(() => claimAuthoringContract({ ...context, targetReleaseId: 'rel_1.9.0' })).toThrow()
    expect(() => claimAuthoringContract({ ...context, activeAuthoringContract: { ...context.activeAuthoringContract, schemaVersion: '99.0.0' } })).toThrow()
    context.activeAuthoringContract.bundleSha256 = '0'.repeat(64)
    await expect(readClaimAuthoringBundle(root, context)).rejects.toThrow('AUTHORING_BUNDLE_HASH_MISMATCH')
  })
})
