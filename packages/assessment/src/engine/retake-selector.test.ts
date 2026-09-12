import { describe, expect, it } from 'vitest'
import type { AssessmentItem } from '../contracts.js'
import { selectCandidateItem } from './selector.js'

describe('Direct Assessment Selector — Retake Repetition Avoidance', () => {
  const baseItem = {
    domain: 'vocabulary' as const,
    skill: 'core_vocabulary' as const,
    gradeBand: 'grade_7' as const,
    responseType: 'single_choice' as const,
    prompt: 'Choose the correct word.',
    status: 'active' as const,
    version: 1,
    analysisTags: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  }

  const items: AssessmentItem[] = [
    {
      ...baseItem,
      id: 'vocab-item-001',
      difficulty: 2,
    },
    {
      ...baseItem,
      id: 'vocab-item-002',
      difficulty: 2,
    },
    {
      ...baseItem,
      id: 'vocab-item-003',
      difficulty: 3,
    },
  ]

  it('prefers item not used in immediately previous assessment when equivalent candidates exist', () => {
    // Normal selection without previous items picks vocab-item-001 (alphabetical tie-break)
    const normalChoice = selectCandidateItem(
      items,
      'core_vocabulary',
      2,
      new Set<string>()
    )
    expect(normalChoice?.id).toBe('vocab-item-001')

    // With vocab-item-001 in previousSessionItemIds, tie-break prefers vocab-item-002
    const retakeChoice = selectCandidateItem(
      items,
      'core_vocabulary',
      2,
      new Set<string>(),
      null,
      new Set(['vocab-item-001'])
    )
    expect(retakeChoice?.id).toBe('vocab-item-002')
  })

  it('falls back to previously used item if no alternative exists (never fails session)', () => {
    // Both vocab-item-001 and vocab-item-002 were in previous session
    const fallbackChoice = selectCandidateItem(
      items,
      'core_vocabulary',
      2,
      new Set<string>(),
      null,
      new Set(['vocab-item-001', 'vocab-item-002'])
    )
    // Still selects an eligible candidate rather than returning null or failing
    expect(fallbackChoice).not.toBeNull()
    expect(fallbackChoice?.id).toBe('vocab-item-001')
  })

  it('never violates difficulty routing to avoid repetition', () => {
    // Only vocab-item-001 is diff 2. vocab-item-003 is diff 3.
    // Target difficulty is 2. vocab-item-001 was used previously, vocab-item-003 was not.
    const itemsSingleDiff2: AssessmentItem[] = [
      items[0], // diff 2, used previously
      items[2], // diff 3, not used
    ]

    const choice = selectCandidateItem(
      itemsSingleDiff2,
      'core_vocabulary',
      2,
      new Set<string>(),
      null,
      new Set(['vocab-item-001'])
    )

    // Distance 0 (vocab-item-001) strictly beats distance 1 (vocab-item-003)
    expect(choice?.id).toBe('vocab-item-001')
  })

  it('preserves reading passage continuity over previous item avoidance', () => {
    const readingItems: AssessmentItem[] = [
      {
        id: 'read-p1-item-01',
        domain: 'reading',
        skill: 'inference',
        gradeBand: 'grade_7',
        difficulty: 3,
        responseType: 'single_choice',
        prompt: 'Infer meaning',
        passageId: 'passage-01',
        status: 'active',
        version: 1,
        analysisTags: [],
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
      {
        id: 'read-p2-item-01',
        domain: 'reading',
        skill: 'inference',
        gradeBand: 'grade_7',
        difficulty: 3,
        responseType: 'single_choice',
        prompt: 'Infer meaning 2',
        passageId: 'passage-02',
        status: 'active',
        version: 1,
        analysisTags: [],
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ]

    // Learner is currently on passage-01. read-p1-item-01 was used in previous assessment.
    // Passage continuity prefers passage-01 item.
    const choice = selectCandidateItem(
      readingItems,
      'inference',
      3,
      new Set<string>(),
      'passage-01',
      new Set(['read-p1-item-01'])
    )
    expect(choice?.id).toBe('read-p1-item-01')
  })

  it('randomizes among tied candidates when randomizer is provided', () => {
    // Both vocab-item-001 and vocab-item-002 are tied on difficulty 2 and not in previous session
    const choice0 = selectCandidateItem(
      items,
      'core_vocabulary',
      2,
      new Set<string>(),
      null,
      null,
      () => 0.0
    )
    expect(choice0?.id).toBe('vocab-item-001')

    const choice1 = selectCandidateItem(
      items,
      'core_vocabulary',
      2,
      new Set<string>(),
      null,
      null,
      () => 0.99
    )
    expect(choice1?.id).toBe('vocab-item-002')
  })
})
