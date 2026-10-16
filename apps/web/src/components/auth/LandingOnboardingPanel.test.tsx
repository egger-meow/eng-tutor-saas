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
  it('starts with the 2-step child learning express form instead of an email gate', () => {
    mockEnrollmentState = null
    const html = renderToStaticMarkup(<LandingOnboardingPanel />)

    expect(html).toContain('步驟 1 / 2')
    expect(html).toContain('2 步驟約 60 秒快速完成')
    expect(html).toContain('先抓孩子起點與熱門興趣')
    expect(html).toContain('孩子怎麼稱呼？')
    expect(html).toContain('🏀 籃球與運動')
    expect(html).not.toContain('type="email"')
    expect(html).toContain('已經幫孩子建立過檔案？')
    expect(html).toContain('下一步：輸入 Email 立即製作教材 →')
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

  it('renders step 1 with explicit continue button "下一步：輸入 Email 立即製作教材 →" instead of auto-timer', () => {
    const html = renderToStaticMarkup(<LandingOnboardingPanel />)
    expect(html).toContain('下一步：輸入 Email 立即製作教材 →')
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

  it('renders 1-tap interest chips when showExpressInterests is true in AboutStep', () => {
    const update = vi.fn()
    const html = renderToStaticMarkup(
      <AboutStep
        draft={{ ...emptyProfileDraft, displayName: '翔翔', baselineLevel: 'developing' }}
        errors={{}}
        update={update}
        showExpressInterests={true}
      />
    )
    expect(html).toContain('🏀 籃球與運動')
    expect(html).toContain('🎮 電玩與遊戲')
    expect(html).toContain('選填：指定學校課本版本或調整每週時間')
  })
})
