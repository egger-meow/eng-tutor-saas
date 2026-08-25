import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LearningJourneyPanel } from './LearningJourneyPanel'
import * as HookModule from '../../hooks/use-child-learning-library'

describe('LearningJourneyPanel Component', () => {
  it('renders loading state', () => {
    vi.spyOn(HookModule, 'useChildLearningLibrary').mockReturnValue({
      summary: null,
      timeline: [],
      loading: true,
      loadingMore: false,
      error: '',
      reload: vi.fn(),
      loadMore: vi.fn(),
    })

    const html = renderToStaticMarkup(<LearningJourneyPanel childId="c1" />)
    expect(html).toContain('正在整理學習歷程…')
    expect(html).toContain('aria-busy="true"')
  })

  it('renders error state', () => {
    vi.spyOn(HookModule, 'useChildLearningLibrary').mockReturnValue({
      summary: null,
      timeline: [],
      loading: false,
      loadingMore: false,
      error: '連線逾時',
      reload: vi.fn(),
      loadMore: vi.fn(),
    })

    const html = renderToStaticMarkup(<LearningJourneyPanel childId="c1" />)
    expect(html).toContain('學習歷程目前無法載入。')
    expect(html).toContain('再試一次')
  })

  it('renders summary and timeline when data loaded', () => {
    vi.spyOn(HookModule, 'useChildLearningLibrary').mockReturnValue({
      summary: {
        totalWeeks: 1,
        vocabulary: { exposed: 10, learning: 5, evidenceMastered: 5, reviewing: 0 },
        grammar: { exposed: 4, learning: 2, evidenceMastered: 2, reviewing: 0 },
        communication: { exposed: 2, learning: 1, evidenceMastered: 1, reviewing: 0 },
        readingTrajectory: { label: '初級起步' },
        persistentWeakAreas: [],
        recentImprovements: ['單字記憶加深'],
        masteryEvidenceExplanation: '有明確證據的掌握，需來自至少兩份不同教材、間隔至少七天的兩次答對紀錄；只讀過或完成教材不代表已掌握。',
      },
      timeline: [
        {
          sequenceNumber: 1,
          recordedAt: '2026-08-01T00:00:00Z',
          readingTrajectory: '初級起步',
          introducedCount: 10,
          reviewedCount: 0,
          introducedLabels: [],
          reviewedLabels: [],
          difficulties: [],
          improvements: ['單字記憶加深'],
          nextReviewReasons: ['介系詞'],
        },
      ],
      loading: false,
      loadingMore: false,
      error: '',
      reload: vi.fn(),
      loadMore: vi.fn(),
    })

    const html = renderToStaticMarkup(<LearningJourneyPanel childId="c1" />)
    expect(html).toContain('持續累積的學習歷程')
    expect(html).toContain('已完成')
    expect(html).toContain('1')
    expect(html).toContain('學習軌跡')
    expect(html).toContain('W1')
    expect(html).toContain('Week 1')
  })
})
