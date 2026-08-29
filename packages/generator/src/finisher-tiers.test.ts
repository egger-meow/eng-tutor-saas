import { describe, it, expect, beforeAll } from 'vitest'
import { auditCurriculumPackage } from './audit-curriculum.js'
import { validateCurriculumPackage } from './validate-curriculum-package.js'
import { goldenContextA } from './fixtures/golden-contexts.js'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { REPO_ROOT } from './bundle-compiler.js'
import { validPackage } from './curriculum-package.test.js'
import { upgradeV20ToV21 } from './upgrade-v20-to-v21.js'
import { upgradeV21ToV22 } from './upgrade-v21-to-v22.js'

function canonicalPackage(): any {
  const v20 = validPackage()
  const v21 = upgradeV20ToV21(v20 as any)
  const v22 = upgradeV21ToV22(v21)
  delete (v22.studentLesson.reading as any).paragraphs
  return v22
}

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

  it('Tier 3 (SEMANTIC CRITICAL): fails closed when a major target lacks post-guided evidence', () => {
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
    expect(semanticFinding?.message).toContain('主要學習目標')
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

  it('Tier 3 (SEMANTIC CRITICAL): fails closed when dialogue genre lacks dialogue blocks', () => {
    const mutated = structuredClone(samplePackage)
    mutated.metadata.schemaVersion = '2.1.0'
    delete mutated.studentLesson.reading.paragraphs
    mutated.studentLesson.reading.genre = 'dialogue'
    // Contains only paragraph blocks with >= 120 words
    mutated.studentLesson.reading.blocks = [
      { type: 'paragraph', text: 'Mina joins a school robotics club because she wants to build a machine that can sort library books quickly without human assistance.' },
      { type: 'paragraph', text: 'Her partner Jay suggests changing every single sensor before the final competition tomorrow morning so that we do not encounter unexpected recognition errors.' },
      { type: 'paragraph', text: 'Mina disagrees with this suggestion. She believes that changing only one component at a time will provide clear evidence about which part is causing the problem.' },
      { type: 'paragraph', text: 'The teacher comes by to inspect their progress and agrees with Mina. Testing one variable under controlled conditions is the foundation of scientific inquiry.' },
      { type: 'paragraph', text: 'Jay agrees to record baseline readings for the optical camera sensor while Mina connects the power cables and adjusts the light source.' },
      { type: 'paragraph', text: 'By following this systematic procedure, both teammates successfully fixed the optical recognition error and prepared the sorting robot for the science competition.' },
    ]

    const audit = auditCurriculumPackage(mutated)
    expect(audit.passed).toBe(false)
    const genreFinding = audit.findings.find((f) => f.tier === 'semantic-critical' && f.dimension === 'alignment' && f.message.includes('dialogue'))
    expect(genreFinding).toBeDefined()
  })

  it('Tier 3 (SEMANTIC CRITICAL): fails closed when schedule genre lacks schedule-row blocks', () => {
    const mutated = structuredClone(samplePackage)
    mutated.metadata.schemaVersion = '2.1.0'
    delete mutated.studentLesson.reading.paragraphs
    mutated.studentLesson.reading.genre = 'schedule'
    // Contains only paragraph blocks with >= 120 words
    mutated.studentLesson.reading.blocks = [
      { type: 'paragraph', text: 'Mina joins a school robotics club because she wants to build a machine that can sort library books quickly without human assistance.' },
      { type: 'paragraph', text: 'Her partner Jay suggests changing every single sensor before the final competition tomorrow morning so that we do not encounter unexpected recognition errors.' },
      { type: 'paragraph', text: 'Mina disagrees with this suggestion. She believes that changing only one component at a time will provide clear evidence about which part is causing the problem.' },
      { type: 'paragraph', text: 'The teacher comes by to inspect their progress and agrees with Mina. Testing one variable under controlled conditions is the foundation of scientific inquiry.' },
      { type: 'paragraph', text: 'Jay agrees to record baseline readings for the optical camera sensor while Mina connects the power cables and adjusts the light source.' },
      { type: 'paragraph', text: 'By following this systematic procedure, both teammates successfully fixed the optical recognition error and prepared the sorting robot for the science competition.' },
    ]

    const audit = auditCurriculumPackage(mutated)
    expect(audit.passed).toBe(false)
    const genreFinding = audit.findings.find((f) => f.tier === 'semantic-critical' && f.dimension === 'alignment' && f.message.includes('schedule'))
    expect(genreFinding).toBeDefined()
  })

  it('Tier 1 (WARNING TELEMETRY): treats isolated lexical-ceiling and review lexical-anchor as warning-only telemetry without failing quality gate', () => {
    const mutated = canonicalPackage()
    // 1. Isolated lexical ceiling telemetry (1-2 off-list words)
    mutated.studentLesson.practice[0].questions[0].prompt = 'Does the quantum device improve testing in the workshop?'
    // 2. Review lexical anchor telemetry (review vocabulary word not present in reading passage)
    mutated.studentLesson.vocabulary.push({
      id: 'v-unanchored-review',
      word: 'xylophone',
      partOfSpeech: 'n.',
      meaningZh: '木琴',
      pronunciationHint: null,
      exampleEn: 'He plays the xylophone.',
      exampleZh: '他彈奏木琴。',
      status: 'review',
    })

    const audit = auditCurriculumPackage(mutated)
    // Warning-only telemetry must not fail the Finisher quality gate
    expect(audit.passed).toBe(true)

    const ceilingFinding = audit.findings.find((f) => f.dimension === 'lexical-ceiling')
    expect(ceilingFinding).toBeDefined()
    expect(ceilingFinding?.severity).toBe('warning')

    const anchorFinding = audit.findings.find((f) => f.dimension === 'lexical-anchor')
    expect(anchorFinding).toBeDefined()
    expect(anchorFinding?.severity).toBe('warning')
  })

  it('Tier 3 (SEMANTIC CRITICAL): fails quality gate when new vocabulary is unanchored or severe lexical ceiling violation occurs', () => {
    const mutated = canonicalPackage()
    mutated.studentLesson.vocabulary.push({
      id: 'v-unanchored-new',
      word: 'astronomy',
      partOfSpeech: 'n.',
      meaningZh: '天文學',
      pronunciationHint: null,
      exampleEn: 'He studies astronomy.',
      exampleZh: '他研究天文學。',
      status: 'new',
    })

    const audit = auditCurriculumPackage(mutated)
    expect(audit.passed).toBe(false)
    const anchorFinding = audit.findings.find((f) => f.dimension === 'lexical-anchor')
    expect(anchorFinding?.tier).toBe('semantic-critical')
    expect(anchorFinding?.severity).toBe('critical')
  })
})
