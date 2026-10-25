import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MaterialNextStepPanel } from './MaterialNextStepPanel'

describe('MaterialNextStepPanel', () => {
  it.each(['failed', 'canceled'] as const)('reports %s requests without promising preparation', (nextRequestStatus) => {
    const html = renderToStaticMarkup(<MaterialNextStepPanel materialId="m1" nextRequested
      nextRequestStatus={nextRequestStatus} actionBusy={false} onRequestNext={vi.fn()}
      feedbackChoice="skip" onOpenFeedback={vi.fn()} onSkipFeedback={vi.fn()} />)
    expect(html).toContain('下一份教材未完成')
    expect(html).not.toContain('系統正在為孩子')
    expect(html).not.toContain('button-primary')
    expect(html).toContain('家長觀察')
  })
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
    expect(html).toContain('新增／修改家長觀察（選填）')
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
    expect(html).toContain('新增／修改家長觀察（選填）')
    expect(html).not.toContain('預計 7 天後完成')
    expect(html).not.toContain('第 2 週')
    expect(html).not.toContain('button-primary')
    expect(html).toContain('家長觀察')
  })

  it('keeps editing available after saving', () => {
    const html = renderToStaticMarkup(<MaterialNextStepPanel materialId="m1" nextRequested actionBusy={false} onRequestNext={vi.fn()} feedbackChoice="saved" onOpenFeedback={vi.fn()} onSkipFeedback={vi.fn()} />)
    expect(html).toContain('修改家長觀察／回饋')
    expect(html).toContain('家長回饋已儲存')
    expect(html).not.toContain('一併納入下一份')
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
