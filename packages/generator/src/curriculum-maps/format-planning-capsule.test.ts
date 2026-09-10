import { describe, it, expect } from 'vitest'
import {
  buildFormatPlanningCapsule,
  FORMAT_SELECTION_RULES,
  CANONICAL_PEDAGOGICAL_FORMAT_CANDIDATES,
} from './format-planning-capsule.js'
import type { DeliveryMemoryProjection } from './delivery-memory.js'

describe('format-planning-capsule', () => {
  it('builds empty capsule when history is empty', () => {
    const capsule = buildFormatPlanningCapsule([])
    expect(capsule.recentFormatUse).toEqual({})
    expect(capsule.recentReasoning).toEqual([])
    expect(capsule.avoidMechanicalRepeat).toEqual([])
    expect(capsule.availableButRecentlyUnused.length).toBeGreaterThan(5)
    expect(capsule.availableButRecentlyUnused).toContain('table:organizer')
    expect(capsule.availableButRecentlyUnused).toContain('comparison_matrix')
    expect(capsule.availableButRecentlyUnused).toContain('timeline_sequence')
  })

  it('correctly tallies format usage, avoids mechanical repeat, and identifies unused formats', () => {
    const history: DeliveryMemoryProjection[] = [
      {
        materialWeek: '2026-W34',
        readingGenre: 'article',
        readingTitle: 'keshi: The Early Soundcloud Years',
        introducedVocabulary: ['acoustic', 'vocal'],
        responseLayoutTypes: ['organizer', 'lines'],
        pedagogicalFormats: ['table:organizer', 'mcq:4-option'],
        reasoningOperations: ['local_inference', 'evidence_extraction'],
      },
      {
        materialWeek: '2026-W35',
        readingGenre: 'article',
        readingTitle: 'keshi: From Nursing to Music',
        introducedVocabulary: ['transition', 'decision'],
        responseLayoutTypes: ['organizer', 'sequence'],
        pedagogicalFormats: ['table:organizer', 'sequence:vertical', 'mcq:4-option'],
        reasoningOperations: ['sequence', 'local_inference'],
      },
    ]

    const capsule = buildFormatPlanningCapsule(history, 4)

    expect(capsule.recentFormatUse['table:organizer']).toBe(2)
    expect(capsule.recentFormatUse['sequence:vertical']).toBe(1)
    expect(capsule.recentFormatUse['mcq:4-option']).toBe(2)
    expect(capsule.avoidMechanicalRepeat).toContain('table:organizer')
    expect(capsule.avoidMechanicalRepeat).toContain('mcq:4-option')
    expect(capsule.avoidMechanicalRepeat).not.toContain('sequence:vertical')

    expect(capsule.recentReasoning).toContain('local_inference')
    expect(capsule.recentReasoning).toContain('sequence')

    // Unused recommendations
    expect(capsule.availableButRecentlyUnused).toContain('comparison_matrix')
    expect(capsule.availableButRecentlyUnused).not.toContain('evidence_inference')
    expect(capsule.availableButRecentlyUnused).toContain('sort_classify_grid')
    expect(capsule.availableButRecentlyUnused).toContain('before_after_table')
  })

  it('exports valid FORMAT_SELECTION_RULES covering canonical pedagogical needs', () => {
    expect(FORMAT_SELECTION_RULES.length).toBe(9)
    const taskNames = FORMAT_SELECTION_RULES.map((r) => r.learningTask)
    expect(taskNames).toContain('時間／事件順序')
    expect(taskNames).toContain('步驟與創作歷程')
    expect(taskNames).toContain('比較兩個選項、版本或角色')
    expect(taskNames).toContain('從文本證據得到結論')
    expect(taskNames).toContain('原因、事件、結果')
    expect(taskNames).toContain('分辨類型或特徵')
    expect(taskNames).toContain('修改前後的差異')
    expect(taskNames).toContain('整理人物成長、角色抉擇')
    expect(taskNames).toContain('自由表達、句型產出')

    for (const rule of FORMAT_SELECTION_RULES) {
      expect(['sequence', 'table', 'organizer', 'lines']).toContain(rule.canonicalLayout)
    }
  })
})

it('uses numeric legacy week order and canonical delivery ordinals before labels', () => {
  const row = (materialWeek: string, format: string, weekNumber?: number): DeliveryMemoryProjection => ({ materialWeek, weekNumber, readingGenre: 'article', readingTitle: '', introducedVocabulary: [], responseLayoutTypes: [], pedagogicalFormats: [format] })
  expect(buildFormatPlanningCapsule([row('Week 9', 'written:lines'), row('Week 10', 'table:grid')], 1).recentFormatUse).toEqual({ 'table:grid': 1 })
  expect(buildFormatPlanningCapsule([row('2099-W20', 'written:lines', 1), row('2026-W01', 'table:grid', 2)], 1).recentFormatUse).toEqual({ 'table:grid': 1 })
})

it('counts response items only where known and retains historical missing-count coverage', () => {
  const base: DeliveryMemoryProjection = { materialWeek: '2026-W01', readingGenre: 'article', readingTitle: '', introducedVocabulary: [], responseLayoutTypes: [], pedagogicalFormats: ['mcq:4-option'] }
  const capsule = buildFormatPlanningCapsule([
    base,
    { ...base, materialWeek: '2026-W02', openingMode: 'observation', instructionModes: ['comparison', 'comparison'], responseFormatCounts: { 'mcq:4-option': 20 } },
    { ...base, materialWeek: '2026-W03', openingMode: 'direct-reading', instructionModes: ['steps'], responseFormatCounts: { 'mcq:4-option': 1 } },
  ])
  expect(capsule.recentFormatUse['mcq:4-option']).toBe(3)
  expect(capsule.recentResponseItemCounts['mcq:4-option']).toBe(21)
  expect(capsule.responseCountCoverage).toEqual({ knownDeliveries: 2, totalDeliveries: 3 })
  expect(capsule.recentOpeningUse).toEqual({ 'direct-reading': 1, observation: 1 })
  expect(capsule.recentInstructionUse).toEqual({ steps: 1, comparison: 1 })
})
