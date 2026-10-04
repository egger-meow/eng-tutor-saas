import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MaterialNextStepPanel } from './MaterialNextStepPanel'

describe('MaterialNextStepPanel', () => {
  it('renders primary request button and optional feedback button when unrequested', () => {
    const html = renderToStaticMarkup(
      <MaterialNextStepPanel
        materialId="m1"
        nextRequested={false}
        actionBusy={false}
        onRequestNext={vi.fn()}
        feedbackChoice="ask"
        onOpenFeedback={vi.fn()}
        onSkipFeedback={vi.fn()}
      />
    )

    expect(html).toContain('申請下一份教材')
    expect(html).toContain('回饋為選填；若無特別觀察，可直接申請下一份。')
    expect(html).toContain('補充學習回饋（選填）')
    expect(html).toContain('略過回饋')
  })

  it('renders requested state without duplicate request button when already requested', () => {
    const html = renderToStaticMarkup(
      <MaterialNextStepPanel
        materialId="m1"
        nextRequested={true}
        actionBusy={false}
        onRequestNext={vi.fn()}
        feedbackChoice="skip"
        onOpenFeedback={vi.fn()}
        onSkipFeedback={vi.fn()}
      />
    )

    expect(html).toContain('已收到下一份教材申請')
    expect(html).not.toContain('button-primary')
  })

  it('renders monthly quota limit notice when limit reached', () => {
    const html = renderToStaticMarkup(
      <MaterialNextStepPanel
        materialId="m1"
        nextRequested={false}
        requestMessage="本服務月已使用 4/4 份，下個服務月可再申請。"
        actionBusy={false}
        onRequestNext={vi.fn()}
        feedbackChoice="skip"
        onOpenFeedback={vi.fn()}
        onSkipFeedback={vi.fn()}
      />
    )

    expect(html).toContain('達到每服務月教材上限')
    expect(html).toContain('本服務月已使用 4/4 份')
  })
})
