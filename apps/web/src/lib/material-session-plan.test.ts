import { describe, expect, it } from 'vitest'
import {
  buildMaterialSessionPlan,
  isStepCompleted,
  getCurrentStep,
} from './material-session-plan'
import type { StudentLesson } from '../types/student-material'

describe('material-session-plan', () => {
  it('handles empty or null lesson gracefully', () => {
    const emptyPlan = buildMaterialSessionPlan(null)
    expect(emptyPlan.firstStep).toBe('')
    expect(emptyPlan.steps).toHaveLength(0)

    const blankLessonPlan = buildMaterialSessionPlan({})
    expect(blankLessonPlan.firstStep).toBe('stage-1')
    expect(blankLessonPlan.steps).toHaveLength(1)
    expect(blankLessonPlan.steps[0].questionIds).toEqual([])
    expect(blankLessonPlan.steps[0].descriptionZh).toContain('今天先不用做題')
  })

  it('builds a complete 3-stage plan for standard full lesson', () => {
    const fullLesson: StudentLesson = {
      opening: { goalsZh: ['目標 1'] },
      reading: { passage: 'This is a reading passage.' },
      instruction: [{ id: 'grammar-1', titleZh: '現在完成式' }],
      practice: [
        {
          id: 'p-stage-1',
          titleZh: '基礎練習',
          questions: [
            { id: 'q1', prompt: 'Question 1' },
            { id: 'q2', prompt: 'Question 2' },
            { id: 'q3', prompt: 'Question 3' },
          ],
        },
      ],
      selfCheckZh: ['檢核點 1'],
      homework: {
        purposeZh: '提取練習',
        questions: [{ id: 'hw1', prompt: 'HW 1' }],
      },
    }

    const plan = buildMaterialSessionPlan(fullLesson)
    expect(plan.firstStep).toBe('stage-1')
    expect(plan.steps).toHaveLength(3)

    // Stage 1
    expect(plan.steps[0].id).toBe('stage-1')
    expect(plan.steps[0].chapterId).toBe('reading')
    expect(plan.steps[0].questionIds).toEqual(['q1', 'q2'])
    expect(plan.steps[0].descriptionZh).toContain('再試前兩題')

    // Stage 2
    expect(plan.steps[1].id).toBe('stage-2')
    expect(plan.steps[1].chapterId).toBe('instruction')
    expect(plan.steps[1].questionIds).toEqual(['q3'])

    // Stage 3
    expect(plan.steps[2].id).toBe('stage-3')
    expect(plan.steps[2].chapterId).toBe('homework')
    expect(plan.steps[2].questionIds).toEqual(['hw1'])
  })

  it('falls back to opening or practice when reading is missing', () => {
    const noReadingLesson: StudentLesson = {
      opening: { goalsZh: ['導讀'] },
      practice: [
        {
          id: 'p1',
          titleZh: '練習',
          questions: [{ id: 'q1', prompt: 'Q1' }],
        },
      ],
    }

    const plan = buildMaterialSessionPlan(noReadingLesson)
    expect(plan.steps[0].chapterId).toBe('opening')
    expect(plan.steps[0].questionIds).toEqual(['q1'])
    expect(plan.steps[0].descriptionZh).toContain('再試第1題')
  })

  it('handles lesson with only reading and no questions', () => {
    const readingOnlyLesson: StudentLesson = {
      reading: { passage: 'Passage without questions' },
      selfCheckZh: ['我讀懂了'],
    }

    const plan = buildMaterialSessionPlan(readingOnlyLesson)
    expect(plan.steps[0].chapterId).toBe('reading')
    expect(plan.steps[0].questionIds).toEqual([])
    expect(plan.steps[0].descriptionZh).toContain('今天先不用做題')
    // Stage 2 is skipped (no instruction and no remaining practice)
    // Stage 3 is present because of selfCheckZh
    expect(plan.steps).toHaveLength(2)
    expect(plan.steps[1].chapterId).toBe('selfcheck')
  })

  it('handles questionId fallback when question.id is absent', () => {
    const legacyQuestionsLesson: StudentLesson = {
      reading: { passage: 'Reading' },
      practice: [
        {
          id: 'p1',
          titleZh: '練習',
          questions: [
            { questionId: 'legacy-q1', prompt: 'Legacy 1' } as any,
            { questionId: 'legacy-q2', prompt: 'Legacy 2' } as any,
          ],
        },
      ],
    }

    const plan = buildMaterialSessionPlan(legacyQuestionsLesson)
    expect(plan.steps[0].questionIds).toEqual(['legacy-q1', 'legacy-q2'])
  })

  it('computes step completion and current step accurately', () => {
    const lesson: StudentLesson = {
      reading: { passage: 'Text' },
      instruction: [{ id: 'g1', titleZh: '文法' }],
      practice: [
        {
          id: 'p1',
          titleZh: '練習',
          questions: [
            { id: 'q1', prompt: 'Q1' },
            { id: 'q2', prompt: 'Q2' },
            { id: 'q3', prompt: 'Q3' },
          ],
        },
      ],
    }
    const plan = buildMaterialSessionPlan(lesson)

    // Empty answers -> current step is stage-1
    expect(getCurrentStep(plan, {})?.id).toBe('stage-1')
    expect(isStepCompleted(plan.steps[0], {})).toBe(false)

    // Answer q1 only -> still stage-1
    expect(getCurrentStep(plan, { q1: 'ans1' })?.id).toBe('stage-1')
    expect(isStepCompleted(plan.steps[0], { q1: 'ans1' })).toBe(false)

    // Answer q1 and q2 -> stage-1 completed, moves to stage-2
    const s1Complete = { q1: 'ans1', q2: 'ans2' }
    expect(isStepCompleted(plan.steps[0], s1Complete)).toBe(true)
    expect(getCurrentStep(plan, s1Complete)?.id).toBe('stage-2')

    // Answer all -> returns last step
    const allComplete = { q1: 'ans1', q2: 'ans2', q3: 'ans3' }
    expect(isStepCompleted(plan.steps[1], allComplete)).toBe(true)
    expect(getCurrentStep(plan, allComplete)?.id).toBe('stage-2')
  })
})
