import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LearningJourneyTimeline } from './LearningJourneyTimeline'
import type { LearningTimelineItem } from '../../lib/learning-library'

const sampleTimeline: LearningTimelineItem[] = [
  {
    sequenceNumber: 3,
    recordedAt: '2026-08-20T10:00:00Z',
    readingTrajectory: '進階閱讀',
    introducedCount: 8,
    reviewedCount: 4,
    introducedLabels: ['v-1', 'v-2'],
    reviewedLabels: ['v-3'],
    difficulties: [],
    improvements: ['主動閱讀長句', '能正確推敲生字'],
    nextReviewReasons: ['過去完成式用法', '連接詞使用'],
  },
  {
    sequenceNumber: 2,
    recordedAt: '2026-08-13T10:00:00Z',
    readingTrajectory: '中級閱讀',
    introducedCount: 6,
    reviewedCount: 3,
    introducedLabels: ['v-4'],
    reviewedLabels: ['v-5'],
    difficulties: [],
    improvements: ['理解文章大意'],
    nextReviewReasons: ['動詞三態變化'],
  },
  {
    sequenceNumber: 1,
    recordedAt: '2026-08-06T10:00:00Z',
    readingTrajectory: '尚待觀察',
    introducedCount: 5,
    reviewedCount: 0,
    introducedLabels: ['v-6'],
    reviewedLabels: [],
    difficulties: [],
    improvements: ['願意大聲朗讀'],
    nextReviewReasons: ['基礎名詞單字'],
  },
]

describe('LearningJourneyTimeline Component', () => {
  it('1. renders empty state when no items exist', () => {
    const html = renderToStaticMarkup(
      <LearningJourneyTimeline items={[]} loadingMore={false} onLoadMore={vi.fn()} />
    )
    expect(html).toContain('完成第一份教材後，這裡會開始累積學習歷程。')
    expect(html).not.toContain('constellation-node')
  })

  it('2. renders single week state as a standalone node without broken line', () => {
    const singleItem = [sampleTimeline[2]] // Week 1 only
    const html = renderToStaticMarkup(
      <LearningJourneyTimeline items={singleItem} loadingMore={false} onLoadMore={vi.fn()} />
    )

    // Should display Week 1 node
    expect(html).toContain('W1')
    expect(html).toContain('Week 1')
    expect(html).toContain('aria-selected="true"')
    expect(html).toContain('尚待觀察')
    expect(html).toContain('新接觸')
    expect(html).toContain('5')
    expect(html).toContain('看見進步')
    expect(html).toContain('願意大聲朗讀')
    expect(html).toContain('接下來再練')
    expect(html).toContain('基礎名詞單字')
    // Should NOT have NaN in coordinates
    expect(html).not.toContain('NaN')
  })

  it('3. renders multi-week state in chronological order and selects the latest by default', () => {
    const html = renderToStaticMarkup(
      <LearningJourneyTimeline items={sampleTimeline} loadingMore={false} onLoadMore={vi.fn()} />
    )

    // Check all week labels exist
    expect(html).toContain('W1')
    expect(html).toContain('W2')
    expect(html).toContain('W3')

    // Chronological order in node track: W1 before W2, W2 before W3
    const posW1 = html.indexOf('aria-label="Week 1')
    const posW2 = html.indexOf('aria-label="Week 2')
    const posW3 = html.indexOf('aria-label="Week 3')
    expect(posW1).toBeGreaterThan(-1)
    expect(posW2).toBeGreaterThan(posW1)
    expect(posW3).toBeGreaterThan(posW2)

    // Latest week (Week 3) selected by default in detail view
    expect(html).toContain('Week 3')
    expect(html).toContain('進階閱讀')
    expect(html).toContain('主動閱讀長句')
    expect(html).toContain('過去完成式用法')

    // SVG path connecting lines exist
    expect(html).toContain('<path')
    expect(html).not.toContain('NaN')
  })

  it('4. supports custom / controlled selection of a past week', () => {
    const html = renderToStaticMarkup(
      <LearningJourneyTimeline
        items={sampleTimeline}
        loadingMore={false}
        onLoadMore={vi.fn()}
        initialSelectedSequenceNumber={2}
      />
    )

    // Selected week is Week 2
    expect(html).toContain('Week 2')
    expect(html).toContain('中級閱讀')
    expect(html).toContain('理解文章大意')
    expect(html).toContain('動詞三態變化')
  })

  it('5. handles 20+ week long history and displays load more button', () => {
    const twentyWeeks: LearningTimelineItem[] = Array.from({ length: 25 }, (_, i) => ({
      sequenceNumber: 25 - i,
      recordedAt: `2026-08-${String(25 - i).padStart(2, '0')}T10:00:00Z`,
      readingTrajectory: '穩步前進',
      introducedCount: 5,
      reviewedCount: 3,
      introducedLabels: [],
      reviewedLabels: [],
      difficulties: [],
      improvements: [`進步點 ${25 - i}`],
      nextReviewReasons: [`複習點 ${25 - i}`],
    }))

    const html = renderToStaticMarkup(
      <LearningJourneyTimeline items={twentyWeeks} loadingMore={false} onLoadMore={vi.fn()} />
    )

    // Check presence of multiple nodes and load more button
    expect(html).toContain('W1')
    expect(html).toContain('W25')
    expect(html).toContain('看更早的紀錄')
    expect(html).toContain('aria-label="載入更早的學習紀錄"')
  })

  it('6. exhibits accessibility features: roles, aria-labels, and no private IDs leaked', () => {
    const html = renderToStaticMarkup(
      <LearningJourneyTimeline items={sampleTimeline} loadingMore={false} onLoadMore={vi.fn()} />
    )

    expect(html).toContain('role="tablist"')
    expect(html).toContain('role="tab"')
    expect(html).toContain('role="tabpanel"')
    expect(html).toContain('aria-selected=')
    expect(html).toContain('aria-label="Week 3')

    // Ensure raw IDs like 'v-1', 'v-2' or CAP internal names are NOT leaked in rendered HTML text
    expect(html).not.toContain('v-1')
    expect(html).not.toContain('v-2')
    expect(html).not.toContain('CAP_')
  })

  it('7. renders truthful uncertainty fallback when reading trajectory is empty or unspecified', () => {
    const uncertainItem: LearningTimelineItem[] = [
      {
        sequenceNumber: 1,
        recordedAt: '2026-08-01T00:00:00Z',
        readingTrajectory: '',
        introducedCount: 4,
        reviewedCount: 0,
        introducedLabels: [],
        reviewedLabels: [],
        difficulties: [],
        improvements: [],
        nextReviewReasons: [],
      },
    ]

    const html = renderToStaticMarkup(
      <LearningJourneyTimeline items={uncertainItem} loadingMore={false} onLoadMore={vi.fn()} />
    )

    // Falls back gracefully to truthful uncertainty label
    expect(html).toContain('尚待觀察')
  })

  it('8. synchronizes container width with SVG viewBox and aligns node coordinates precisely without drift', () => {
    const html = renderToStaticMarkup(
      <LearningJourneyTimeline items={sampleTimeline} loadingMore={false} onLoadMore={vi.fn()} />
    )

    // For 3 items: totalWidth is PADDING_X * 2 + 2 * STEP_WIDTH = 48 * 2 + 2 * 76 = 248px
    expect(html).toContain('width:248px')
    expect(html).toContain('viewBox="0 0 248 116"')
    expect(html).not.toContain('min-width')
    expect(html).not.toContain('minWidth')

    // SVG path connects the calculated coordinates (48, 56) -> (124, 42) -> (200, 64)
    expect(html).toContain('d=" M 48 56 L 124 42 L 200 64"')

    // Week nodes have matching style left coordinates (48px, 124px, 200px)
    expect(html).toContain('style="left:48px;top:56px"')
    expect(html).toContain('style="left:124px;top:42px"')
    expect(html).toContain('style="left:200px;top:64px"')
  })
})
