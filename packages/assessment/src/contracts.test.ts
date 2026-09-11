import { describe, expect, it } from 'vitest'
import {
  ASSESSMENT_DOMAINS,
  ASSESSMENT_SKILLS,
  DOMAIN_SKILLS_MAP,
  SKILL_TO_DOMAIN_MAP,
  SKILL_LABELS,
  DOMAIN_LABELS,
  AssessmentItemSchema,
  AssessmentPassageSchema,
  AssessmentResponseSchema,
  AssessmentSessionResultSchema,
  TARGET_SESSION_ITEMS,
  SOFT_MAX_SESSION_ITEMS,
  HARD_MAX_SESSION_ITEMS,
} from './contracts.js'

describe('Direct Assessment Contracts', () => {
  it('defines exactly 3 domains and 13 coarse diagnostic skills', () => {
    expect(ASSESSMENT_DOMAINS).toEqual(['vocabulary', 'grammar', 'reading'])
    expect(ASSESSMENT_SKILLS).toHaveLength(13)

    // Domain breakdown
    expect(DOMAIN_SKILLS_MAP.vocabulary).toHaveLength(3)
    expect(DOMAIN_SKILLS_MAP.grammar).toHaveLength(5)
    expect(DOMAIN_SKILLS_MAP.reading).toHaveLength(5)

    // Total skills map matches
    const allMappedSkills = [
      ...DOMAIN_SKILLS_MAP.vocabulary,
      ...DOMAIN_SKILLS_MAP.grammar,
      ...DOMAIN_SKILLS_MAP.reading,
    ]
    expect(allMappedSkills).toEqual(expect.arrayContaining([...ASSESSMENT_SKILLS]))
  })

  it('maps every skill to its parent domain and label', () => {
    for (const skill of ASSESSMENT_SKILLS) {
      const domain = SKILL_TO_DOMAIN_MAP[skill]
      expect(ASSESSMENT_DOMAINS).toContain(domain)
      expect(DOMAIN_SKILLS_MAP[domain]).toContain(skill)
      expect(SKILL_LABELS[skill]).toBeDefined()
      expect(typeof SKILL_LABELS[skill]).toBe('string')
    }

    for (const domain of ASSESSMENT_DOMAINS) {
      expect(DOMAIN_LABELS[domain]).toBeDefined()
    }
  })

  it('preserves target, soft max, and hard max session limits', () => {
    expect(TARGET_SESSION_ITEMS).toBe(18)
    expect(SOFT_MAX_SESSION_ITEMS).toBe(22)
    expect(HARD_MAX_SESSION_ITEMS).toBe(25)
    expect(TARGET_SESSION_ITEMS).toBeLessThan(SOFT_MAX_SESSION_ITEMS)
    expect(SOFT_MAX_SESSION_ITEMS).toBeLessThan(HARD_MAX_SESSION_ITEMS)
  })

  describe('AssessmentPassageSchema', () => {
    it('validates a valid reading passage', () => {
      const valid = AssessmentPassageSchema.safeParse({
        id: 'pass_01',
        title: 'Community Garden',
        content: 'People in our neighborhood started a community garden last spring...',
        wordCount: 120,
        gradeBand: 'grade_7',
        status: 'active',
      })
      expect(valid.success).toBe(true)
    })

    it('rejects passage with non-positive word count', () => {
      const invalid = AssessmentPassageSchema.safeParse({
        id: 'pass_01',
        title: 'Community Garden',
        content: 'Some text',
        wordCount: 0,
        gradeBand: 'grade_7',
      })
      expect(invalid.success).toBe(false)
    })
  })

  describe('AssessmentItemSchema', () => {
    it('validates a single-choice item with valid choices and correct choice', () => {
      const item = {
        id: 'v_01',
        domain: 'vocabulary',
        skill: 'core_vocabulary',
        difficulty: 2,
        gradeBand: 'grade_7',
        responseType: 'single_choice',
        prompt: 'What does "ancient" mean?',
        choices: [
          { id: 'A', text: 'very old' },
          { id: 'B', text: 'very new' },
          { id: 'C', text: 'loud' },
          { id: 'D', text: 'quiet' },
        ],
        correctChoice: 'A',
        analysisTags: ['synonym'],
        status: 'active',
        version: 1,
      }
      const parsed = AssessmentItemSchema.safeParse(item)
      expect(parsed.success).toBe(true)
    })

    it('rejects single-choice item if correct choice is not in choices', () => {
      const item = {
        id: 'v_02',
        domain: 'vocabulary',
        skill: 'core_vocabulary',
        difficulty: 2,
        gradeBand: 'grade_7',
        responseType: 'single_choice',
        prompt: 'Prompt',
        choices: [
          { id: 'A', text: 'opt 1' },
          { id: 'B', text: 'opt 2' },
        ],
        correctChoice: 'Z',
      }
      const parsed = AssessmentItemSchema.safeParse(item)
      expect(parsed.success).toBe(false)
    })

    it('validates a short-answer item with accepted answers', () => {
      const item = {
        id: 'g_01',
        domain: 'grammar',
        skill: 'verb_tense_agreement',
        difficulty: 3,
        gradeBand: 'grade_8',
        responseType: 'short_answer',
        prompt: 'Fill in the blank: Yesterday they ___ (visit) the museum.',
        acceptedAnswers: ['visited'],
        status: 'active',
        version: 1,
      }
      const parsed = AssessmentItemSchema.safeParse(item)
      expect(parsed.success).toBe(true)
    })

    it('rejects short-answer item without accepted answers', () => {
      const item = {
        id: 'g_02',
        domain: 'grammar',
        skill: 'verb_tense_agreement',
        difficulty: 3,
        gradeBand: 'grade_8',
        responseType: 'short_answer',
        prompt: 'Prompt',
        acceptedAnswers: [],
      }
      const parsed = AssessmentItemSchema.safeParse(item)
      expect(parsed.success).toBe(false)
    })

    it('rejects invalid difficulty levels outside 1..5', () => {
      const item = {
        id: 'g_03',
        domain: 'grammar',
        skill: 'verb_tense_agreement',
        difficulty: 6,
        gradeBand: 'grade_8',
        responseType: 'short_answer',
        prompt: 'Prompt',
        acceptedAnswers: ['visited'],
      }
      const parsed = AssessmentItemSchema.safeParse(item)
      expect(parsed.success).toBe(false)
    })
  })

  describe('AssessmentResponseSchema', () => {
    it('validates a correct single-choice response with active time', () => {
      const res = AssessmentResponseSchema.safeParse({
        sessionId: '123e4567-e89b-42d3-a456-426614174000',
        childId: '123e4567-e89b-42d3-a456-426614174001',
        itemId: 'v_01',
        sequenceNumber: 1,
        responseType: 'single_choice',
        rawAnswer: 'A',
        isSkipped: false,
        outcome: 'correct',
        activeResponseMs: 3820,
      })
      expect(res.success).toBe(true)
    })

    it('validates a skipped response', () => {
      const res = AssessmentResponseSchema.safeParse({
        sessionId: '123e4567-e89b-42d3-a456-426614174000',
        childId: '123e4567-e89b-42d3-a456-426614174001',
        itemId: 'g_01',
        sequenceNumber: 2,
        responseType: 'short_answer',
        rawAnswer: null,
        isSkipped: true,
        outcome: 'skipped',
        activeResponseMs: 1200,
      })
      expect(res.success).toBe(true)
    })
  })

  describe('AssessmentSessionResultSchema', () => {
    it('validates a full session result object', () => {
      const skillEval = {
        skill: 'core_vocabulary',
        domain: 'vocabulary',
        result: 'secure',
        confidence: 'high',
        itemsAttempted: 3,
        itemsCorrect: 3,
        estimatedDifficulty: 3,
      }
      const domainSum = {
        domain: 'vocabulary',
        result: 'secure',
        confidence: 'high',
        summaryZh: '字彙掌握穩固，常用單字辨析度佳。',
      }
      const resultObj: any = {
        sessionId: '123e4567-e89b-42d3-a456-426614174000',
        childId: '123e4567-e89b-42d3-a456-426614174001',
        completedAt: new Date().toISOString(),
        totalItems: 18,
        correctCount: 14,
        skipCount: 1,
        skillEvaluations: {},
        domainSummaries: {
          vocabulary: domainSum,
          grammar: {
            domain: 'grammar',
            result: 'developing',
            confidence: 'medium',
            summaryZh: '文法基礎句型良好，複合句需加強。',
          },
          reading: {
            domain: 'reading',
            result: 'secure',
            confidence: 'medium',
            summaryZh: '閱讀篇章細節擷取精準。',
          },
        },
        overallNarrativeZh: '整體英語程度穩健，字彙與閱讀細節掌握佳。',
      }

      for (const s of ASSESSMENT_SKILLS) {
        resultObj.skillEvaluations[s] = {
          ...skillEval,
          skill: s,
          domain: SKILL_TO_DOMAIN_MAP[s],
        }
      }

      const parsed = AssessmentSessionResultSchema.safeParse(resultObj)
      expect(parsed.success).toBe(true)
    })
  })
})
