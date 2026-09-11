import { describe, expect, it } from 'vitest'
import {
  evaluateSingleSkill,
  evaluateDomainSummary,
  generateOverallNarrative,
} from './final-result.js'
import { selectCandidateItem } from './selector.js'
import { AdaptiveEngine } from './adaptive-engine.js'
import type { AssessmentDomain, AssessmentItem, AssessmentSkill, DomainSummary, SkillEvaluation } from '../contracts.js'
import type { SkillEvidence } from './types.js'

function makeEvidence(
  skill: AssessmentSkill,
  domain: AssessmentDomain,
  difficulties: number[],
  outcomes: ('correct' | 'incorrect' | 'skipped')[],
  hasContradiction = false
): SkillEvidence {
  const correct = outcomes.filter((o) => o === 'correct').length
  const skipped = outcomes.filter((o) => o === 'skipped').length
  const incorrect = outcomes.filter((o) => o === 'incorrect').length

  return {
    skill,
    domain,
    attempts: difficulties.length,
    correct,
    incorrect,
    skipped,
    difficulties,
    outcomes,
    itemIds: difficulties.map((_, i) => `item_${skill}_${i}`),
    hasContradiction,
  }
}

describe('Direct Assessment Golden Conformance Suite (TypeScript Contract)', () => {
  describe('1. Low-difficulty successes remain developing', () => {
    it('keeps a learner with 2/2 correct at difficulty 2 in developing, not secure', () => {
      const evidence = makeEvidence('core_vocabulary', 'vocabulary', [2, 2], ['correct', 'correct'])
      const evaluation = evaluateSingleSkill(evidence)
      expect(evaluation.result).toBe('developing')
      expect(evaluation.estimatedDifficulty).toBe(2)
      expect(evaluation.confidence).toBe('medium')
    })
  })

  describe('2. High-difficulty successes can become secure', () => {
    it('evaluates 1 attempt correct at difficulty 3 as secure with low confidence', () => {
      const evidence = makeEvidence('core_vocabulary', 'vocabulary', [3], ['correct'])
      const evaluation = evaluateSingleSkill(evidence)
      expect(evaluation.result).toBe('secure')
      expect(evaluation.estimatedDifficulty).toBe(3)
      expect(evaluation.confidence).toBe('low')
    })

    it('evaluates 2 attempts correct at diff 3 and 4 as secure with medium confidence', () => {
      const evidence = makeEvidence('verb_tense_agreement', 'grammar', [3, 4], ['correct', 'correct'])
      const evaluation = evaluateSingleSkill(evidence)
      expect(evaluation.result).toBe('secure')
      expect(evaluation.estimatedDifficulty).toBe(4)
      expect(evaluation.confidence).toBe('medium')
    })

    it('evaluates 3 attempts correct at diff 3, 4, 5 as secure with high confidence', () => {
      const evidence = makeEvidence('main_idea', 'reading', [3, 4, 5], ['correct', 'correct', 'correct'])
      const evaluation = evaluateSingleSkill(evidence)
      expect(evaluation.result).toBe('secure')
      expect(evaluation.estimatedDifficulty).toBe(5)
      expect(evaluation.confidence).toBe('high')
    })
  })

  describe('3. Struggling evidence', () => {
    it('evaluates 1 attempt failed at difficulty 2 as needs_support with low confidence', () => {
      const evidence = makeEvidence('core_vocabulary', 'vocabulary', [2], ['incorrect'])
      const evaluation = evaluateSingleSkill(evidence)
      expect(evaluation.result).toBe('needs_support')
      expect(evaluation.estimatedDifficulty).toBe(1)
      expect(evaluation.confidence).toBe('low')
    })

    it('evaluates 2 attempts failed at difficulty 2 as needs_support with medium confidence', () => {
      const evidence = makeEvidence('core_vocabulary', 'vocabulary', [2, 2], ['incorrect', 'skipped'])
      const evaluation = evaluateSingleSkill(evidence)
      expect(evaluation.result).toBe('needs_support')
      expect(evaluation.estimatedDifficulty).toBe(2) // Math.max(1, Math.min(2, 2)) = 2
      expect(evaluation.confidence).toBe('medium')
    })

    it('evaluates failed attempt at difficulty 1 as needs_support with estimated difficulty 1', () => {
      const evidence = makeEvidence('core_vocabulary', 'vocabulary', [1, 2], ['incorrect', 'incorrect'])
      const evaluation = evaluateSingleSkill(evidence)
      expect(evaluation.result).toBe('needs_support')
      expect(evaluation.estimatedDifficulty).toBe(1) // Math.max(1, Math.min(1, 2)) = 1
      expect(evaluation.confidence).toBe('medium')
    })

    it('evaluates 3 failed attempts as needs_support with high confidence', () => {
      const evidence = makeEvidence('basic_sentence_structure', 'grammar', [1, 2, 2], ['incorrect', 'incorrect', 'incorrect'])
      const evaluation = evaluateSingleSkill(evidence)
      expect(evaluation.result).toBe('needs_support')
      expect(evaluation.estimatedDifficulty).toBe(1)
      expect(evaluation.confidence).toBe('high')
    })
  })

  describe('4. Mixed evidence', () => {
    it('evaluates 2 attempts (diff 2 correct, diff 3 incorrect) as developing', () => {
      const evidence = makeEvidence('complex_structures', 'grammar', [2, 3], ['correct', 'incorrect'])
      const evaluation = evaluateSingleSkill(evidence)
      expect(evaluation.result).toBe('developing')
      expect(evaluation.estimatedDifficulty).toBe(3) // round((2+3)/2) = 3
      expect(evaluation.confidence).toBe('medium')
    })
  })

  describe('5. Contradiction', () => {
    it('evaluates contradiction (diff 3 correct, diff 2 incorrect) with low confidence for < 4 attempts', () => {
      const evidence = makeEvidence('contextual_meaning', 'vocabulary', [3, 2], ['correct', 'incorrect'], true)
      const evaluation = evaluateSingleSkill(evidence)
      expect(evaluation.result).toBe('developing')
      expect(evaluation.confidence).toBe('low')
    })

    it('evaluates contradiction with medium confidence for >= 4 attempts', () => {
      const evidence = makeEvidence(
        'contextual_meaning',
        'vocabulary',
        [3, 2, 2, 4],
        ['correct', 'incorrect', 'correct', 'incorrect'],
        true
      )
      const evaluation = evaluateSingleSkill(evidence)
      expect(evaluation.result).toBe('developing')
      expect(evaluation.confidence).toBe('medium')
    })
  })

  describe('6. Domain confidence', () => {
    const makeEval = (skill: AssessmentSkill, domain: AssessmentDomain, conf: 'low' | 'medium' | 'high'): SkillEvaluation => ({
      skill,
      domain,
      result: 'developing',
      confidence: conf,
      itemsAttempted: 2,
      itemsCorrect: 1,
      estimatedDifficulty: 2,
    })

    it('produces high domain confidence when >= total - 1 skills are high', () => {
      const evals = [
        makeEval('core_vocabulary', 'vocabulary', 'high'),
        makeEval('contextual_meaning', 'vocabulary', 'high'),
        makeEval('word_form_usage', 'vocabulary', 'medium'),
      ]
      const summary = evaluateDomainSummary('vocabulary', evals)
      expect(summary.confidence).toBe('high')
    })

    it('produces low domain confidence when > total / 2 skills are low', () => {
      const evals = [
        makeEval('core_vocabulary', 'vocabulary', 'low'),
        makeEval('contextual_meaning', 'vocabulary', 'low'),
        makeEval('word_form_usage', 'vocabulary', 'high'),
      ]
      const summary = evaluateDomainSummary('vocabulary', evals)
      expect(summary.confidence).toBe('low')
    })

    it('produces medium domain confidence for mixed confidence levels', () => {
      const evals = [
        makeEval('core_vocabulary', 'vocabulary', 'high'),
        makeEval('contextual_meaning', 'vocabulary', 'medium'),
        makeEval('word_form_usage', 'vocabulary', 'low'),
      ]
      const summary = evaluateDomainSummary('vocabulary', evals)
      expect(summary.confidence).toBe('medium')
    })
  })

  describe('7. Special overall narratives', () => {
    const makeSummary = (domain: AssessmentDomain, result: 'secure' | 'developing' | 'needs_support'): DomainSummary => ({
      domain,
      result,
      confidence: 'medium',
      summaryZh: '',
    })

    it('narrative for all secure', () => {
      const narrative = generateOverallNarrative({
        vocabulary: makeSummary('vocabulary', 'secure'),
        grammar: makeSummary('grammar', 'secure'),
        reading: makeSummary('reading', 'secure'),
      })
      expect(narrative).toBe('整體英語程度穩健優異，字彙量充足且文法結構清晰，具備良好的篇章推論能力。')
    })

    it('narrative for all needs_support', () => {
      const narrative = generateOverallNarrative({
        vocabulary: makeSummary('vocabulary', 'needs_support'),
        grammar: makeSummary('grammar', 'needs_support'),
        reading: makeSummary('reading', 'needs_support'),
      })
      expect(narrative).toBe('目前在各學習領域均需要更多基礎引導，建議從日常核心字彙與簡單句構循序漸進建立學習自信。')
    })

    it('narrative for reading secure and grammar weaker', () => {
      const narrative = generateOverallNarrative({
        vocabulary: makeSummary('vocabulary', 'developing'),
        grammar: makeSummary('grammar', 'developing'),
        reading: makeSummary('reading', 'secure'),
      })
      expect(narrative).toBe('閱讀理解與語感表現良好，但文法規則與精準句構稍弱，加強時態與句型有助於突破瓶頸。')
    })

    it('narrative for grammar secure and reading weaker', () => {
      const narrative = generateOverallNarrative({
        vocabulary: makeSummary('vocabulary', 'developing'),
        grammar: makeSummary('grammar', 'secure'),
        reading: makeSummary('reading', 'developing'),
      })
      expect(narrative).toBe('文法概念清晰扎實，篇章閱讀時可多練習長文耐心與段落主旨掌握。')
    })

    it('narrative for balanced default', () => {
      const narrative = generateOverallNarrative({
        vocabulary: makeSummary('vocabulary', 'secure'),
        grammar: makeSummary('grammar', 'developing'),
        reading: makeSummary('reading', 'developing'),
      })
      expect(narrative).toBe('整體英語學習基礎良好，各領域表現均衡，持續保持每週閱讀習慣將能穩定進步。')
    })
  })

  describe('8. Same-passage preference in selector', () => {
    const items: AssessmentItem[] = [
      {
        id: 'item_beta',
        domain: 'reading',
        skill: 'explicit_information',
        difficulty: 3,
        gradeBand: 'grade_7',
        responseType: 'single_choice',
        passageId: 'pass_01',
        prompt: 'Question Beta',
        choices: [
          { id: 'A', text: 'Opt A' },
          { id: 'B', text: 'Opt B' },
        ],
        correctChoice: 'A',
        status: 'active',
        analysisTags: [],
        version: 1,
      },
      {
        id: 'item_alpha',
        domain: 'reading',
        skill: 'explicit_information',
        difficulty: 3,
        gradeBand: 'grade_7',
        responseType: 'single_choice',
        passageId: 'pass_02',
        prompt: 'Question Alpha',
        choices: [
          { id: 'A', text: 'Opt A' },
          { id: 'B', text: 'Opt B' },
        ],
        correctChoice: 'A',
        status: 'active',
        analysisTags: [],
        version: 1,
      },
    ]

    it('prefers matching passage even if alternative has alphabetically earlier ID', () => {
      const selected = selectCandidateItem(
        items,
        'explicit_information',
        3,
        new Set<string>(),
        'pass_01'
      )
      expect(selected?.id).toBe('item_beta')
    })

    it('respects difficulty distance over passage matching', () => {
      const itemsWithDiff: AssessmentItem[] = [
        {
          ...items[0],
          id: 'item_diff2_matching_passage',
          difficulty: 2,
          gradeBand: 'grade_7',
          passageId: 'pass_01',
        },
        {
          ...items[1],
          id: 'item_diff3_other_passage',
          difficulty: 3,
          gradeBand: 'grade_7',
          passageId: 'pass_02',
        },
      ]

      const selected = selectCandidateItem(
        itemsWithDiff,
        'explicit_information',
        3,
        new Set<string>(),
        'pass_01'
      )
      // Target difficulty 3 has distance 0 to item_diff3 and distance 1 to item_diff2
      expect(selected?.id).toBe('item_diff3_other_passage')
    })
  })

  describe('9. Unavailable broad-probe skill handling', () => {
    it('safely skips initial broad probe skill when question bank has no items for that skill', () => {
      // Provide active items for contextual_meaning, but NONE for core_vocabulary
      const availableItems: AssessmentItem[] = [
        {
          id: 'ctx_item_01',
          domain: 'vocabulary',
          skill: 'contextual_meaning',
          difficulty: 2,
          gradeBand: 'grade_7',
          responseType: 'single_choice',
          prompt: 'Context question',
          choices: [
            { id: 'A', text: 'Opt A' },
            { id: 'B', text: 'Opt B' },
          ],
          correctChoice: 'A',
          status: 'active',
          analysisTags: [],
          version: 1,
        },
      ]

      const { state, decision } = AdaptiveEngine.initSession({
        sessionId: '123e4567-e89b-42d3-a456-426614174000',
        childId: '223e4567-e89b-42d3-a456-426614174000',
        availableItems,
      })

      expect(decision.nextItem).not.toBeNull()
      expect(decision.nextItem?.id).toBe('ctx_item_01')
      expect(decision.targetSkill).toBe('contextual_meaning')
      expect(state.phase).toBe('broad_probe')
    })
  })
})
