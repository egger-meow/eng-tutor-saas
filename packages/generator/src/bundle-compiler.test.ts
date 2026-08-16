import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { compileProductionBundle, computeFrozen201Hashes, REPO_ROOT } from './bundle-compiler.js'

describe('bundle-compiler', () => {
  it('generates a deterministic production bundle with matching source hashes and no drift', async () => {
    const bundlePath = resolve(REPO_ROOT, 'packages/generator/bundles/production-authoring-bundle.md')
    const existingBundle = await readFile(bundlePath, 'utf8')
    const freshBundle = await compileProductionBundle(REPO_ROOT)

    expect(freshBundle.content.replace(/\r\n/g, '\n')).toBe(existingBundle.replace(/\r\n/g, '\n'))
    expect(freshBundle.metadata.schemaVersion).toBe('2.0.0')
    expect(freshBundle.metadata.promptVersion).toBe('2.1.0')
    expect(freshBundle.metadata.bundleVersion).toBe('2.1.0-prod')
    expect(Object.keys(freshBundle.metadata.sourceHashes).length).toBe(7)
  })

  it('verifies that prompts/2.0.1 baseline remains byte-for-byte frozen', async () => {
    const frozenHashes = await computeFrozen201Hashes(REPO_ROOT)
    expect(frozenHashes).toEqual({
      'packages/generator/prompts/2.0.1/01-plan.md': 'fa9dd2b29bfa54cd8bcfeb4115a463f9dd4065dd842b15aa9982c9bebb02d9a8',
      'packages/generator/prompts/2.0.1/02-author.md': 'ef21353e08423180dcafc5d2bc4e515cdc1935e8ecb4834115a96a2dbf29c847',
      'packages/generator/prompts/2.0.1/03-critic.md': '9dbbc507e862f999e13359ad0f390f07ba2817c60aedf2615560cbfa53a64596',
      'packages/generator/prompts/2.0.1/04-repair.md': '1aaf249579af52e4ce4539311c8409c95086e784aa1aa181b59861001710f4c0',
    })
  })

  it('keeps compiled bundle size within token budget (< 4000 words / ~5000 tokens)', async () => {
    const freshBundle = await compileProductionBundle(REPO_ROOT)
    const wordCount = freshBundle.content.trim().split(/\s+/u).length
    expect(wordCount).toBeLessThan(4000)
  })
})
