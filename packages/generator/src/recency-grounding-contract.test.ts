import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REPO_ROOT } from './bundle-compiler.js'
import { makeGroundedCurriculumPackage, validateCurriculumPackage } from './index.js'
import { validPackage } from './curriculum-package.test.js'
import { upgradeV20ToV21 } from './upgrade-v20-to-v21.js'
import { upgradeV21ToV22 } from './upgrade-v21-to-v22.js'

function groundedPackage() {
  const v21 = upgradeV20ToV21(validPackage())
  const v22 = upgradeV21ToV22(v21)
  return makeGroundedCurriculumPackage(v22, 'technology')
}

async function activeStages() {
  const promptRoot = resolve(REPO_ROOT, 'packages/generator/prompts/2.11.1')
  const [plan, author, critic, repair] = await Promise.all([
    readFile(resolve(promptRoot, '01-plan.md'), 'utf8'),
    readFile(resolve(promptRoot, '02-author.md'), 'utf8'),
    readFile(resolve(promptRoot, '03-critic.md'), 'utf8'),
    readFile(resolve(promptRoot, '04-repair.md'), 'utf8'),
  ])
  return { plan, author, critic, repair }
}

describe('Prompt 2.11.1 consolidated recency-aware grounding behavior', () => {
  it('requires substantive recent discovery and fair preference for a strong current candidate in a fast-moving domain', async () => {
    const { plan, critic } = await activeStages()
    expect(plan).toContain('Classify time sensitivity internally as durable or fast-moving')
    expect(plan).toContain('For a fast-moving domain, actively discover credible recent developments with date-aware research before selection')
    expect(plan).toContain('prefer it over generic evergreen noun-skinning')
    expect(critic).toContain('For a fast-moving domain, require substantive inspection of credible recent developments')
    expect(critic).toContain('Reject generic evergreen noun-skinning when a strong, reliable, teachable current angle served the target equally well or better')
  })

  it('keeps evergreen fallback valid when recent candidates are poor and does not newsify durable topics', async () => {
    const { plan, critic } = await activeStages()
    expect(plan).toContain('Do not force `current`')
    expect(plan).toMatch(/recent candidates are rumor, prediction, weakly sourced, trivial, too complex, unsafe, vocabulary-heavy, factually thin, or pedagogically inferior/)
    expect(critic).toContain('A well-supported evergreen fallback remains valid')
    expect(critic).toContain('reject `current` chosen merely because it is recent')
  })

  it('keeps private learner attributes outside public query construction', async () => {
    const { plan } = await activeStages()
    expect(plan).toContain('Search queries may contain generalized public topic terms only')
    for (const field of ['learner identity', 'IDs', 'school', 'grade/level', 'feedback', 'mistakes', 'history', 'profile prose', 'private notes']) {
      expect(plan).toContain(field)
    }
  })

  it('requires topic-aware publication evidence and rejects rumor or unsupported recency semantically', async () => {
    const { plan, author, critic } = await activeStages()
    expect(plan).toContain('record `researchedAt`')
    expect(plan).toContain('require valid `publishedAt`')
    expect(plan).toContain('distinguish event from publication timing')
    expect(plan).toContain('topic-aware freshness')
    expect(author).toContain('Do not convert forecasts, rumors, social-media claims, or marketing language into stronger facts')
    expect(critic).toContain('any recency claim not supported by its cited source')
    expect(critic).toContain('required-but-undated evidence')
  })

  it('enforces current publication metadata and exact Source -> Fact -> Claim -> prose provenance deterministically', () => {
    const value = groundedPackage()
    value.grounding.temporalMode = 'current'
    expect(validateCurriculumPackage(value).success).toBe(false)

    value.grounding.sources[0]!.publishedAt = '2026-08-23T00:00:00.000Z'
    value.qualityEvidence.criticalChecks.push({
      id: 'grounding-freshness',
      passed: true,
      evidence: 'Independent critic compared event and publication timing and found this source fresh for the presentation.',
    })
    expect(validateCurriculumPackage(value).success).toBe(true)

    value.grounding.claims[0]!.text = 'An unsupported current-event embellishment appears here.'
    const broken = validateCurriculumPackage(value)
    expect(broken.success).toBe(false)
    if (!broken.success) {
      expect(broken.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining('occur exactly') }),
      ]))
    }
  })

  it('limits repair to research and authored fragments that depend on the rejected temporal decision', async () => {
    const { repair } = await activeStages()
    expect(repair).toContain('Repair only the rejected content plus fragments that logically depend on it')
    expect(repair).toContain('Re-research only when the failure concerns grounding accuracy, source adequacy, temporal freshness, or a changed factual dependency')
    expect(repair).toContain('update only the stale/unsupported recency evidence and dependent claims')
    expect(repair).toContain('Preserve immutable prior attempts')
  })
})