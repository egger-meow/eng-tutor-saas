import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LandingOnboardingPanel } from './LandingOnboardingPanel'

vi.mock('../../lib/supabase', () => ({
  getSupabaseClient: vi.fn(() => ({
    rpc: vi.fn(),
    auth: { signInWithOtp: vi.fn() },
  })),
}))

let mockEnrollmentState: any = null

vi.mock('../../lib/enrollment', () => ({
  useEnrollmentState: () => ({
    state: mockEnrollmentState,
    loading: false,
    error: null,
  }),
}))

describe('LandingOnboardingPanel', () => {
  it('starts with the existing child learning form instead of an email gate', () => {
    mockEnrollmentState = null
    const html = renderToStaticMarkup(<LandingOnboardingPanel />)

    expect(html).toContain('先抓孩子現在的大概位置')
    expect(html).toContain('孩子怎麼稱呼？')
    expect(html).not.toContain('type="email"')
    expect(html).toContain('已有帳號')
    expect(html).toContain('繼續')
    expect(html).toContain('第一週免費')
  })

  it('renders free pilot badge when freePilotActive is true in enrollment state', () => {
    mockEnrollmentState = {
      status: 'open',
      capacity: 100,
      activeCount: 10,
      remaining: 90,
      foundingLimit: 30,
      foundingCount: 5,
      freePilotActive: true,
      freePilotAdmissions: 10,
      freePilotLimit: 100,
    }

    const html = renderToStaticMarkup(<LandingOnboardingPanel />)
    expect(html).toContain('前 100 位每週免費')
    expect(html).not.toContain('第一週免費')
  })
})
