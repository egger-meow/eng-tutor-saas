import { describe, it, expect, beforeAll } from 'vitest'
import { auditCurriculumPackage } from './audit-curriculum.js'
import { validateCurriculumPackage } from './validate-curriculum-package.js'
import { goldenContextA } from './fixtures/golden-contexts.js'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { REPO_ROOT } from './bundle-compiler.js'

describe('Wave 3 Finisher 3-Tier Classification & Normalization', () => {
  let samplePackage: any

  beforeAll(async () => {
    const raw = await readFile(resolve(REPO_ROOT, 'docs/evaluations/wave-2/case-a/2.1.0-output.json'), 'utf8')
    samplePackage = JSON.parse(raw)
  })

  it('Tier 1 (AUTO-DERIVED): automatically normalizes wordCount without failing validation', () => {
    const mutated = structuredClone(samplePackage)
    // Deliberately set wrong wordCount arithmetic value
    mutated.studentLesson.reading.wordCount = 999

    const result = validateCurriculumPackage(mutated)
    expect(result.success).toBe(true)
    if (result.success) {
      // Expect wordCount to be auto-normalized to actual paragraph word count
      const actualWords = mutated.studentLesson.reading.paragraphs.join(' ').trim().split(/\s+/u).length
      expect(result.curriculumPackage.studentLesson.reading.wordCount).toBe(actualWords)
    }
  })

  it('Tier 2 (STRUCTURAL CRITICAL): fails closed on duplicate question IDs and missing answers', () => {
    const mutated = structuredClone(samplePackage)
    // Duplicate question ID
    mutated.studentLesson.practice[0].questions[1].id = mutated.studentLesson.practice[0].questions[0].id

    const audit = auditCurriculumPackage(mutated)
    expect(audit.passed).toBe(false)
    const structuralFinding = audit.findings.find((f) => f.tier === 'structural-critical')
    expect(structuralFinding).toBeDefined()
    expect(structuralFinding?.message).toContain('Duplicate question ID')
  })

  it('Tier 2 (STRUCTURAL CRITICAL): fails closed on unknown learning target reference', () => {
    const mutated = structuredClone(samplePackage)
    mutated.studentLesson.practice[0].questions[0].targetIds = ['unknown-ghost-target']

    const audit = auditCurriculumPackage(mutated)
    expect(audit.passed).toBe(false)
    const structuralFinding = audit.findings.find((f) => f.tier === 'structural-critical')
    expect(structuralFinding?.message).toContain('Unknown learning target')
  })

  it('Tier 2 (STRUCTURAL CRITICAL): bans fuzzy ID guessing (e.g. q12 vs q21 fails closed)', () => {
    const mutated = structuredClone(samplePackage)
    mutated.studentLesson.practice[0].questions[0].id = 'q12'
    mutated.answers[0].questionId = 'q21'

    const audit = auditCurriculumPackage(mutated)
    expect(audit.passed).toBe(false)
    const missingAnswer = audit.findings.find((f) => f.message.includes('Missing answer for question ID: q12'))
    const orphanAnswer = audit.findings.find((f) => f.message.includes('Answer has no matching question ID: q21'))
    expect(missingAnswer).toBeDefined()
    expect(orphanAnswer).toBeDefined()
  })

  it('Tier 3 (SEMANTIC CRITICAL): fails closed when learning target lacks cross-stage evidence', () => {
    const mutated = structuredClone(samplePackage)
    // Add a new target that appears in only 1 stage
    const singleTargetId = 'target-only-in-one-stage'
    mutated.learningPlan.targets.push({
      id: singleTargetId,
      domain: 'grammar',
      description: 'Single stage target for testing evidence',
      successCriteria: 'Student correctly identifies verb form',
      evidence: [{ source: 'grammar', detail: 'be 動詞單數' }],
    })
    // Add to only 1 question in 1 stage
    mutated.studentLesson.practice[0].questions[0].targetIds.push(singleTargetId)

    const audit = auditCurriculumPackage(mutated)
    expect(audit.passed).toBe(false)
    const semanticFinding = audit.findings.find((f) => f.tier === 'semantic-critical' && f.dimension === 'evidence-plan')
    expect(semanticFinding).toBeDefined()
    expect(semanticFinding?.message).toContain('只在單一階段出現')
  })

  it('Tier 3 (SEMANTIC CRITICAL): fails closed on forbidden internal developer jargon', () => {
    const mutated = structuredClone(samplePackage)
    mutated.parentSummary.personalizationZh = ['本週建立 observable baseline 來確認能力。']

    const audit = auditCurriculumPackage(mutated)
    expect(audit.passed).toBe(false)
    const jargonFinding = audit.findings.find((f) => f.tier === 'semantic-critical' && f.dimension === 'parent-personalization')
    expect(jargonFinding).toBeDefined()
    expect(jargonFinding?.message).toContain('baseline')
  })
})
