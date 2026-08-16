import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { compileProductionBundle, REPO_ROOT } from './bundle-compiler.js'

describe('bundle-compiler', () => {
  it('generates a deterministic production bundle with matching source hashes and no drift', async () => {
    const bundlePath = resolve(REPO_ROOT, 'packages/generator/bundles/production-authoring-bundle.md')
    const existingBundle = await readFile(bundlePath, 'utf8')
    const freshBundle = await compileProductionBundle(REPO_ROOT)

    expect(freshBundle.content.replace(/\r\n/g, '\n')).toBe(existingBundle.replace(/\r\n/g, '\n'))
    expect(freshBundle.metadata.schemaVersion).toBe('2.0.0')
    expect(freshBundle.metadata.promptVersion).toBe('2.0.1')
    expect(Object.keys(freshBundle.metadata.sourceHashes).length).toBe(7)
  })

  it('keeps compiled bundle size within token budget (< 4000 words / ~5000 tokens)', async () => {
    const freshBundle = await compileProductionBundle(REPO_ROOT)
    const wordCount = freshBundle.content.trim().split(/\s+/u).length
    expect(wordCount).toBeLessThan(4000)
  })
})
