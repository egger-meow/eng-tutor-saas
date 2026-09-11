import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AssessmentRecommendation } from './AssessmentRecommendation'

describe('AssessmentRecommendation Component', () => {
  it('renders never started state with correct copy and CTA', () => {
    const html = renderToStaticMarkup(
      <AssessmentRecommendation
        childId="c1111111-1111-1111-1111-111111111111"
        initialOverview={{
          childId: 'c1111111-1111-1111-1111-111111111111',
          status: 'not_started',
          sessionId: null,
          itemsCompleted: 0,
          targetItemCount: 18,
          completedAt: null,
        }}
      />
    )

    expect(html).toContain('更精準了解目前程度')
    expect(html).toContain('讓孩子完成一段簡短的英文程度診斷')
    expect(html).toContain('開始程度診斷')
    expect(html).toContain('/children/c1111111-1111-1111-1111-111111111111/assessment')
  })

  it('renders in-progress resume state with completed item count hint', () => {
    const html = renderToStaticMarkup(
      <AssessmentRecommendation
        childId="c1111111-1111-1111-1111-111111111111"
        initialOverview={{
          childId: 'c1111111-1111-1111-1111-111111111111',
          status: 'in_progress',
          sessionId: 's1111111-1111-1111-1111-111111111111',
          itemsCompleted: 7,
          targetItemCount: 18,
          completedAt: null,
        }}
      />
    )

    expect(html).toContain('繼續程度診斷')
    expect(html).toContain('已完成 7 題')
  })

  it('renders completed state with view result CTA', () => {
    const html = renderToStaticMarkup(
      <AssessmentRecommendation
        childId="c1111111-1111-1111-1111-111111111111"
        initialOverview={{
          childId: 'c1111111-1111-1111-1111-111111111111',
          status: 'completed',
          sessionId: 's1111111-1111-1111-1111-111111111111',
          itemsCompleted: 18,
          targetItemCount: 18,
          completedAt: '2026-09-12T00:00:00Z',
        }}
      />
    )

    expect(html).toContain('查看診斷結果')
  })
})
