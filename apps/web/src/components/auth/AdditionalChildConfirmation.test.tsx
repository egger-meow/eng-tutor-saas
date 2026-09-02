import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdditionalChildConfirmation } from './AdditionalChildConfirmation'

vi.mock('../../lib/onboarding-handoff', () => ({
  confirmAdditionalChildOnboarding: vi.fn(),
  discardPendingOnboarding: vi.fn(),
}))

describe('AdditionalChildConfirmation', () => {
  it('asks a returning parent before creating another child and offers a safe escape', () => {
    const html = renderToStaticMarkup(
      <AdditionalChildConfirmation
        existingChildName="小宇"
        pendingChildName="小安"
        busy={false}
        error=""
        onConfirm={() => {}}
        onDiscard={() => {}}
      />,
    )

    expect(html).toContain('這個帳號已經有孩子')
    expect(html).toContain('小宇')
    expect(html).toContain('小安')
    expect(html).toContain('剛剛填的是另一位孩子嗎？')
    expect(html).toContain('是，新增另一位孩子')
    expect(html).toContain('不是，回到原本孩子管理')
  })
})
