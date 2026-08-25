import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  compileProductionBundle,
  computeFrozen201Hashes,
  computeFrozen210Hashes,
  computeFrozen220Hashes,
  computeFrozen230Hashes,
  computeFrozen240Hashes,
  computeFrozen250Hashes,
  computeFrozen260Hashes,
  REPO_ROOT,
} from './bundle-compiler.js'

describe('bundle-compiler', () => {
  it('generates a deterministic production bundle with matching source hashes and no drift', async () => {
    const bundlePath = resolve(REPO_ROOT, 'packages/generator/bundles/production-authoring-bundle.md')
    const existingBundle = await readFile(bundlePath, 'utf8')
    const freshBundle = await compileProductionBundle(REPO_ROOT)

    expect(freshBundle.content.replace(/\r\n/g, '\n')).toBe(existingBundle.replace(/\r\n/g, '\n'))
    expect(freshBundle.metadata.schemaVersion).toBe('2.3.0')
    expect(freshBundle.metadata.promptVersion).toBe('2.7.0')
    expect(freshBundle.metadata.bundleVersion).toBe('2.7.0-prod')
    expect(Object.keys(freshBundle.metadata.sourceHashes).length).toBe(21)
    expect(freshBundle.metadata.sourceHashes).toHaveProperty('packages/generator/quality-profiles/default.md')
    expect(freshBundle.metadata.sourceHashes).toHaveProperty('packages/generator/quality-profiles/gemini-3.7-flash.md')
    expect(freshBundle.content).toContain('Source -> Fact -> Claim')
    expect(freshBundle.content).toContain('studentLesson.reading.blocks.1.text')
    expect(freshBundle.content).toContain('temporalMode')
    expect(freshBundle.content).toContain('There is no N/A mode')
    expect(freshBundle.content).not.toContain('Maintain `schemaVersion: "2.2.0"`')
    expect(freshBundle.content).not.toContain('CurriculumPackageSchema` (2.2.0)')
    expect(freshBundle.content).toContain('Preserve valid research and unaffected authored content')
    expect(freshBundle.content).toContain('Re-research only when the rejection concerns grounding accuracy')
    expect(freshBundle.content).toContain('Never transmit child names, child/job IDs')
    expect(freshBundle.content).toContain('Only the independent critic may add or mark')
    expect(freshBundle.content).not.toContain('Before output, add passed `qualityEvidence.criticalChecks`')
  })

  it('keeps public web research in the scheduled production input contract', async () => {
    const schedule = await readFile(resolve(REPO_ROOT, 'docs/chatgpt-work-daily-schedule.md'), 'utf8')

    expect(schedule).toContain('exactly three authorized production inputs')
    expect(schedule).toContain('3. public web research, used only for privacy-safe, non-private curriculum-topic grounding')
    expect(schedule).not.toContain('exactly two authorized production inputs')
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

  it('verifies that prompts/2.3.0 baseline remains byte-for-byte frozen', async () => {
    const frozenHashes = await computeFrozen230Hashes(REPO_ROOT)
    expect(frozenHashes).toEqual({
      'packages/generator/prompts/2.3.0/01-plan.md': 'ae0be587f56872f21d328105d2af85fb066a4977b38412abefbb7a06e853ed9b',
      'packages/generator/prompts/2.3.0/02-author.md': '9e23182a87c863f8d28ee98b176bb95b5ec67c7c0317952f75fe9236bdf1291a',
      'packages/generator/prompts/2.3.0/03-critic.md': '0aa7812f7cc8d163123cf2b98cb926f151bb22156aab9db7c775011d147638e6',
      'packages/generator/prompts/2.3.0/04-repair.md': 'd3165f6d70dbd12abc9ec08e7f72c811a02ad6324c1dbf25ca086824789dcd28',
    })
  })

  it('verifies that prompts/2.4.0 baseline remains byte-for-byte frozen', async () => {
    expect(await computeFrozen240Hashes(REPO_ROOT)).toEqual({
      'packages/generator/prompts/2.4.0/01-plan.md': '35db191f7e011c54f087114fffa1e9350b3d89b138e499bef45b6e581dbf0853',
      'packages/generator/prompts/2.4.0/02-author.md': '592198831ffbdf16ffbe6708bc11c6df9c571d925299982f81bd452327e68b8a',
      'packages/generator/prompts/2.4.0/03-critic.md': '51061cde89dd0daf38a31602373079dfd642f734572260a4559fb2674f5362d7',
      'packages/generator/prompts/2.4.0/04-repair.md': 'bbc436ce2df940425f1259cb74ec00bd566e5bb7fdd9f68058301cac51a77702',
    })
  })

  it('verifies that prompts/2.5.0 grounding overlay remains byte-for-byte frozen', async () => {
    expect(await computeFrozen250Hashes(REPO_ROOT)).toEqual({
      'packages/generator/prompts/2.5.0/01-plan.md': 'bfad89bdbb0fa64d821cf86a57a606dd12adee2d1508861a7e9abfae85884bc5',
      'packages/generator/prompts/2.5.0/02-author.md': 'fcdfe17881606f4830dbac5d7edd5123dbfd5fda7acdd1518d4b985b89db9822',
      'packages/generator/prompts/2.5.0/03-critic.md': '2b4b8c75ac52548f8e4ad3a1de13370bd9b7f143dbcbcdb26392d768eb210f05',
      'packages/generator/prompts/2.5.0/04-repair.md': 'ca13d399df2438d75af21c2b9dcb3416d386aac64d8cdce725c552571d556d1c',
    })
  })

  it('verifies that prompts/2.6.0 workload overlay remains byte-for-byte frozen', async () => {
    expect(await computeFrozen260Hashes(REPO_ROOT)).toEqual({
      'packages/generator/prompts/2.6.0/01-plan.md': 'a3e75601b5013d7098aa0c9fdcb60cb3e4cee534e3ca2538235315c2433d449a',
      'packages/generator/prompts/2.6.0/02-author.md': '48bddaff5ba7ced05f20c99ba221e728882c86e877ce88608c1f9dbf80183ff7',
      'packages/generator/prompts/2.6.0/03-critic.md': '5519a35438e1b91fc77b4690d3d5362e8687299761f89dbc7dfaecaaf0998db3',
      'packages/generator/prompts/2.6.0/04-repair.md': 'e227397c176db4b05a2b8c48943f1c7210771797c4353df23d85cc1c58baa16f',
    })
  })

  it('keeps compiled bundle size within grounded-production budget (< 8500 words)', async () => {
    const freshBundle = await compileProductionBundle(REPO_ROOT)
    const wordCount = freshBundle.content.trim().split(/\s+/u).length
    expect(wordCount).toBeLessThan(8500)
  })
})
