import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  compileProductionBundle,
  computeFrozen201Hashes,
  computeFrozen210Hashes,
  computeFrozen220Hashes,
  REPO_ROOT,
} from './bundle-compiler.js'

describe('bundle-compiler', () => {
  it('generates a deterministic production bundle with matching source hashes and no drift', async () => {
    const bundlePath = resolve(REPO_ROOT, 'packages/generator/bundles/production-authoring-bundle.md')
    const existingBundle = await readFile(bundlePath, 'utf8')
    const freshBundle = await compileProductionBundle(REPO_ROOT)

    expect(freshBundle.content.replace(/\r\n/g, '\n')).toBe(existingBundle.replace(/\r\n/g, '\n'))
    expect(freshBundle.metadata.schemaVersion).toBe('2.1.0')
    expect(freshBundle.metadata.promptVersion).toBe('2.3.0')
    expect(freshBundle.metadata.bundleVersion).toBe('2.3.0-prod')
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

  it('verifies that prompts/2.1.0 baseline remains byte-for-byte frozen', async () => {
    const frozenHashes = await computeFrozen210Hashes(REPO_ROOT)
    expect(frozenHashes).toEqual({
      'packages/generator/prompts/2.1.0/01-plan.md': 'e82f88755f5b876480113f90c6ead823dc6ba7a950fc2ca238041ef24478bdf0',
      'packages/generator/prompts/2.1.0/02-author.md': 'f45d4301456f1a467ffad74627511da304ed4aa2781bc4eee338736fc19fc878',
      'packages/generator/prompts/2.1.0/03-critic.md': '56c0df7b3ccb82290202135c4c6bbd2acfdbb890fd3b31ae768babff259cac39',
      'packages/generator/prompts/2.1.0/04-repair.md': 'e32889d085e1c7c87fed7b7f1ff415b84f63da97de363bd86598a152d0878e5f',
    })
  })

  it('verifies that prompts/2.2.0 baseline remains byte-for-byte frozen', async () => {
    const frozenHashes = await computeFrozen220Hashes(REPO_ROOT)
    expect(frozenHashes).toEqual({
      'packages/generator/prompts/2.2.0/01-plan.md': '16f6f55b7380c45bfc8ffdad0c7077697aff55cb6dc6df1ba3cda3dd90d93144',
      'packages/generator/prompts/2.2.0/02-author.md': '8c0e5f1ecedc8b46d400ab722e1fa260dacf67b3c7f2d67939cc59e5d711c839',
      'packages/generator/prompts/2.2.0/03-critic.md': '84012691fb93653988582e14f410aa533eb123196bcd818e4cca01814c0ad88b',
      'packages/generator/prompts/2.2.0/04-repair.md': 'e32889d085e1c7c87fed7b7f1ff415b84f63da97de363bd86598a152d0878e5f',
    })
  })

  it('keeps compiled bundle size within token budget (< 4000 words / ~5000 tokens)', async () => {
    const freshBundle = await compileProductionBundle(REPO_ROOT)
    const wordCount = freshBundle.content.trim().split(/\s+/u).length
    expect(wordCount).toBeLessThan(4000)
  })
})
