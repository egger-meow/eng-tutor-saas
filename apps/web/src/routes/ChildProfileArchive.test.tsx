import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ChildArchiveControl } from '../components/profile/ChildArchiveControl'

const noop = vi.fn()

describe('child profile archive UX contract', () => {
  it('explains the safe removal option before confirmation', () => {
    const html = renderToStaticMarkup(
      <ChildArchiveControl
        childName="小宇"
        confirming={false}
        busy={false}
        error=""
        onRequestArchive={noop}
        onConfirmArchive={noop}
        onCancelArchive={noop}
      />,
    )

    expect(html).toContain('移除孩子')
    expect(html).toContain('不小心重複建立')
  })

  it('shows history retention and billing guard at the destructive confirmation step', () => {
    const html = renderToStaticMarkup(
      <ChildArchiveControl
        childName="小宇"
        confirming
        busy={false}
        error=""
        onRequestArchive={noop}
        onConfirmArchive={noop}
        onCancelArchive={noop}
      />,
    )

    expect(html).toContain('確認移除')
    expect(html).toContain('過往教材與帳務紀錄仍會保留')
    expect(html).toContain('付費訂閱')
    expect(html).toContain('保留孩子')
  })
})
