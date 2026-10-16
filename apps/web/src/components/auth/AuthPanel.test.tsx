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
    expect(html).toContain('terms')
    expect(html).toContain('privacy')
    expect(html).toContain('服務條款')
    expect(html).toContain('隱私權政策')
  })

  it('focuses exclusively on child onboarding in public landing mode by default without side-by-side login card', () => {
    const html = renderToStaticMarkup(<AuthPanel isPublicLanding={true} />)

    expect(html).toContain('landing-onboarding-card')
    expect(html).not.toContain('landing-login-card')
    expect(html).toContain('第一次使用？先填孩子資料')
    expect(html).toContain('已經幫孩子建立過檔案？')
    expect(html).toContain('點此登入查看教材 →')
  })
})

