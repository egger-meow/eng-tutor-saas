import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AuthPanel } from './AuthPanel'

vi.mock('../../lib/supabase', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: {
      signInWithOtp: vi.fn(),
    },
  })),
}))

describe('AuthPanel legal consent markup', () => {
  it('renders visible legal consent copy with direct links to terms and privacy', () => {
    const html = renderToStaticMarkup(<AuthPanel />)

    expect(html).toContain('點擊送出即代表您已審閱並同意紙屬英文的')
    expect(html).toContain('href="/terms"')
    expect(html).toContain('href="/privacy"')
    expect(html).toContain('服務條款')
    expect(html).toContain('隱私權政策')
  })
})
