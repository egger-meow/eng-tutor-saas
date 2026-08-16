import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProductFeedbackForm } from './ProductFeedbackForm'

vi.mock('../../lib/supabase', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}))

describe('ProductFeedbackForm', () => {
  it('renders categories and the printed delivery interest checkbox', () => {
    const html = renderToStaticMarkup(<ProductFeedbackForm />)

    expect(html).toContain('這是哪一類回饋？')
    expect(html).toContain('發現問題')
    expect(html).toContain('操作流程')
    expect(html).toContain('教材內容')
    expect(html).toContain('其他建議')
    expect(html).toContain('我希望未來提供紙本教材寄送到家（若約 NT$699／月）')
  })
})
