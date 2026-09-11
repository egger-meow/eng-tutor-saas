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
          retakeEligible: false,
          daysSinceCompleted: null,
          cooldownDays: 90,
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
          retakeEligible: false,
          daysSinceCompleted: null,
          cooldownDays: 90,
        }}
      />
    )

    expect(html).toContain('繼續程度診斷')
    expect(html).toContain('已完成 7 題')
  })

  it('renders recent completed state (<90 days) with view result CTA and cooldown note', () => {
    const html = renderToStaticMarkup(
      <AssessmentRecommendation
        childId="c1111111-1111-1111-1111-111111111111"
        initialOverview={{
          childId: 'c1111111-1111-1111-1111-111111111111',
          status: 'completed',
          sessionId: 's1111111-1111-1111-1111-111111111111',
          itemsCompleted: 18,
          targetItemCount: 18,
          completedAt: '2026-09-01T00:00:00Z',
          retakeEligible: false,
          daysSinceCompleted: 11,
          cooldownDays: 90,
        }}
      />
    )

    expect(html).toContain('程度診斷已完成')
    expect(html).toContain('查看診斷結果')
    expect(html).toContain('下次可重新診斷時間為完成後 90 天')
    expect(html).not.toContain('action=retake')
  })

  it('renders retake-eligible state (90+ days) with retake and view previous CTAs', () => {
    const html = renderToStaticMarkup(
      <AssessmentRecommendation
        childId="c1111111-1111-1111-1111-111111111111"
        initialOverview={{
          childId: 'c1111111-1111-1111-1111-111111111111',
          status: 'completed',
          sessionId: 's1111111-1111-1111-1111-111111111111',
          itemsCompleted: 18,
          targetItemCount: 18,
          completedAt: '2026-06-01T00:00:00Z',
          retakeEligible: true,
          daysSinceCompleted: 95,
          cooldownDays: 90,
        }}
      />
    )

    expect(html).toContain('建議更新程度診斷')
    expect(html).toContain('上次診斷已超過 90 天')
    expect(html).toContain('重新診斷')
    expect(html).toContain('/children/c1111111-1111-1111-1111-111111111111/assessment?action=retake')
    expect(html).toContain('查看上次結果')
    expect(html).toContain('/children/c1111111-1111-1111-1111-111111111111/assessment')
  })
})
