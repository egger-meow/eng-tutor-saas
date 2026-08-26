import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BillingPage } from './BillingPage'
import type { Session } from '@supabase/supabase-js'
import type { Child } from '../lib/children'
import type { SubscriptionView } from '../lib/subscriptions'
import * as configLib from '../lib/config'

vi.mock('../lib/children', () => ({
  listChildren: vi.fn(),
}))
vi.mock('../lib/subscriptions', () => ({
  listOwnedSubscriptions: vi.fn(),
  cancelSubscription: vi.fn(),
  resumeSubscription: vi.fn(),
  prepareCheckout: vi.fn(),
}))
vi.mock('../lib/waitlist', () => ({
  listOwnedWaitlist: vi.fn(),
}))
vi.mock('../lib/paddle', () => ({
  openPaddleCheckout: vi.fn(),
  closePaddleCheckout: vi.fn(),
}))
vi.mock('../lib/supabase', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: { signOut: vi.fn() },
  })),
}))
vi.mock('../lib/enrollment', () => ({
  useEnrollmentState: () => ({ state: { status: 'open', capacity: 100, activeCount: 1, remaining: 99, foundingLimit: 30, foundingCount: 0 } }),
  getEnrollmentCta: () => ({ label: '免費取得第一週教材', href: '/#login', isWaitlist: false }),
}))

const mockSession: Session = {
  access_token: 'test-token',
  refresh_token: 'test-refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'parent-123',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-08-01T00:00:00Z',
    email: 'parent@example.com',
  },
}

const mockChild: Child = {
  id: 'child-1',
  display_name: '小明',
  grade: 7,
  grade_stage: 'grade_7',
  is_active: true,
  timezone: 'Asia/Taipei',
  delivery_weekday: 1,
  textbook_version: null,
  next_generation_at: null,
  created_at: '2026-08-01T00:00:00Z',
}

const mockSubscription: SubscriptionView = {
  id: 'sub-1',
  childId: 'child-1',
  status: 'active',
  planCode: 'standard_monthly',
  billingInterval: 'month',
  priceTwd: 499,
  currentPeriodEnd: '2026-09-16T00:00:00Z',
  cancelAtPeriodEnd: false,
  foundingStatus: 'none',
}

describe('BillingPage Loading & Legal Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. renders billing page shell and initial loading spinner safely', () => {
    const html = renderToStaticMarkup(<BillingPage session={mockSession} />)

    expect(html).toContain('每位孩子的訂閱')
    expect(html).toContain('方案與交付週期彼此獨立')
    expect(html).toContain('正在讀取訂閱…')
  })

  it('2. still displays children and subscription cards even if legal-state lookup fails', () => {
    const html = renderToStaticMarkup(
      <BillingPage
        session={mockSession}
        initialChildren={[mockChild]}
        initialSubscriptions={[mockSubscription]}
        initialWaitlist={[]}
        initialLegalLoaded={false}
        initialLegalError={'目前無法確認服務條款同意紀錄，暫時無法開啟付款。'}
      />
    )

    // Subscriptions and child data MUST still render
    expect(html).toContain('小明')
    expect(html).toContain('月繳方案・每月 NT$499')

    // Global subscription load error must NOT be present
    expect(html).not.toContain('目前無法讀取訂閱資料，請稍後再試。')

    // Legal-specific error notice MUST be shown to explain why checkout is restricted
    expect(html).toContain('目前無法確認服務條款同意紀錄，暫時無法開啟付款。')
  })

  it('3. prompts for terms re-acceptance immediately when terms are outdated without review gate block', () => {
    const html = renderToStaticMarkup(
      <BillingPage
        session={mockSession}
        initialChildren={[mockChild]}
        initialSubscriptions={[mockSubscription]}
        initialWaitlist={[]}
        initialAcceptedTermsVersion={'2026-08-16-v1'}
        initialLegalLoaded={true}
      />
    )

    expect(html).toContain('付款前請確認新版服務條款')
    expect(html).toContain('我已閱讀並同意 2026-08-26-v2 服務條款')
    expect(html).not.toContain('新版服務條款審閱期間')
  })

  it('4. renders normal subscription interface without re-acceptance prompt when terms version is current', () => {
    vi.spyOn(configLib, 'isCurrentTermsEffective').mockReturnValue(true)
    const html = renderToStaticMarkup(
      <BillingPage
        session={mockSession}
        initialChildren={[mockChild]}
        initialSubscriptions={[mockSubscription]}
        initialWaitlist={[]}
        initialAcceptedTermsVersion={'2026-08-26-v2'}
        initialLegalLoaded={true}
      />
    )

    expect(html).toContain('小明')
    expect(html).not.toContain('付款前請確認新版服務條款')
    expect(html).not.toContain('目前無法確認服務條款同意紀錄')
  })
})
