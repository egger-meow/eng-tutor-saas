import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LearningBarrierCard } from './LearningBarrierCard'
import type { MaterialLearningCheckin } from '../../lib/material-learning-checkin'

describe('LearningBarrierCard', () => {
  it('returns empty when released less than 48 hours ago', () => {
    const recentRelease = new Date(Date.now() - 3600 * 1000).toISOString() // 1 hour ago
    const html = renderToStaticMarkup(
      <LearningBarrierCard
        materialId="mat-1"
        childId="child-1"
        releasedAt={recentRelease}
        hasAnswerStarted={false}
        hasSubmission={false}
        initialCheckin={null}
      />
    )
    expect(html).toBe('')
  })

  it('returns empty when submission or answer_started already exists', () => {
    const oldRelease = new Date(Date.now() - 72 * 3600 * 1000).toISOString() // 72 hours ago
    const htmlSubmission = renderToStaticMarkup(
      <LearningBarrierCard
        materialId="mat-1"
        childId="child-1"
        releasedAt={oldRelease}
        hasAnswerStarted={false}
        hasSubmission={true}
        initialCheckin={null}
      />
    )
    expect(htmlSubmission).toBe('')

    const htmlStarted = renderToStaticMarkup(
      <LearningBarrierCard
        materialId="mat-1"
        childId="child-1"
        releasedAt={oldRelease}
        hasAnswerStarted={true}
        hasSubmission={false}
        initialCheckin={null}
      />
    )
    expect(htmlStarted).toBe('')
  })

  it('renders barrier options when released > 48 hours ago and no progress yet', () => {
    const oldRelease = new Date(Date.now() - 72 * 3600 * 1000).toISOString()
    const html = renderToStaticMarkup(
      <LearningBarrierCard
        materialId="mat-1"
        childId="child-1"
        releasedAt={oldRelease}
        hasAnswerStarted={false}
        hasSubmission={false}
        answerUnlockRequiresSubmission={false}
        initialCheckin={null}
      />
    )

    expect(html).toContain('這份教材在開始上有遇到困難嗎？')
    expect(html).toContain('時間不夠')
    expect(html).toContain('不方便列印')
    expect(html).toContain('內容偏難')
    expect(html).toContain('孩子沒興趣')
    expect(html).toContain('沒收到通知信')
    expect(html).toContain('已用紙筆開始')
    expect(html).toContain('暫時略過（7日內不提醒）')
  })

  it('shows selected barrier tip and CTA when barrier is preselected', () => {
    const oldRelease = new Date(Date.now() - 72 * 3600 * 1000).toISOString()
    const checkin: MaterialLearningCheckin = {
      barrier: 'no_time',
      paper_started_at: null,
      dismissed_until: null,
    }
    const html = renderToStaticMarkup(
      <LearningBarrierCard
        materialId="mat-1"
        childId="child-1"
        releasedAt={oldRelease}
        hasAnswerStarted={false}
        hasSubmission={false}
        initialCheckin={checkin}
      />
    )

    expect(html).toContain('不用一次做完整份。今天先安排約 10 分鐘，讀一段、試兩題即可。')
    expect(html).toContain('開始 10 分鐘')
    expect(html).toContain('href="/materials/mat-1"')
  })

  it('returns empty when checkin was dismissed into the future', () => {
    const oldRelease = new Date(Date.now() - 72 * 3600 * 1000).toISOString()
    const futureDismiss = new Date(Date.now() + 5 * 86400 * 1000).toISOString()
    const checkin: MaterialLearningCheckin = {
      barrier: null,
      paper_started_at: null,
      dismissed_until: futureDismiss,
    }
    const html = renderToStaticMarkup(
      <LearningBarrierCard
        materialId="mat-1"
        childId="child-1"
        releasedAt={oldRelease}
        hasAnswerStarted={false}
        hasSubmission={false}
        initialCheckin={checkin}
      />
    )
    expect(html).toBe('')
  })
})
