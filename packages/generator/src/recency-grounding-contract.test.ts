import { describe, expect, it } from 'vitest'
import { compileProductionBundle, REPO_ROOT } from './bundle-compiler.js'
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
  const { content } = await compileProductionBundle(REPO_ROOT)
  const planStart = content.indexOf('# Prompt 01 Overlay: Recency-Aware Grounded Planning')
  const authorStart = content.indexOf('# Prompt 02 Overlay: Current-Event Educational Synthesis')
  const criticStart = content.indexOf('# Prompt 03 Overlay: Recency-Aware Grounding Critic')
  const repairStart = content.indexOf('# Prompt 04 Overlay: Recency-Aware Targeted Repair')
  return {
    plan: content.slice(planStart, authorStart),
    author: content.slice(authorStart, criticStart),
    critic: content.slice(criticStart, repairStart),
    repair: content.slice(repairStart),
  }
}

describe('Prompt 2.8.0 recency-aware grounding behavior', () => {
  it('requires discovery and fair preference for a strong current candidate in a fast-moving domain', async () => {
    const { plan, critic } = await activeStages()
    expect(plan).toMatch(/fast-moving[\s\S]*actively discover recent real-world developments/)
    expect(plan).toMatch(/compare candidates by learning-target fit[\s\S]*source reliability[\s\S]*lexical feasibility[\s\S]*freshness/)
    expect(plan).toMatch(/recent development serves the target equally well or better, prefer it/)
    expect(critic).toMatch(/generic evergreen noun-skinning[\s\S]*strong, reliable, teachable current angle was available/)
  })

  it('keeps evergreen fallback valid when recent candidates are poor and does not newsify durable topics', async () => {
    const { plan, critic } = await activeStages()
    expect(plan).toMatch(/durable \/ primarily evergreen[\s\S]*recent events are unlikely to materially improve/)
    expect(plan).toMatch(/Do not force `current`[\s\S]*rumor[\s\S]*weakly sourced[\s\S]*too complex[\s\S]*pedagogically inferior/)
    expect(critic).toMatch(/Do not require `current`[\s\S]*well-explained evergreen fallback passes/)
    expect(critic).toMatch(/current event selected merely because it is recent[\s\S]*pedagogically stronger/)
  })

  it('keeps every private learner attribute outside public query construction', async () => {
    const { plan } = await activeStages()
    const forbidden = ['child or parent names', 'child IDs', 'job IDs', 'school', 'grade', 'English level', 'textbook state', 'feedback', 'mistakes', 'learning history', 'profile prose', 'private context notes']
    expect(plan).toContain('Search executors receive generalized public topic terms only')
    for (const field of forbidden) expect(plan).toContain(field)
    expect(plan).toContain('never query construction')
  })

  it('requires topic-aware publication evidence and rejects rumor or unsupported recency semantically', async () => {
    const { plan, author, critic } = await activeStages()
    expect(plan).toMatch(/set `temporalMode: current`[\s\S]*record `researchedAt`[\s\S]*require valid `publishedAt`/)
    expect(plan).toContain('Freshness is topic-aware, not one universal day cutoff')
    expect(author).toMatch(/forecasts, rumors, marketing language, or social-media claims into facts/)
    expect(critic).toMatch(/each recency claim is actually supported by its cited source/)
    expect(critic).toMatch(/Pass `grounding-freshness` only after recording substantive evidence/)
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

  it('limits repair to research and prose fragments that depend on the rejected temporal decision', async () => {
    const { repair } = await activeStages()
    expect(repair).toMatch(/re-open only the dependent research decision, grounding facts\/claims, and authored prose fragments/)
    expect(repair).toMatch(/Preserve valid research, valid unrelated lesson sections, immutable previous attempts, retry semantics/)
    expect(repair).toMatch(/does not claim, submit, render, upload, complete, or mutate technical job state/)
  })
})