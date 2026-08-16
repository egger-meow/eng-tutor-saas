import { describe, it, expect } from 'vitest'
import {
  buildDiversityCapsule,
  extractHistoricalPackageSummary,
  type HistoricalPackageSummary,
  type DiversityCapsule,
} from './diversity-capsule.js'

describe('Diversity Capsule (Multi-Week Diversity Memory)', () => {
  it('extracts recent genres, context keys, and item families from recent 2-4 weeks without duplicate values', () => {
    const history: HistoricalPackageSummary[] = [
      {
        materialWeek: '2026-W30',
        genre: 'dialogue',
        contextKey: 'robotics-competition',
        itemFamilies: ['f-tech-science', 'f-asking-clarification'],
      },
      {
        materialWeek: '2026-W31',
        genre: 'article',
        contextKey: 'marine-biology',
        itemFamilies: ['f-nature-animals', 'f-describing-objects'],
      },
      {
        materialWeek: '2026-W32',
        genre: 'interview',
        contextKey: 'taiwan-night-markets',
        itemFamilies: ['f-food-culture', 'f-asking-information'],
      },
      {
        materialWeek: '2026-W33',
        genre: 'dialogue',
        contextKey: 'space-exploration',
        itemFamilies: ['f-tech-science', 'f-expressing-opinions'],
      },
    ]

    const capsule: DiversityCapsule = buildDiversityCapsule(history, 4)

    expect(capsule.recentGenres).toEqual(['dialogue', 'article', 'interview'])
    expect(capsule.recentContextKeys).toEqual([
      'robotics-competition',
      'marine-biology',
      'taiwan-night-markets',
      'space-exploration',
    ])
    expect(capsule.recentItemFamilies).toEqual([
      'f-tech-science',
      'f-asking-clarification',
      'f-nature-animals',
      'f-describing-objects',
      'f-food-culture',
      'f-asking-information',
      'f-expressing-opinions',
    ])
  })

  it('handles empty or sparse history gracefully', () => {
    const emptyCapsule = buildDiversityCapsule([])
    expect(emptyCapsule).toEqual({
      recentGenres: [],
      recentContextKeys: [],
      recentItemFamilies: [],
    })

    const sparseCapsule = buildDiversityCapsule([
      {
        materialWeek: '2026-W33',
        genre: 'announcement',
      },
    ])
    expect(sparseCapsule).toEqual({
      recentGenres: ['announcement'],
      recentContextKeys: [],
      recentItemFamilies: [],
    })
  })

  it('extracts historical package summary from a completed package', () => {
    const pkg = {
      studentLesson: {
        reading: {
          genre: 'dialogue',
          title: 'The Secret Redstone Door',
        },
        practice: [
          {
            stage: 'stage1',
            questions: [
              { id: 'q1', itemType: 'inference' },
              { id: 'q2', itemType: 'short-response' },
            ],
          },
        ],
        homework: {
          questions: [
            { id: 'q3', itemType: 'multiple-choice' },
            { id: 'q4', itemType: 'inference' },
          ],
        },
      },
      metadata: { generatedAt: '2026-W34' },
    }

    const summary = extractHistoricalPackageSummary(pkg, '2026-W34')
    expect(summary.materialWeek).toBe('2026-W34')
    expect(summary.genre).toBe('dialogue')
    expect(summary.contextKey).toBe('The Secret Redstone Door')
    expect(summary.itemFamilies).toEqual(['inference', 'short-response', 'multiple-choice'])
  })
})
