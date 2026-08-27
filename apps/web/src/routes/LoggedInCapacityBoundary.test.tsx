import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Session } from '@supabase/supabase-js'

vi.mock('../hooks/use-parent-data', () => ({
  useParentData: () => ({
    children: [],
    materials: [],
    materialOffsets: {},
    materialHasMore: {},
    releasedMaterialCounts: {},
    loadingMoreMaterials: {},
    loading: false,
    error: '',
    refresh: vi.fn(),
    getMaterialsForChild: vi.fn(() => []),
    loadMoreMaterials: vi.fn(),
  }),
}))

vi.mock('../lib/children', () => ({ listChildren: vi.fn() }))
vi.mock('../lib/subscriptions', () => ({
  listOwnedSubscriptions: vi.fn(), cancelSubscription: vi.fn(), resumeSubscription: vi.fn(), prepareCheckout: vi.fn(),
}))
vi.mock('../lib/waitlist', () => ({ listOwnedWaitlist: vi.fn() }))
vi.mock('../lib/paddle', () => ({ openPaddleCheckout: vi.fn(), closePaddleCheckout: vi.fn() }))
vi.mock('../lib/supabase', () => ({
  getSupabaseClient: () => ({ auth: { signOut: vi.fn() } }),
}))
vi.mock('../lib/enrollment', () => ({
  useEnrollmentState: (initialState?: any) => ({
    state: initialState !== undefined ? initialState : { status: 'open', capacity: 100, activeCount: 100, remaining: 0, foundingLimit: 30, foundingCount: 17 },
    error: false,
  }),
  getEnrollmentCta: () => ({ label: '登記候補', href: '/waitlist', isWaitlist: true }),
}))

import { BillingPage } from './BillingPage'
import { DashboardPage } from './DashboardPage'
import { ChildOnboardingPage } from './ChildOnboardingPage'
import { emptyProfileDraft } from '../lib/profile-form'

const session: Session = {
  access_token: 'token',
  refresh_token: 'refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'parent-1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-08-27T00:00:00Z',
    email: 'parent@example.com',
  },
}

describe('logged-in 100+ capacity boundary', () => {
  it('dashboard tells a parent with no child that profile creation enters waitlist without charge', () => {
    const html = renderToStaticMarkup(<DashboardPage session={session} />)

    expect(html).toContain('目前名額已滿')
    expect(html).toContain('先建立孩子學習資料')
    expect(html).toContain('不會收費')
  })

  it('billing empty state does not promise next-day material while capacity is full', () => {
    const html = renderToStaticMarkup(
      <BillingPage
        session={session}
        initialChildren={[]}
        initialSubscriptions={[]}
        initialWaitlist={[]}
        initialAcceptedTermsVersion="2026-08-26-v2"
        initialLegalLoaded={true}
      />
    )

    expect(html).toContain('目前名額已滿')
    expect(html).toContain('先建立孩子學習資料')
    expect(html).toContain('不會收費')
    expect(html).not.toContain('第一份專屬教材預計隔天開放下載')
  })

  it('onboarding (/children/new) explains waitlist, free profile creation, no immediate charge/materials, and email notification before submission when capacity is full', () => {
    const html = renderToStaticMarkup(<ChildOnboardingPage session={session} />)

    expect(html).toContain('目前名額已滿')
    expect(html).toContain('進入候補名單')
    expect(html).toContain('不會收費')
    expect(html).toContain('不會開始訂閱或產生教材')
    expect(html).toContain('Email')
    expect(html).toContain('決定是否訂閱')
    expect(html).toContain('孩子暱稱')
    expect(html).not.toContain('隔天開放下載')
  })

  it('onboarding (/children/new) preserves standard onboarding UX without waitlist notice when capacity is open', () => {
    const html = renderToStaticMarkup(
      <ChildOnboardingPage
        session={session}
        initialEnrollment={{ status: 'open', capacity: 100, activeCount: 40, remaining: 60, foundingLimit: 30, foundingCount: 30 }}
      />
    )

    expect(html).not.toContain('候補名單')
    expect(html).not.toContain('目前名額已滿')
    expect(html).toContain('先認識孩子')
    expect(html).toContain('孩子暱稱')
  })

  it('editing an existing child profile does not show waitlist notice even when capacity is full', () => {
    const html = renderToStaticMarkup(
      <ChildOnboardingPage
        session={session}
        childId="child-1"
        initialDraft={{ ...emptyProfileDraft, displayName: 'Jonathan', grade: 7, gradeStage: 'grade_7' }}
      />
    )

    expect(html).not.toContain('候補名單')
    expect(html).not.toContain('目前名額已滿')
    expect(html).toContain('Jonathan')
  })

  it('onboarding (/children/new) stays neutral and does not claim waitlist or guaranteed availability while enrollment state is loading', () => {
    const html = renderToStaticMarkup(
      <ChildOnboardingPage
        session={session}
        initialEnrollment={null}
      />
    )

    expect(html).not.toContain('候補名單')
    expect(html).not.toContain('目前名額已滿')
    expect(html).not.toContain('隔天開放下載')
    expect(html).toContain('先認識孩子')
    expect(html).toContain('孩子暱稱')
  })
})
