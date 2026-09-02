import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AdditionalChildConfirmation } from './AdditionalChildConfirmation'

describe('returning-parent onboarding confirmation UI contract', () => {
  it('requires an explicit choice before the pending landing draft can become another child', () => {
    const html = renderToStaticMarkup(
      <AdditionalChildConfirmation
        existingChildName="小宇"
        busy={false}
        error=""
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
      />,
    )

    expect(html).toContain('這個帳號已經有孩子')
    expect(html).toContain('小宇')
    expect(html).toContain('剛剛填的是另一位孩子嗎？')
    expect(html).toContain('是，新增另一位孩子')
    expect(html).toContain('不是，回到原本孩子管理')
    expect(html).toContain('我們不會自動新增第二份孩子資料')
  })
})
