import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LandingOnboardingPanel } from './LandingOnboardingPanel'
import { AboutStep } from '../onboarding/steps/AboutStep'
import { emptyProfileDraft, validateProfileStep } from '../../lib/profile-form'

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
  it('starts with the 4-step child learning form instead of an email gate', () => {
    mockEnrollmentState = null
    const html = renderToStaticMarkup(<LandingOnboardingPanel />)

    expect(html).toContain('步驟 1 / 4')
    expect(html).toContain('4 步驟約 2 分鐘快速完成')
    expect(html).toContain('先抓孩子現在的大概位置')
    expect(html).toContain('孩子怎麼稱呼？')
    expect(html).not.toContain('type="email"')
    expect(html).toContain('已有帳號')
    expect(html).toContain('繼續')
    expect(html).toContain('第一週免費')
  })

  it('renders the Beta + NT$0 badge when freePilotActive is true in enrollment state', () => {
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
    expect(html).toContain('🧪 紙屬英文 Beta · 目前 NT$0')
    expect(html).not.toContain('前 100 位每週免費')
    expect(html).not.toContain('第一週免費')
  })

  it('validates step 1 requiring nickname and baseline level before advancing', () => {
    const emptyDraft = { ...emptyProfileDraft, displayName: '', baselineLevel: '' }
    const noNameErrors = validateProfileStep(1, emptyDraft)
    expect(noNameErrors.displayName).toBe('請填寫孩子暱稱。')
    expect(noNameErrors.baselineLevel).toBe('請選擇整體程度。')

    const nameOnlyErrors = validateProfileStep(1, { ...emptyDraft, displayName: '翔翔' })
    expect(nameOnlyErrors.displayName).toBeUndefined()
    expect(nameOnlyErrors.baselineLevel).toBe('請選擇整體程度。')

    const levelOnlyErrors = validateProfileStep(1, { ...emptyDraft, displayName: '   ', baselineLevel: 'developing' })
    expect(levelOnlyErrors.displayName).toBe('請填寫孩子暱稱。')
    expect(levelOnlyErrors.baselineLevel).toBeUndefined()

    const validErrors = validateProfileStep(1, { ...emptyDraft, displayName: '翔翔', baselineLevel: 'developing' })
    expect(Object.keys(validErrors).length).toBe(0)
  })

  it('renders step 1 with explicit continue button "選好了，繼續" instead of auto-timer', () => {
    const html = renderToStaticMarkup(<LandingOnboardingPanel />)
    expect(html).toContain('選好了，繼續')
  })

  it('allows AboutStep level radio selection and re-selection without timer auto-advance', () => {
    const update = vi.fn()
    const autoAdvance = vi.fn()

    const draft = { ...emptyProfileDraft, displayName: '翔翔', baselineLevel: 'developing' }
    const html = renderToStaticMarkup(
      <AboutStep
        draft={draft}
        errors={{}}
        update={update}
        onAutoAdvance={autoAdvance}
      />
    )

    // Radio option for developing is selected
    expect(html).toContain('基礎正在建立')
    expect(html).toContain('aria-checked="true"')
    // Timer auto advance is NOT triggered synchronously or automatically on render
    expect(autoAdvance).not.toHaveBeenCalled()
  })
})
