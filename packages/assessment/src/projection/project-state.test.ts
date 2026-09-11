import { describe, expect, it } from 'vitest'
import {
  ASSESSMENT_PROJECTION_VERSION,
  projectFrozenResultToCompactState,
} from '../index.js'

describe('projectFrozenResultToCompactState', () => {
  const validChildId = '11111111-1111-4111-8111-111111111111'
  const validSessionId = '22222222-2222-4222-8222-222222222222'
  const validAssessedAt = '2026-09-12T00:00:00.000Z'

  const validFinalResult = {
    sessionId: validSessionId,
    childId: validChildId,
    completedAt: validAssessedAt,
    totalItems: 18,
    correctCount: 14,
    skipCount: 1,
    overallNarrativeZh: '整體表現穩定，具備良好的字彙與文法基礎。',
    skillEvaluations: {
      core_vocabulary: {
        skill: 'core_vocabulary',
        domain: 'vocabulary',
        result: 'secure',
        confidence: 'high',
        itemsAttempted: 3,
        itemsCorrect: 3,
        estimatedDifficulty: 4,
        notes: '內部筆記：核心單字全對',
      },
      contextual_meaning: {
        skill: 'contextual_meaning',
        domain: 'vocabulary',
        result: 'developing',
        confidence: 'medium',
        itemsAttempted: 2,
        itemsCorrect: 1,
        estimatedDifficulty: 3,
        notes: '內部筆記：語境推論待加強',
      },
      word_form_usage: {
        skill: 'word_form_usage',
        domain: 'vocabulary',
        result: 'needs_support',
        confidence: 'low',
        itemsAttempted: 1,
        itemsCorrect: 0,
        estimatedDifficulty: 2,
      },
      basic_sentence_structure: {
        skill: 'basic_sentence_structure',
        domain: 'grammar',
        result: 'secure',
        confidence: 'high',
        itemsAttempted: 2,
        itemsCorrect: 2,
        estimatedDifficulty: 4,
      },
      verb_tense_agreement: {
        skill: 'verb_tense_agreement',
        domain: 'grammar',
        result: 'developing',
        confidence: 'medium',
        itemsAttempted: 2,
        itemsCorrect: 1,
        estimatedDifficulty: 3,
      },
      questions_and_negatives: {
        skill: 'questions_and_negatives',
        domain: 'grammar',
        result: 'secure',
        confidence: 'medium',
        itemsAttempted: 1,
        itemsCorrect: 1,
        estimatedDifficulty: 3,
      },
      modifiers_and_relations: {
        skill: 'modifiers_and_relations',
        domain: 'grammar',
        result: 'needs_support',
        confidence: 'low',
        itemsAttempted: 1,
        itemsCorrect: 0,
        estimatedDifficulty: 2,
      },
      complex_structures: {
        skill: 'complex_structures',
        domain: 'grammar',
        result: 'developing',
        confidence: 'low',
        itemsAttempted: 1,
        itemsCorrect: 0,
        estimatedDifficulty: 2,
      },
      explicit_information: {
        skill: 'explicit_information',
        domain: 'reading',
        result: 'secure',
        confidence: 'high',
        itemsAttempted: 3,
        itemsCorrect: 3,
        estimatedDifficulty: 4,
      },
      main_idea: {
        skill: 'main_idea',
        domain: 'reading',
        result: 'developing',
        confidence: 'medium',
        itemsAttempted: 2,
        itemsCorrect: 1,
        estimatedDifficulty: 3,
      },
      vocabulary_in_context: {
        skill: 'vocabulary_in_context',
        domain: 'reading',
        result: 'secure',
        confidence: 'medium',
        itemsAttempted: 1,
        itemsCorrect: 1,
        estimatedDifficulty: 3,
      },
      inference: {
        skill: 'inference',
        domain: 'reading',
        result: 'needs_support',
        confidence: 'medium',
        itemsAttempted: 2,
        itemsCorrect: 0,
        estimatedDifficulty: 2,
      },
      information_integration: {
        skill: 'information_integration',
        domain: 'reading',
        result: 'developing',
        confidence: 'low',
        itemsAttempted: 1,
        itemsCorrect: 0,
        estimatedDifficulty: 2,
      },
    },
    domainSummaries: {
      vocabulary: {
        domain: 'vocabulary',
        result: 'developing',
        confidence: 'medium',
        summaryZh: '字彙發展良好。',
      },
      grammar: {
        domain: 'grammar',
        result: 'secure',
        confidence: 'high',
        summaryZh: '文法結構穩固。',
      },
      reading: {
        domain: 'reading',
        result: 'needs_support',
        confidence: 'medium',
        summaryZh: '閱讀理解需加強推論練習。',
      },
    },
  }

  it('projects completed session into compact learner state correctly', () => {
    const compact = projectFrozenResultToCompactState({
      childId: validChildId,
      sessionId: validSessionId,
      assessedAt: validAssessedAt,
      finalResult: validFinalResult,
    })

    expect(compact.childId).toBe(validChildId)
    expect(compact.lastSessionId).toBe(validSessionId)
    expect(compact.status).toBe('completed')
    expect(compact.assessedAt).toBe(validAssessedAt)
    expect(compact.projectionVersion).toBe(ASSESSMENT_PROJECTION_VERSION)

    // Skills check: only level and confidence
    expect(Object.keys(compact.skillResults).length).toBe(13)
    for (const [skillKey, skillVal] of Object.entries(compact.skillResults)) {
      expect(skillVal).toBeDefined()
      expect(Object.keys(skillVal!).sort()).toEqual(['confidence', 'level'])
      expect(['needs_support', 'developing', 'secure']).toContain(skillVal!.level)
      expect(['low', 'medium', 'high']).toContain(skillVal!.confidence)
      // Strict exclusion checks:
      expect((skillVal as any).skill).toBeUndefined()
      expect((skillVal as any).domain).toBeUndefined()
      expect((skillVal as any).estimatedDifficulty).toBeUndefined()
      expect((skillVal as any).itemsAttempted).toBeUndefined()
      expect((skillVal as any).itemsCorrect).toBeUndefined()
      expect((skillVal as any).notes).toBeUndefined()
    }

    // Specific skill values
    expect(compact.skillResults.core_vocabulary).toEqual({
      level: 'secure',
      confidence: 'high',
    })
    expect(compact.skillResults.contextual_meaning).toEqual({
      level: 'developing',
      confidence: 'medium',
    })

    // Domains check: only level and confidence
    expect(Object.keys(compact.domainSummaries).length).toBe(3)
    for (const [domainKey, domainVal] of Object.entries(compact.domainSummaries)) {
      expect(domainVal).toBeDefined()
      expect(Object.keys(domainVal!).sort()).toEqual(['confidence', 'level'])
      expect(['needs_support', 'developing', 'secure']).toContain(domainVal!.level)
      expect(['low', 'medium', 'high']).toContain(domainVal!.confidence)
      // Strict exclusion checks:
      expect((domainVal as any).domain).toBeUndefined()
      expect((domainVal as any).summaryZh).toBeUndefined()
    }

    expect(compact.domainSummaries.vocabulary).toEqual({
      level: 'developing',
      confidence: 'medium',
    })
    expect(compact.domainSummaries.grammar).toEqual({
      level: 'secure',
      confidence: 'high',
    })
    expect(compact.domainSummaries.reading).toEqual({
      level: 'needs_support',
      confidence: 'medium',
    })

    // Top-level exclusion checks
    expect((compact as any).overallNarrativeZh).toBeUndefined()
    expect((compact as any).correctCount).toBeUndefined()
    expect((compact as any).skipCount).toBeUndefined()
    expect((compact as any).totalItems).toBeUndefined()
  })

  it('rejects projection when childId does not match finalResult', () => {
    expect(() =>
      projectFrozenResultToCompactState({
        childId: '99999999-9999-4999-8999-999999999999',
        sessionId: validSessionId,
        assessedAt: validAssessedAt,
        finalResult: validFinalResult,
      }),
    ).toThrow(/Child ID mismatch/)
  })

  it('rejects unknown skill keys', () => {
    const corruptedResult = {
      ...validFinalResult,
      skillEvaluations: {
        ...validFinalResult.skillEvaluations,
        unauthorized_skill: {
          result: 'secure',
          confidence: 'high',
        },
      },
    }

    expect(() =>
      projectFrozenResultToCompactState({
        childId: validChildId,
        sessionId: validSessionId,
        assessedAt: validAssessedAt,
        finalResult: corruptedResult,
      }),
    ).toThrow(/Unknown skill evaluation key: unauthorized_skill/)
  })

  it('rejects unknown domain keys', () => {
    const corruptedResult = {
      ...validFinalResult,
      domainSummaries: {
        ...validFinalResult.domainSummaries,
        science: {
          result: 'secure',
          confidence: 'high',
        },
      },
    }

    expect(() =>
      projectFrozenResultToCompactState({
        childId: validChildId,
        sessionId: validSessionId,
        assessedAt: validAssessedAt,
        finalResult: corruptedResult,
      }),
    ).toThrow(/Unknown domain summary key: science/)
  })

  it('rejects invalid skill result values', () => {
    const corruptedResult = {
      ...validFinalResult,
      skillEvaluations: {
        ...validFinalResult.skillEvaluations,
        core_vocabulary: {
          result: 'expert',
          confidence: 'high',
        },
      },
    }

    expect(() =>
      projectFrozenResultToCompactState({
        childId: validChildId,
        sessionId: validSessionId,
        assessedAt: validAssessedAt,
        finalResult: corruptedResult,
      }),
    ).toThrow(/Invalid skill result level "expert"/)
  })

  it('rejects invalid confidence values', () => {
    const corruptedResult = {
      ...validFinalResult,
      skillEvaluations: {
        ...validFinalResult.skillEvaluations,
        core_vocabulary: {
          result: 'secure',
          confidence: 'ultra_high',
        },
      },
    }

    expect(() =>
      projectFrozenResultToCompactState({
        childId: validChildId,
        sessionId: validSessionId,
        assessedAt: validAssessedAt,
        finalResult: corruptedResult,
      }),
    ).toThrow(/Invalid skill confidence "ultra_high"/)
  })
})
