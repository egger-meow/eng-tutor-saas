import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'
import { buildStageAwareAuthoringBundleCandidate } from './bundle-presentation-candidate.js'

const headings = {
  plan: '## 5. Prompt 01: Planning Engine',
  author: '## 6. Prompt 02: Authoring Engine',
  critic: '## 7. Prompt 03: Critic Engine',
  repair: '## 8. Prompt 04: Repair Specialist',
}

it('builds fail-closed author and repair candidates without changing kept bytes', () => {
  const shared = 'RULES AGE LEVEL TIME FEEDBACK INTEREST RESEARCH CAP VARIETY SELF-STUDY\nSCHEMA REQUIRED OPTIONAL ENUM UNION NESTED CONDITIONAL\n'
  const source = `${shared}${headings.plan}\nPLAN_ONLY\n${headings.author}\nAUTHOR_EXACT\n${headings.critic}\nCRITIC_EXACT\n${headings.repair}\nREPAIR_EXACT\n`
  const author = buildStageAwareAuthoringBundleCandidate(source, 'author')
  const repair = buildStageAwareAuthoringBundleCandidate(source, 'repair')

  expect(author.content).toBe(`${shared}${headings.author}\nAUTHOR_EXACT\n${headings.critic}\nCRITIC_EXACT\n`)
  expect(repair.content).toBe(`${shared}${headings.author}\nAUTHOR_EXACT\n${headings.critic}\nCRITIC_EXACT\n${headings.repair}\nREPAIR_EXACT\n`)
  expect(author.omitted.map(({ heading }) => heading)).toEqual([headings.plan, headings.repair])
  expect(repair.omitted.map(({ heading }) => heading)).toEqual([headings.plan])
  expect(source).toContain('PLAN_ONLY')
})

it('preserves the complete shared contract, schema, Author and Critic in the real bundle', async () => {
  const source = await readFile(new URL('../../generator/bundles/production-authoring-bundle.md', import.meta.url), 'utf8')
  for (const mode of ['author', 'repair'] as const) {
    const candidate = buildStageAwareAuthoringBundleCandidate(source, mode)
    for (const evidence of [
      '## 1. Product Rules & Constraints',
      '## 2. Curriculum Quality Rubric',
      '## 2A. CAP Precedent-First Contract',
      '## 4. Curriculum Package Schema',
      headings.author,
      headings.critic,
      'weekly_minutes',
      'artists, groups, works, characters',
      'Source -> Fact -> Claim -> Actual lesson prose',
      'CAP is the quality floor',
      'study independently',
    ]) expect(candidate.content).toContain(evidence)
    expect(candidate.content).not.toContain(headings.plan)
    expect(candidate.content.length).toBeLessThan(source.length)
  }
  expect(buildStageAwareAuthoringBundleCandidate(source, 'author').content).not.toContain(headings.repair)
  expect(buildStageAwareAuthoringBundleCandidate(source, 'repair').content).toContain(headings.repair)
})

it('rejects missing, duplicate, or reordered stage boundaries', () => {
  const valid = `${headings.plan}\n${headings.author}\n${headings.critic}\n${headings.repair}\n`
  expect(() => buildStageAwareAuthoringBundleCandidate(valid.replace(headings.critic, ''), 'author')).toThrow('STAGE_BOUNDARY_INVALID')
  expect(() => buildStageAwareAuthoringBundleCandidate(`${valid}${headings.author}\n`, 'author')).toThrow('STAGE_BOUNDARY_INVALID')
  expect(() => buildStageAwareAuthoringBundleCandidate(`${headings.author}\n${headings.plan}\n${headings.critic}\n${headings.repair}\n`, 'author')).toThrow('STAGE_ORDER_INVALID')
})
