import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ChildSubscription } from './ChildSubscription'
import type { Child } from '../../lib/children'
import type { SubscriptionView } from '../../lib/subscriptions'

const child: Child = {
  id: 'child-capacity',
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

const expiredBetaLikeSubscription: SubscriptionView = {
  id: 'sub-beta',
  childId: child.id,
  status: 'trialing',
  planCode: null,
  billingInterval: null,
  priceTwd: null,
  currentPeriodEnd: '2026-08-20T00:00:00Z',
  cancelAtPeriodEnd: false,
  foundingStatus: 'none',
}

const releasedWaitlist = {
  id: 'wait-1', childId: child.id, status: 'released' as const, createdAt: '2026-08-27T00:00:00Z',
  releasedAt: '2026-08-27T02:00:00Z', convertedAt: null, notes: null,
}

const callbacks = {
  onSubscribe: vi.fn(),
  onCancel: vi.fn(),
  onResume: vi.fn(),
}

describe('billing capacity lifecycle boundaries', () => {
  it('waiting status wins over a stale beta subscription and never exposes checkout controls', () => {
    const html = renderToStaticMarkup(
      <ChildSubscription
        child={child}
        subscription={expiredBetaLikeSubscription}
        waitlist={{
          id: 'wait-1', childId: child.id, status: 'waiting', createdAt: '2026-08-27T00:00:00Z',
          releasedAt: null, convertedAt: null, notes: null,
        }}
        {...callbacks}
      />
    )

    expect(html).toContain('等候名單中')
    expect(html).toContain('目前不會產生任何費用')
    expect(html).not.toContain('選擇付款週期')
    expect(html).not.toContain('開始訂閱')
  })

  it('released status wins over a stale beta subscription and clearly re-enables checkout', () => {
    const html = renderToStaticMarkup(
      <ChildSubscription
        child={child}
        subscription={expiredBetaLikeSubscription}
        waitlist={releasedWaitlist}
        {...callbacks}
      />
    )

    expect(html).toContain('名額已開放')
    expect(html).toContain('請選擇訂閱方案')
    expect(html).toContain('選擇付款週期')
  })

  it('payment activation state wins after a released waitlist checkout completes', () => {
    const html = renderToStaticMarkup(
      <ChildSubscription
        child={child}
        subscription={expiredBetaLikeSubscription}
        waitlist={releasedWaitlist}
        activationPending
        {...callbacks}
      />
    )

    expect(html).toContain('付款成功・訂閱啟用中')
    expect(html).toContain('正在同步 Paddle 的確認結果')
    expect(html).not.toContain('選擇付款週期')
  })
})
