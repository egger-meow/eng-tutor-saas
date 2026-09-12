import { describe, expect, it } from 'vitest'
import {
  CANONICAL_ITEMS,
  CANONICAL_PASSAGES,
  validateAssessmentBank,
  normalizeShortAnswer,
} from './index.js'
import {
  ASSESSMENT_SKILLS,
  DOMAIN_SKILLS_MAP,
  type AssessmentItem,
  type AssessmentPassage,
} from '../contracts.js'

describe('Canonical Assessment Bank & Deterministic Quality Validator', () => {
  it('validates the complete canonical bank without any errors or warnings', () => {
    const result = validateAssessmentBank(CANONICAL_ITEMS, CANONICAL_PASSAGES)

    if (result.errors.length > 0) {
      console.error('Validation errors:', result.errors)
    }
    if (result.warnings.length > 0) {
      console.warn('Validation warnings:', result.warnings)
    }

    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.isValid).toBe(true)

    // Total counts
    expect(result.coverage.totalItems).toBe(117)
    expect(result.coverage.totalPassages).toBe(19)
  })

  it('matches the planned domain and response-type distribution', () => {
    const result = validateAssessmentBank(CANONICAL_ITEMS, CANONICAL_PASSAGES)
    const { domainCounts, responseTypeCounts, difficultyCounts } = result.coverage

    // Domain breakdown
    expect(domainCounts.vocabulary).toBe(24)
    expect(domainCounts.grammar).toBe(44)
    expect(domainCounts.reading).toBe(49)

    // Response type breakdown
    // Exactly: 81 single_choice, 36 short_answer
    expect(responseTypeCounts.single_choice).toBe(81)
    expect(responseTypeCounts.short_answer).toBe(36)

    // Difficulty distribution coverage: levels 1 to 5 all well-represented
    expect(difficultyCounts[1]).toBeGreaterThanOrEqual(10)
    expect(difficultyCounts[2]).toBeGreaterThanOrEqual(20)
    expect(difficultyCounts[3]).toBeGreaterThanOrEqual(25)
    expect(difficultyCounts[4]).toBeGreaterThanOrEqual(15)
    expect(difficultyCounts[5]).toBeGreaterThanOrEqual(8)

    const sumDiff = Object.values(difficultyCounts).reduce((a, b) => a + b, 0)
    expect(sumDiff).toBe(117)
  })

  it('covers all 13 coarse diagnostic skills with at least 6 items per skill', () => {
    const result = validateAssessmentBank(CANONICAL_ITEMS, CANONICAL_PASSAGES)
    const { skillCounts } = result.coverage

    for (const skill of ASSESSMENT_SKILLS) {
      const count = skillCounts[skill]
      expect(count).toBeGreaterThanOrEqual(6)
    }

    // Check vocabulary skills (each has 8 items)
    for (const s of DOMAIN_SKILLS_MAP.vocabulary) {
      expect(skillCounts[s]).toBe(8)
    }

    // Check grammar skills (8 to 10 items)
    for (const s of DOMAIN_SKILLS_MAP.grammar) {
      expect(skillCounts[s]).toBeGreaterThanOrEqual(8)
    }

    // Check reading skills (7 to 13 items)
    for (const s of DOMAIN_SKILLS_MAP.reading) {
      expect(skillCounts[s]).toBeGreaterThanOrEqual(6)
    }
  })

  it('binds all 19 passages to exactly 2 or 3 reading items each', () => {
    const result = validateAssessmentBank(CANONICAL_ITEMS, CANONICAL_PASSAGES)
    const { itemsPerPassage } = result.coverage

    expect(Object.keys(itemsPerPassage)).toHaveLength(19)
    for (const [pId, count] of Object.entries(itemsPerPassage)) {
      expect(count).toBeGreaterThanOrEqual(2)
      expect(count).toBeLessThanOrEqual(3)
    }
  })

  describe('Validator edge case detection', () => {
    const baseItem: AssessmentItem = {
      id: 'test_item_01',
      domain: 'vocabulary',
      skill: 'core_vocabulary',
      difficulty: 2,
      gradeBand: 'grade_7',
      responseType: 'single_choice',
      prompt: 'What is the meaning of test?',
      choices: [
        { id: 'A', text: 'assessment' },
        { id: 'B', text: 'fruit' },
      ],
      correctChoice: 'A',
      analysisTags: ['test'],
      version: 1,
      status: 'active',
    }

    const basePassage: AssessmentPassage = {
      id: 'test_pass_01',
      title: 'A Test Story',
      content: 'Once upon a time in a school nearby, students learned English together with joy.',
      wordCount: 14,
      gradeBand: 'grade_7',
      status: 'active',
    }

    it('flags duplicate item IDs', () => {
      const items = [baseItem, { ...baseItem }]
      const res = validateAssessmentBank(items, [])
      expect(res.isValid).toBe(false)
      expect(res.errors.some((e) => e.includes('Duplicate item ID'))).toBe(true)
    })

    it('flags duplicate passage IDs', () => {
      const passages = [basePassage, { ...basePassage }]
      const res = validateAssessmentBank([], passages)
      expect(res.isValid).toBe(false)
      expect(res.errors.some((e) => e.includes('Duplicate passage ID'))).toBe(true)
    })

    it('flags domain and skill mismatch', () => {
      const badItem: AssessmentItem = {
        ...baseItem,
        id: 'bad_item_domain',
        domain: 'reading',
        skill: 'core_vocabulary',
      }
      const res = validateAssessmentBank([badItem], [])
      expect(res.isValid).toBe(false)
      expect(res.errors.some((e) => e.includes('domain-skill mismatch'))).toBe(true)
    })

    it('flags MCQ when correctChoice is missing or not in choices', () => {
      const badMCQ: AssessmentItem = {
        ...baseItem,
        id: 'bad_mcq',
        correctChoice: 'Z',
      }
      const res = validateAssessmentBank([badMCQ], [])
      expect(res.isValid).toBe(false)
      expect(res.errors.some((e) => e.includes('not found in choices'))).toBe(true)
    })

    it('flags MCQ with duplicate choice texts', () => {
      const badChoices: AssessmentItem = {
        ...baseItem,
        id: 'bad_choices',
        choices: [
          { id: 'A', text: 'identical' },
          { id: 'B', text: ' Identical ' },
        ],
      }
      const res = validateAssessmentBank([badChoices], [])
      expect(res.isValid).toBe(false)
      expect(res.errors.some((e) => e.includes('duplicate visible choice text'))).toBe(true)
    })

    it('flags short-answer item with empty or duplicate normalized accepted answers', () => {
      const badSA: AssessmentItem = {
        id: 'bad_sa_1',
        domain: 'grammar',
        skill: 'verb_tense_agreement',
        difficulty: 3,
        gradeBand: 'grade_8',
        responseType: 'short_answer',
        prompt: 'Fill in blank',
        acceptedAnswers: ['went', ' Went '],
        analysisTags: ['verb_tense'],
        version: 1,
        status: 'active',
      }
      const res = validateAssessmentBank([badSA], [])
      expect(res.isValid).toBe(false)
      expect(res.errors.some((e) => e.includes('colliding accepted answer'))).toBe(true)
    })

    it('flags reading item missing passageId or referencing non-existent passage', () => {
      const badReading: AssessmentItem = {
        id: 'bad_rd_1',
        domain: 'reading',
        skill: 'main_idea',
        difficulty: 2,
        gradeBand: 'grade_7',
        responseType: 'single_choice',
        passageId: 'non_existent_pass',
        prompt: 'What is main idea?',
        choices: [
          { id: 'A', text: 'Option A' },
          { id: 'B', text: 'Option B' },
        ],
        correctChoice: 'A',
        analysisTags: ['main_idea'],
        version: 1,
        status: 'active',
      }
      const res = validateAssessmentBank([badReading], [basePassage])
      expect(res.isValid).toBe(false)
      expect(res.errors.some((e) => e.includes('references non-existent passageId'))).toBe(true)
    })
  })

  describe('normalizeShortAnswer', () => {
    it('lowercases and trims whitespace', () => {
      expect(normalizeShortAnswer('  Apple  ')).toBe('apple')
      expect(normalizeShortAnswer('Running FAST')).toBe('running fast')
    })

    it('strips leading/trailing punctuation and cleans internal whitespace', () => {
      expect(normalizeShortAnswer('  "more expensive"  ')).toBe('more expensive')
      expect(normalizeShortAnswer('happily.')).toBe('happily')
      expect(normalizeShortAnswer('did   not   finish')).toBe('did not finish')
      expect(normalizeShortAnswer('they were?')).toBe('they were')
    })

    it('handles apostrophes in contractions cleanly', () => {
      expect(normalizeShortAnswer("didn't")).toBe("didn't")
      expect(normalizeShortAnswer("wasn't")).toBe("wasn't")
    })
  })
})
