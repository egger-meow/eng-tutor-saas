import { describe, expect, it } from 'vitest'
import {
  auditCapPrecedentFloor,
  auditCapPrecedentPackage,
  retrieveCapPrecedents,
  type CapPrecedentRuntimeBundle,
} from './cap-precedent-audit.js'

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
  learningObjective: 'infer from evidence', primarySkill: 'local_inference', secondarySkills: [],
  targetLanguageDifficulty: 'A1_elementary', targetCognitiveDepth: 'D2_single_step_inference', evidenceMode: 'text_only',
  evidenceSpan: 'cross_sentence_local', reasoningOperations: ['connect evidence'], precedentRefs: ['cap-0123456789ab'],
  preservedMechanics: ['two clues jointly decide'], adaptationStrategy: ['change topic and wording'], distractorStrategies: ['partial_truth'],
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
  it('keeps the low-level unknown/missing ref primitive', () => {
    const available = new Set(['cap-0123456789ab'])
    expect(auditCapPrecedentFloor({ capTransferQuestionCount: 1, precedentRefs: [], availableRefs: available }).passed).toBe(false)
    expect(auditCapPrecedentFloor({ capTransferQuestionCount: 1, precedentRefs: ['cap-0123456789ab'], availableRefs: available }).passed).toBe(true)
  })

  it('retrieves relevant anchors deterministically', () => {
    expect(retrieveCapPrecedents(JSON.parse(plan()), runtime).map((item) => item.ref)).toEqual(['cap-0123456789ab'])
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
})
