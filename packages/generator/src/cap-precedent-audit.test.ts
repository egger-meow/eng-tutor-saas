import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  auditCapPrecedentFloor,
  auditCapPrecedentPackage,
  retrieveCapPrecedents,
  type CapPrecedentRuntimeBundle,
} from './cap-precedent-audit.js'
import {
  CAP_ASSESSMENT_PLAN_BASE_KEYS,
  CAP_ASSESSMENT_PLAN_FORBIDDEN_ALIASES,
  CAP_ASSESSMENT_PLAN_MODE_KEYS,
  validateCapAssessmentPlan,
} from './cap-assessment-plan-contract.js'

const card = {
  ref: 'cap-0123456789ab', genre: 'article_informational', primarySkill: 'local_inference', secondarySkills: [],
  cognitiveDepth: 'D2_single_step_inference', languageDifficulty: 'A1_elementary', evidenceMode: 'text_only',
  evidenceNecessity: 'essential', evidenceSpan: 'cross_sentence_local', reasoningOperations: ['connect evidence'],
  questionMechanism: 'infer a result from two clues', whyTheQuestionWorks: 'context is required',
  correctAnswerConstructionPrinciple: 'one option follows both clues', distractorStrategies: ['partial_truth'],
  reusableDesignPrinciple: 'make two clues jointly decisive',
  difficultyAdjustment: { simplificationConstraints: ['keep two clues'], depthAdjustmentStrategies: ['add a competing clue'] },
  copyGuardHashes: [],
}
const runtime: CapPrecedentRuntimeBundle = {
  version: 'test', authorityStatus: 'authoritative', capKnowledgeVersion: 'k', capCorpusHash: 'a'.repeat(64),
  capBundleVersion: 'b', plannerVersion: 'p', qualityFloorVersion: 'q', cards: [card],
}
const provenance = JSON.stringify({ capKnowledgeVersion: 'k', capCorpusHash: 'a'.repeat(64), capBundleVersion: 'b', plannerVersion: 'p', qualityFloorVersion: 'q' })
const plan = (overrides = {}) => JSON.stringify({
  learningObjective: 'infer from evidence', primarySkill: 'local_inference', secondarySkills: [], genre: 'article_informational',
  targetLanguageDifficulty: 'A1_elementary', targetCognitiveDepth: 'D2_single_step_inference', evidenceMode: 'text_only',
  evidenceSpan: 'cross_sentence_local', evidenceScope: 'primary_reading',
  evidenceAnchors: [{ location: 'studentLesson.reading.blocks.0.text', anchorText: 'Mia saw wet streets.' }],
  reasoningOperations: ['connect evidence'], precedentRefs: ['cap-0123456789ab'],
  precedentMode: 'anchor', borrowedDesignPrinciples: ['two clues jointly decide'], distractorStrategies: ['partial_truth'],
  intentionalRecall: false, noPrecedentReason: null, ...overrides,
})
const pkg = (planEvidence: string | null, question = { id: 'q1', itemType: 'inference', prompt: 'What can we infer from both clues?', options: ['A', 'B', 'C', 'D'] }) => ({
  studentLesson: { reading: { blocks: [{ type: 'paragraph', text: 'Mia saw wet streets. She also saw people closing umbrellas.' }] }, practice: [{ stage: 'independent', questions: [question] }], homework: { questions: [] } },
  qualityEvidence: {
    precedentRefs: ['cap-0123456789ab'],
    criticalChecks: [
      { id: 'cap-provenance', passed: true, evidence: provenance },
      ...(planEvidence ? [{ id: 'cap-plan:q1', passed: true, evidence: planEvidence }] : []),
    ],
  },
})

describe('CAP precedent deterministic quality floor', () => {
  it('uses one strict canonical CAP-plan vocabulary for authoring and audit', () => {
    const parsed = JSON.parse(plan())
    expect(Object.keys(parsed).sort()).toEqual([...CAP_ASSESSMENT_PLAN_BASE_KEYS, ...CAP_ASSESSMENT_PLAN_MODE_KEYS.anchor].sort())
    expect(CAP_ASSESSMENT_PLAN_FORBIDDEN_ALIASES.every((key) => !(key in parsed))).toBe(true)
    expect(validateCapAssessmentPlan(parsed)).toEqual({ valid: true, errors: [] })

    const drifted = { ...parsed, objective: parsed.learningObjective }
    delete drifted.learningObjective
    expect(validateCapAssessmentPlan(drifted)).toMatchObject({ valid: false })
  })

  it('keeps the low-level unknown/missing ref primitive', () => {
    const available = new Set(['cap-0123456789ab'])
    expect(auditCapPrecedentFloor({ capTransferQuestionCount: 1, precedentRefs: [], availableRefs: available }).passed).toBe(false)
    expect(auditCapPrecedentFloor({ capTransferQuestionCount: 1, precedentRefs: ['cap-0123456789ab'], availableRefs: available }).passed).toBe(true)
  })

  it('retrieves relevant anchors deterministically', () => {
    expect(retrieveCapPrecedents(JSON.parse(plan()), runtime).map((item) => item.ref)).toEqual(['cap-0123456789ab'])
  })

  it('surfaces structurally useful precedents without exact primary-skill equality', () => {
    const structuralCard = {
      ...card,
      ref: 'cap-111111111111',
      primarySkill: 'information_integration',
      genre: 'multi_document_comparison',
      cognitiveDepth: 'D3_multi_step_synthesis',
      evidenceMode: 'multi_document',
      evidenceSpan: 'multi_paragraph_global',
      reasoningOperations: ['compare claims across two sources'],
      distractorStrategies: ['partial_truth', 'unsupported_world_knowledge'],
    }
    const structuralRuntime = { ...runtime, cards: [structuralCard] }
    const intent = {
      ...JSON.parse(plan()),
      primarySkill: 'author_purpose',
      genre: 'multi_document_comparison',
      targetCognitiveDepth: 'D3_multi_step_synthesis',
      evidenceMode: 'multi_document',
      evidenceSpan: 'cross_sentence_local',
      reasoningOperations: ['compare claims across two sources'],
      distractorStrategies: ['unsupported_world_knowledge'],
    }
    expect(retrieveCapPrecedents(intent, structuralRuntime).map((item) => item.ref)).toEqual(['cap-111111111111'])
  })

  it('varies equally strong candidates deterministically and softly down-ranks recent refs', () => {
    const tiedRuntime = {
      ...runtime,
      cards: [
        card,
        { ...card, ref: 'cap-111111111111' },
        { ...card, ref: 'cap-222222222222' },
      ],
    }
    const intent = JSON.parse(plan())
    const first = retrieveCapPrecedents(intent, tiedRuntime, 1, { selectionKey: 'packet-a' })[0]!.ref
    const second = retrieveCapPrecedents(intent, tiedRuntime, 1, { selectionKey: 'packet-b' })[0]!.ref
    expect(first).not.toBe(second)
    expect(retrieveCapPrecedents(intent, tiedRuntime, 1, {
      selectionKey: 'packet-a',
      recentPrecedentRefs: [first],
    })[0]!.ref).not.toBe(first)
  })

  it.each([
    ['anchor', { borrowedDesignPrinciples: ['make two independent clues jointly decisive'] }],
    ['blend', { synthesizedDesignPrinciples: ['combine cross-source comparison with causal elimination'] }],
    ['calibration', { benchmarkQualities: ['requires evidence integration and plausible partial-truth distractors'], noveltyRationale: 'Uses a new evidence arrangement while preserving the same or higher reasoning demand.' }],
  ])('accepts %s mode without requiring structural imitation', (precedentMode, modeEvidence) => {
    const modePlan = plan({
      precedentMode,
      borrowedDesignPrinciples: undefined,
      synthesizedDesignPrinciples: undefined,
      benchmarkQualities: undefined,
      noveltyRationale: undefined,
      ...modeEvidence,
      preservedMechanics: undefined,
      adaptationStrategy: undefined,
      primarySkill: precedentMode === 'calibration' ? 'author_purpose' : 'local_inference',
      evidenceMode: precedentMode === 'calibration' ? 'multi_document' : 'text_only',
      evidenceSpan: precedentMode === 'calibration' ? 'multi_paragraph_global' : 'cross_sentence_local',
    })
    expect(auditCapPrecedentPackage(pkg(modePlan), runtime).findings).toEqual([])
  })

  it('blocks blank-page assessment authoring when a relevant precedent exists', () => {
    expect(auditCapPrecedentPackage(pkg(plan({ precedentRefs: [] })), runtime).findings.join('\n')).toContain('CAP_PRECEDENT_MISSING:q1')
  })

  it('requires a per-item plan and exact runtime provenance', () => {
    expect(auditCapPrecedentPackage(pkg(null), runtime).findings.join('\n')).toContain('CAP_ITEM_PLAN_MISSING:q1')
    const bad = pkg(plan())
    bad.qualityEvidence.criticalChecks[0]!.evidence = JSON.stringify({ capKnowledgeVersion: 'wrong' })
    expect(auditCapPrecedentPackage(bad, runtime).findings.join('\n')).toContain('CAP_PROVENANCE_MISMATCH')
  })

  it('allows explicit vocabulary recall without forcing CAP imitation', () => {
    const recall = pkg(plan({ intentionalRecall: true, precedentRefs: [] }), { id: 'q1', itemType: 'vocabulary', prompt: 'brave = ?', options: ['勇敢的', '安靜的', '古老的', '昂貴的'] })
    recall.qualityEvidence.precedentRefs = []
    expect(auditCapPrecedentPackage(recall, runtime).passed).toBe(true)
  })

  it('keeps unknown refs and historical wording overlap fail-closed', () => {
    const unknown = pkg(plan({ precedentMode: 'anchor', borrowedDesignPrinciples: ['use two clues'], precedentRefs: ['cap-ffffffffffff'] }))
    unknown.qualityEvidence.precedentRefs = ['cap-ffffffffffff']
    expect(auditCapPrecedentPackage(unknown, runtime).findings.join('\n')).toContain('CAP_PRECEDENT_UNKNOWN:q1:cap-ffffffffffff')

    const copiedText = 'wet streets made people close their bright umbrellas quickly'
    const tokens = copiedText.split(' ')
    const copyGuardHashes = Array.from({ length: tokens.length - 4 }, (_, index) =>
      createHash('sha256').update(tokens.slice(index, index + 5).join(' ')).digest('hex').slice(0, 16),
    )
    const copiedRuntime = { ...runtime, cards: [{ ...card, copyGuardHashes }] }
    const copied = pkg(plan({ precedentMode: 'anchor', borrowedDesignPrinciples: ['two clues jointly decide'] }), {
      id: 'q1', itemType: 'inference', prompt: copiedText, options: ['A', 'B', 'C', 'D'],
    })
    expect(auditCapPrecedentPackage(copied, copiedRuntime).findings.join('\n')).toContain('CAP_COPY_OVERLAP:q1')
  })

  it('rejects naked dictionary-definition prompts in normal assessment', () => {
    const weak = pkg(plan(), { id: 'q1', itemType: 'context-clue', prompt: 'What is the meaning of brave?', options: ['A', 'B', 'C', 'D'] })
    expect(auditCapPrecedentPackage(weak, runtime).findings.join('\n')).toContain('CAP_SHALLOW_ASSESSMENT:q1')
  })

  it('keeps easy language independent from deeper cognition', () => {
    const deepCard = { ...card, cognitiveDepth: 'D3_multi_step_synthesis', evidenceSpan: 'multi_paragraph_global' }
    const deepRuntime = { ...runtime, cards: [deepCard] }
    const deepPlan = plan({ targetLanguageDifficulty: 'A1_elementary', targetCognitiveDepth: 'D3_multi_step_synthesis', evidenceSpan: 'multi_paragraph_global' })
    expect(auditCapPrecedentPackage(pkg(deepPlan), deepRuntime).passed).toBe(true)
  })

  it('rejects D3/D4 collapse even in calibration mode', () => {
    const collapsed = plan({
      precedentMode: 'calibration',
      borrowedDesignPrinciples: undefined,
      benchmarkQualities: ['multi-step synthesis'],
      noveltyRationale: 'A new structure intended to maintain multi-step reasoning.',
      targetCognitiveDepth: 'D3_multi_step_synthesis',
      evidenceSpan: 'single_clause',
    })
    expect(auditCapPrecedentPackage(pkg(collapsed), runtime).findings.join('\n')).toContain('CAP_DEPTH_COLLAPSE:q1')
  })

  it('allows one precedent across materially different items without a ref-count failure', () => {
    const questions = ['q1', 'q2', 'q3', 'q4'].map((id, index) => ({
      id,
      itemType: index % 2 === 0 ? 'inference' : 'author-purpose',
      prompt: `Question ${index + 1} uses a materially different evidence arrangement.`,
      options: ['A', 'B', 'C', 'D'],
    }))
    const repeated = pkg(null)
    repeated.studentLesson.practice = [{ stage: 'independent', questions }]
    repeated.qualityEvidence.criticalChecks.push(...questions.map((question, index) => ({
      id: `cap-plan:${question.id}`,
      passed: true,
      evidence: plan({
        precedentMode: index === 0 ? 'anchor' : index === 1 ? 'blend' : 'calibration',
        borrowedDesignPrinciples: index === 0 ? ['joint evidence'] : undefined,
        synthesizedDesignPrinciples: index === 1 ? ['causal elimination plus evidence integration'] : undefined,
        benchmarkQualities: index >= 2 ? ['plausible distractors and evidence-based reasoning'] : undefined,
        noveltyRationale: index >= 2 ? `Novel arrangement ${index} preserves the quality floor.` : undefined,
        preservedMechanics: undefined,
        adaptationStrategy: undefined,
      }),
    })))
    expect(auditCapPrecedentPackage(repeated, runtime).findings).not.toContain('CAP_PRECEDENT_MONOCULTURE: four or more assessment items cannot all reuse one design anchor')
    expect(auditCapPrecedentPackage(repeated, runtime).passed).toBe(true)
  })

  it('rejects evidenceScope pointing to instruction for reading-dependent item', () => {
    const invalidScopePlan = plan({
      evidenceScope: 'instruction',
      evidenceAnchors: [{ location: 'studentLesson.reading.blocks.0.text', anchorText: 'Mia saw wet streets.' }],
    })
    const report = auditCapPrecedentPackage(pkg(invalidScopePlan), runtime)
    expect(report.passed).toBe(false)
    expect(report.findings.join('\n')).toContain('CAP_EVIDENCE_BOUNDARY_VIOLATION:q1')
  })

  it('rejects reading-dependent item when evidence anchors are missing', () => {
    const noAnchorsPlan = plan({
      evidenceScope: 'primary_reading',
      evidenceAnchors: [],
    })
    const report = auditCapPrecedentPackage(pkg(noAnchorsPlan), runtime)
    expect(report.passed).toBe(false)
    expect(report.findings.join('\n')).toContain('CAP_EVIDENCE_ANCHORS_MISSING:q1')
  })

  it('rejects evidence anchor pointing outside reading blocks (e.g. instruction)', () => {
    const badLocPlan = plan({
      evidenceScope: 'primary_reading',
      evidenceAnchors: [{ location: 'studentLesson.instruction.0.explanationZh', anchorText: 'Mia saw wet streets.' }],
    })
    const report = auditCapPrecedentPackage(pkg(badLocPlan), runtime)
    expect(report.passed).toBe(false)
    expect(report.findings.join('\n')).toContain('CAP_EVIDENCE_LOCATION_INVALID:q1')
  })

  it('rejects evidence anchor when anchorText does not exist in referenced reading block', () => {
    const missingTextPlan = plan({
      evidenceScope: 'primary_reading',
      evidenceAnchors: [{ location: 'studentLesson.reading.blocks.0.text', anchorText: 'The robot exploded.' }],
    })
    const report = auditCapPrecedentPackage(pkg(missingTextPlan), runtime)
    expect(report.passed).toBe(false)
    expect(report.findings.join('\n')).toContain('CAP_EVIDENCE_ANCHOR_TEXT_MISSING:q1')
  })

  it('rejects reading item whose prompt quotes text from outside primary reading', () => {
    const quoteMismatchQuestion = {
      id: 'q1',
      itemType: 'inference' as const,
      prompt: 'In the sentence "May, might, and could express possibility", what is the main rule?',
      options: ['A', 'B', 'C', 'D'],
    }
    const report = auditCapPrecedentPackage(pkg(plan(), quoteMismatchQuestion), runtime)
    expect(report.passed).toBe(false)
    expect(report.findings.join('\n')).toContain('CAP_QUOTE_EVIDENCE_MISMATCH:q1')
  })
})
