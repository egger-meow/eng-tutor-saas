import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LandingOnboardingPanel } from './LandingOnboardingPanel'

vi.mock('../../lib/supabase', () => ({
  getSupabaseClient: vi.fn(() => ({
    rpc: vi.fn(),
    auth: { signInWithOtp: vi.fn() },
  })),
}))

describe('LandingOnboardingPanel', () => {
  it('starts with child learning data instead of an email gate', () => {
    const html = renderToStaticMarkup(<LandingOnboardingPanel />)

    expect(html).toContain('先抓孩子現在的大概位置')
    expect(html).toContain('孩子暱稱')
    expect(html).not.toContain('type="email"')
    expect(html).toContain('已有帳號')
    expect(html).toContain('繼續')
  })
})
