import { describe, expect, it } from 'vitest'
import {
  computeDeterministicPlanMinutes,
  evaluateWorkloadFit,
  isWithinWorkloadExceptionBand,
  normalizeCurriculumPackage,
} from './index.js'

function authoredWorkload() {
  const question = (id: string, itemType = 'detail', writingLines = 0) => ({ id, itemType, writingLines })
  return {
    weekly_minutes: 90,
    learningPlan: { estimatedMinutes: 90 },
    studentLesson: {
      opening: { warmUp: 'Recall what happened last week.' },
      reading: { wordCount: 275, readingTipsZh: ['圈出支持答案的證據。'] },
      vocabulary: Array.from({ length: 13 }, (_, index) => ({ id: `v-${index}` })),
      instruction: [{ workedExamples: [{}, {}], commonMistakes: [{}] }],
      practice: [
        { stage: 'guided', questions: [question('g1'), question('g2')] },
        { stage: 'independent', questions: [question('i1'), question('i2')] },
        { stage: 'cap-transfer', questions: [question('c1', 'inference'), question('c2', 'inference')] },
        { stage: 'production', questions: [question('p1', 'sentence-production', 4)] },
        { stage: 'retrieval', questions: [question('r1')] },
      ],
      selfCheckZh: ['我能找出證據。', '我能修正錯題。'],
      homework: { questions: [question('h1'), question('h2'), question('h3', 'short-response', 4)] },
    },
  }
}

describe('weekly workload fit', () => {
  it('detects the production example of 69 minutes against a 90-minute target', () => {
    expect(evaluateWorkloadFit(90, 69)).toMatchObject({
      code: 'BUDGET_UNDERFILLED',
      minimumMinutes: 77,
      maximumMinutes: 104,
    })
  })

  it('passes the inclusive target band and detects material overfill', () => {
    expect(evaluateWorkloadFit(90, 86).code).toBe('BUDGET_ALIGNED')
    expect(evaluateWorkloadFit(90, 105).code).toBe('BUDGET_OVERFILLED')
  })

  it('bounds evidence-backed exceptions to 75%-125% of target', () => {
    expect(isWithinWorkloadExceptionBand(100, 75)).toBe(true)
    expect(isWithinWorkloadExceptionBand(100, 125)).toBe(true)
    expect(isWithinWorkloadExceptionBand(100, 74)).toBe(false)
    expect(isWithinWorkloadExceptionBand(100, 126)).toBe(false)
  })

  it('keeps estimatedMinutes deterministic and content-derived', () => {
    const authored = authoredWorkload()
    authored.learningPlan.estimatedMinutes = 222
    const normalized = normalizeCurriculumPackage(authored) as typeof authored
    expect(normalized.learningPlan.estimatedMinutes).toBe(computeDeterministicPlanMinutes(normalized))
    expect(normalized.learningPlan.estimatedMinutes).not.toBe(authored.weekly_minutes)
    expect(normalized.learningPlan.estimatedMinutes).not.toBe(222)
  })

  it('counts meaningful expansion and trimming in the deterministic estimate', () => {
    const baseline = authoredWorkload()
    const baselineMinutes = computeDeterministicPlanMinutes(baseline)

    const expanded = structuredClone(baseline)
    expanded.studentLesson.practice[1]!.questions.push(
      { id: 'i3', itemType: 'short-response', writingLines: 6 },
      { id: 'i4', itemType: 'inference', writingLines: 0 },
    )
    ;(expanded.studentLesson as any).adaptiveExtension = {
      contentZh: '比較兩份證據並解釋哪一份更可靠。',
      taskZh: '寫出理由。',
      taskWritingLines: 4,
    }
    expect(computeDeterministicPlanMinutes(expanded)).toBeGreaterThan(baselineMinutes)

    const trimmed = structuredClone(expanded)
    trimmed.studentLesson.practice[1]!.questions.splice(-2)
    delete (trimmed.studentLesson as any).adaptiveExtension
    expect(computeDeterministicPlanMinutes(trimmed)).toBeLessThan(computeDeterministicPlanMinutes(expanded))
  })

  it('counts represented strategies, reflection, instruction depth, extensions, and writing complexity', () => {
    const baseline = authoredWorkload()
    const shallowWriting = structuredClone(baseline)
    shallowWriting.studentLesson.practice[3]!.questions[0]!.writingLines = 2
    expect(computeDeterministicPlanMinutes(baseline)).toBeGreaterThan(computeDeterministicPlanMinutes(shallowWriting))

    const reduced = structuredClone(baseline)
    reduced.studentLesson.reading.readingTipsZh = []
    reduced.studentLesson.selfCheckZh = []
    reduced.studentLesson.instruction = []
    expect(computeDeterministicPlanMinutes(baseline)).toBeGreaterThan(computeDeterministicPlanMinutes(reduced))
  })
})
