import { describe, expect, it } from 'vitest'
import { gradeStageLabel } from './grade-stage'

describe('gradeStageLabel', () => {
  it('keeps incoming Grade 7 distinct from enrolled Grade 7', () => {
    expect(gradeStageLabel({ grade: 7, grade_stage: 'incoming_grade_7' })).toBe('即將升國一')
    expect(gradeStageLabel({ grade: 7, grade_stage: 'grade_7' })).toBe('國中 7 年級')
  })
})
