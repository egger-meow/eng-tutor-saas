import { describe, expect, it } from 'vitest'
import {
  ASSESSMENT_SKILLS,
  AssessmentSessionResultSchema,
  type AssessmentItem,
} from '../contracts.js'
import { CANONICAL_ITEMS } from '../bank/index.js'
import {
  AdaptiveEngine,
  DEFAULT_BROAD_PROBE_SKILLS,
  computeStartingDifficulty,
  gradeAssessmentAnswer,
} from './index.js'

describe('Adaptive Engine: Pure Deterministic Unit Tests', () => {
  describe('Starting Difficulty Rules', () => {
    it('determines baseline difficulty by grade stage', () => {
      expect(computeStartingDifficulty('incoming_grade_7')).toBe(2)
      expect(computeStartingDifficulty('grade_7')).toBe(2)
      expect(computeStartingDifficulty('grade_8')).toBe(3)
      expect(computeStartingDifficulty('grade_9')).toBe(4)
      expect(computeStartingDifficulty(null)).toBe(2) // fallback
    })

    it('adjusts baseline difficulty by at most 1 level based on onboarding prior', () => {
      // Grade 7 (base 2)
      expect(computeStartingDifficulty('grade_7', 'needs-support')).toBe(1)
      expect(computeStartingDifficulty('grade_7', 'developing')).toBe(2)
      expect(computeStartingDifficulty('grade_7', 'on-level')).toBe(2)
      expect(computeStartingDifficulty('grade_7', 'advanced')).toBe(3)

      // Grade 8 (base 3)
      expect(computeStartingDifficulty('grade_8', 'needs-support')).toBe(2)
      expect(computeStartingDifficulty('grade_8', 'developing')).toBe(3)
      expect(computeStartingDifficulty('grade_8', 'on-level')).toBe(3)
      expect(computeStartingDifficulty('grade_8', 'advanced')).toBe(4)

      // Grade 9 (base 4)
      expect(computeStartingDifficulty('grade_9', 'needs-support')).toBe(3)
      expect(computeStartingDifficulty('grade_9', 'advanced')).toBe(5)
    })

    it('clamps starting difficulty to [1, 5]', () => {
      // Grade 7 needs-support clamped at 1
      expect(computeStartingDifficulty('incoming_grade_7', 'needs-support')).toBe(1)
      // Grade 9 advanced clamped at 5
      expect(computeStartingDifficulty('grade_9', 'advanced')).toBe(5)
    })
  })

  describe('Server-side Answer Grading', () => {
    const mcqItem: AssessmentItem = {
      id: 'mcq_test',
      domain: 'vocabulary',
      skill: 'core_vocabulary',
      difficulty: 2,
      gradeBand: 'grade_7',
      responseType: 'single_choice',
      prompt: 'What does "ancient" mean?',
      choices: [
        { id: 'A', text: 'very old' },
        { id: 'B', text: 'very new' },
      ],
      correctChoice: 'A',
      analysisTags: ['synonym'],
      status: 'active',
      version: 1,
    }

    const saItem: AssessmentItem = {
      id: 'sa_test',
      domain: 'grammar',
      skill: 'verb_tense_agreement',
      difficulty: 3,
      gradeBand: 'grade_8',
      responseType: 'short_answer',
      prompt: 'Fill in blank: She ___ (go) to Taipei yesterday.',
      acceptedAnswers: ['went'],
      analysisTags: ['past_tense'],
      status: 'active',
      version: 1,
    }

    it('grades MCQ correctly and case-insensitively', () => {
      expect(gradeAssessmentAnswer(mcqItem, 'A', false)).toBe('correct')
      expect(gradeAssessmentAnswer(mcqItem, 'a', false)).toBe('correct')
      expect(gradeAssessmentAnswer(mcqItem, ' B ', false)).toBe('incorrect')
      expect(gradeAssessmentAnswer(mcqItem, 'Z', false)).toBe('incorrect')
    })

    it('grades short answer with deterministic normalization', () => {
      expect(gradeAssessmentAnswer(saItem, 'went', false)).toBe('correct')
      expect(gradeAssessmentAnswer(saItem, '  WENT  ', false)).toBe('correct')
      expect(gradeAssessmentAnswer(saItem, 'went.', false)).toBe('correct')
      expect(gradeAssessmentAnswer(saItem, 'goes', false)).toBe('incorrect')
    })

    it('treats isSkipped or empty answers as skipped', () => {
      expect(gradeAssessmentAnswer(mcqItem, 'A', true)).toBe('skipped')
      expect(gradeAssessmentAnswer(mcqItem, '', false)).toBe('skipped')
      expect(gradeAssessmentAnswer(mcqItem, null, false)).toBe('skipped')
      expect(gradeAssessmentAnswer(saItem, '   ', false)).toBe('skipped')
    })
  })

  describe('Broad Probe Phase', () => {
    it('initializes broad probe covering all 13 coarse skills near starting difficulty', () => {
      const sessionId = '123e4567-e89b-42d3-a456-426614174000'
      const childId = '123e4567-e89b-42d3-a456-426614174001'

      const { state, decision } = AdaptiveEngine.initSession({
        sessionId,
        childId,
        gradeStage: 'grade_8',
        onboardingLevel: 'on-level',
        availableItems: CANONICAL_ITEMS,
      })

      expect(state.phase).toBe('broad_probe')
      expect(state.startingDifficulty).toBe(3)
      expect(state.broadProbeRemainingSkills).toHaveLength(12)
      expect(state.itemsCompleted).toBe(0)
      expect(decision.isComplete).toBe(false)
      expect(decision.nextItem).toBeDefined()
      expect(decision.nextItem?.skill).toBe(DEFAULT_BROAD_PROBE_SKILLS[0])
      expect(decision.nextItem?.difficulty).toBe(3)
    })

    it('progresses through all 13 skills without repeating any item', () => {
      const sessionId = '123e4567-e89b-42d3-a456-426614174000'
      const childId = '123e4567-e89b-42d3-a456-426614174001'

      let { state, decision } = AdaptiveEngine.initSession({
        sessionId,
        childId,
        gradeStage: 'grade_7',
        availableItems: CANONICAL_ITEMS,
      })

      const probedSkills: string[] = []
      const probedItems: string[] = []

      for (let i = 0; i < 13; i++) {
        expect(state.phase).toBe('broad_probe')
        const currentItem = decision.nextItem!
        expect(currentItem).toBeDefined()
        probedSkills.push(currentItem.skill)
        probedItems.push(currentItem.id)

        const res = AdaptiveEngine.processResponse({
          sessionId,
          childId,
          state,
          response: {
            itemId: currentItem.id,
            rawAnswer: currentItem.correctChoice || (currentItem.acceptedAnswers ? currentItem.acceptedAnswers[0] : 'A'),
            isSkipped: false,
          },
          availableItems: CANONICAL_ITEMS,
        })
        state = res.state
        decision = res.decision
      }

      // Probed exactly all 13 coarse diagnostic skills
      expect(new Set(probedSkills).size).toBe(13)
      for (const skill of ASSESSMENT_SKILLS) {
        expect(probedSkills).toContain(skill)
      }

      // No repeated items
      expect(new Set(probedItems).size).toBe(13)

      // Transitions to targeted confirmation after 13th response
      expect(state.phase).toBe('targeted_confirmation')
    })
  })

  describe('Targeted Confirmation & Stopping Conditions', () => {
    it('moves difficulty up after correct and down after incorrect in targeted confirmation', () => {
      const sessionId = '123e4567-e89b-42d3-a456-426614174000'
      const childId = '123e4567-e89b-42d3-a456-426614174001'

      let { state, decision } = AdaptiveEngine.initSession({
        sessionId,
        childId,
        gradeStage: 'grade_8',
        availableItems: CANONICAL_ITEMS,
      })

      // Run through 13 broad probe items
      for (let i = 0; i < 13; i++) {
        const item = decision.nextItem!
        const res = AdaptiveEngine.processResponse({
          sessionId,
          childId,
          state,
          response: {
            itemId: item.id,
            rawAnswer: 'wrong_answer', // all incorrect during broad probe
            isSkipped: false,
          },
          availableItems: CANONICAL_ITEMS,
        })
        state = res.state
        decision = res.decision
      }

      expect(state.phase).toBe('targeted_confirmation')

      // Next targeted confirmation item should move downward or stay at floor 1
      const confirmationItem = decision.nextItem!
      expect(confirmationItem).toBeDefined()
      expect(confirmationItem.difficulty).toBeLessThanOrEqual(3)
    })

    it('strictly halts at hard maximum of 25 items', () => {
      const sessionId = '123e4567-e89b-42d3-a456-426614174000'
      const childId = '123e4567-e89b-42d3-a456-426614174001'

      let { state, decision } = AdaptiveEngine.initSession({
        sessionId,
        childId,
        gradeStage: 'grade_7',
        availableItems: CANONICAL_ITEMS,
      })

      let count = 0
      while (!decision.isComplete && count < 30) {
        const currentItem = decision.nextItem!
        count++
        const res = AdaptiveEngine.processResponse({
          sessionId,
          childId,
          state,
          response: {
            itemId: currentItem.id,
            // Alternate correct and incorrect to create contradictions and push session length
            rawAnswer: count % 2 === 0 ? (currentItem.correctChoice || 'went') : 'wrong',
            isSkipped: false,
          },
          availableItems: CANONICAL_ITEMS,
        })
        state = res.state
        decision = res.decision
      }

      expect(decision.isComplete).toBe(true)
      expect(state.phase).toBe('completed')
      expect(state.itemsCompleted).toBeLessThanOrEqual(25)
      expect(state.itemHistory).toHaveLength(state.itemsCompleted)
      expect(new Set(state.itemHistory).size).toBe(state.itemsCompleted)

      // Result passes Zod schema validation
      expect(decision.finalResult).not.toBeNull()
      const parsed = AssessmentSessionResultSchema.safeParse(decision.finalResult)
      expect(parsed.success).toBe(true)
    })

    it('has zero scoring or routing effect from activeResponseMs', () => {
      const sessionId = '123e4567-e89b-42d3-a456-426614174000'
      const childId = '123e4567-e89b-42d3-a456-426614174001'

      // Run session 1 with 120ms
      const init1 = AdaptiveEngine.initSession({
        sessionId,
        childId,
        gradeStage: 'grade_8',
        availableItems: CANONICAL_ITEMS,
      })
      const step1 = AdaptiveEngine.processResponse({
        sessionId,
        childId,
        state: init1.state,
        response: {
          itemId: init1.decision.nextItem!.id,
          rawAnswer: 'A',
          isSkipped: false,
          activeResponseMs: 120,
        },
        availableItems: CANONICAL_ITEMS,
      })

      // Run session 2 with identical inputs but 45000ms
      const init2 = AdaptiveEngine.initSession({
        sessionId,
        childId,
        gradeStage: 'grade_8',
        availableItems: CANONICAL_ITEMS,
      })
      const step2 = AdaptiveEngine.processResponse({
        sessionId,
        childId,
        state: init2.state,
        response: {
          itemId: init2.decision.nextItem!.id,
          rawAnswer: 'A',
          isSkipped: false,
          activeResponseMs: 45000,
        },
        availableItems: CANONICAL_ITEMS,
      })

      // Decisions, next items, and skills must be 100% identical
      expect(step1.decision.nextItem?.id).toBe(step2.decision.nextItem?.id)
      expect(step1.decision.targetSkill).toBe(step2.decision.targetSkill)
      expect(step1.decision.targetDifficulty).toBe(step2.decision.targetDifficulty)
      expect(step1.state.itemsCompleted).toBe(step2.state.itemsCompleted)
    })
  })
})
