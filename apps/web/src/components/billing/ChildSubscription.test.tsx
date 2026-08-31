import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ChildSubscription, founderCancellationWarning } from './ChildSubscription'
import type { Child } from '../../lib/children'
import type { SubscriptionView } from '../../lib/subscriptions'

const mockChild: Child = {
  id: 'child-123',
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

describe('ChildSubscription Component', () => {
  it('1. active + !cancelAtPeriodEnd: does NOT show plan switch button, shows cancel button and reassuring copy', () => {
    const subscription: SubscriptionView = {
      id: 'sub-1',
      childId: 'child-123',
      status: 'active',
      planCode: 'standard_monthly',
      billingInterval: 'month',
      priceTwd: 499,
      currentPeriodEnd: '2026-09-16T00:00:00Z',
      cancelAtPeriodEnd: false,
      foundingStatus: 'none',
    }

    const html = renderToStaticMarkup(
      <ChildSubscription
        child={mockChild}
        subscription={subscription}
        onSubscribe={vi.fn()}
        onCancel={vi.fn()}
        onResume={vi.fn()}
      />
    )

    expect(html).toContain('訂閱中')
    expect(html).toContain('目前方案：')
    expect(html).toContain('月繳方案・每月 NT$499')
    expect(html).toContain('本期至：')
    expect(html).toContain('取消續訂')
    expect(html).not.toContain('變更方案')
    expect(html).not.toContain('變更為年繳')
    expect(html).not.toContain('變更為月繳')
    expect(html).not.toContain('選擇付款週期')
    expect(html).toContain('如果只是想改付款週期也沒問題。本期結束後，可以重新選擇月繳或年繳方案。')
  })

  it('2. active + cancelAtPeriodEnd: shows canceled renewal status, resume button, and explanation that plan can be re-selected upon expiry', () => {
    const subscription: SubscriptionView = {
      id: 'sub-1',
      childId: 'child-123',
      status: 'active',
      planCode: 'standard_monthly',
      billingInterval: 'month',
      priceTwd: 499,
      currentPeriodEnd: '2026-09-16T00:00:00Z',
      cancelAtPeriodEnd: true,
      foundingStatus: 'none',
    }

    const html = renderToStaticMarkup(
      <ChildSubscription
        child={mockChild}
        subscription={subscription}
        onSubscribe={vi.fn()}
        onCancel={vi.fn()}
        onResume={vi.fn()}
      />
    )

    expect(html).toContain('已取消自動續訂')
    expect(html).toContain('目前方案仍可使用至')
    expect(html).toContain('到期後可以重新選擇月繳或年繳方案。')
    expect(html).toContain('恢復自動續訂')
    expect(html).toContain('點擊代表放棄更換／停止方案，繼續目前方案的自動續訂。')
    expect(html).not.toContain('選擇付款週期')
    expect(html).not.toContain('變更方案')
  })

  it('3. canceled status: re-displays the billing interval selector (monthly / annual)', () => {
    const subscription: SubscriptionView = {
      id: 'sub-1',
      childId: 'child-123',
      status: 'canceled',
      planCode: 'standard_monthly',
      billingInterval: 'month',
      priceTwd: 499,
      currentPeriodEnd: '2026-08-16T00:00:00Z',
      cancelAtPeriodEnd: false,
      foundingStatus: 'none',
    }

    const html = renderToStaticMarkup(
      <ChildSubscription
        child={mockChild}
        subscription={subscription}
        onSubscribe={vi.fn()}
        onCancel={vi.fn()}
        onResume={vi.fn()}
      />
    )

    expect(html).toContain('訂閱已到期')
    expect(html).toContain('選擇付款週期')
    expect(html).toContain('年繳 NT$4,999')
    expect(html).toContain('省 NT$989')
    expect(html).toContain('月繳 NT$499')
    expect(html).toContain('並開始訂閱')
  })

  it('4. founding_status = eligible on trialing subscription: displays continuous Founder reservation and lock CTA without exposing live seat count', () => {
    const subscription: SubscriptionView = {
      id: 'sub-1',
      childId: 'child-123',
      status: 'trialing',
      planCode: 'standard_monthly',
      billingInterval: 'month',
      priceTwd: 499,
      currentPeriodEnd: '2026-08-16T00:00:00Z',
      cancelAtPeriodEnd: false,
      foundingStatus: 'eligible',
    }

    const html = renderToStaticMarkup(
      <ChildSubscription
        child={mockChild}
        subscription={subscription}
        foundingAvailable={true}
        foundingRemaining={7}
        onSubscribe={vi.fn()}
        onCancel={vi.fn()}
        onResume={vi.fn()}
      />
    )

    expect(html).toContain('strike-price')
    expect(html).toContain('NT$499')
    expect(html).toContain('NT$349')
    expect(html).toContain('創始 30 名限定')
    expect(html).toContain('目前仍有創始優惠名額')
    expect(html).not.toContain('目前只剩 7 個創始優惠席次')
    expect(html).toContain('持續訂閱期間，NT$349 創始價固定保留')
    expect(html).toContain('鎖定 NT$349 創始價')
    expect(html).toMatch(/checked="" value="monthly"/)
  })

  it('5. founding_status = forfeited on canceled subscription: does NOT offer NT$349 discount again', () => {
    const subscription: SubscriptionView = {
      id: 'sub-1',
      childId: 'child-123',
      status: 'canceled',
      planCode: 'standard_monthly',
      billingInterval: 'month',
      priceTwd: 499,
      currentPeriodEnd: '2026-08-16T00:00:00Z',
      cancelAtPeriodEnd: false,
      foundingStatus: 'forfeited',
    }

    const html = renderToStaticMarkup(
      <ChildSubscription
        child={mockChild}
        subscription={subscription}
        foundingAvailable={true}
        onSubscribe={vi.fn()}
        onCancel={vi.fn()}
        onResume={vi.fn()}
      />
    )

    expect(html).toContain('月繳 NT$499')
    expect(html).not.toContain('strike-price')
    expect(html).not.toContain('NT$349')
    expect(html).not.toContain('創始早鳥優惠')
    expect(html).toMatch(/checked="" value="annual"/)
  })

  it('6. trialing status: shows billing interval selector', () => {
    const subscription: SubscriptionView = {
      id: 'sub-1',
      childId: 'child-123',
      status: 'trialing',
      planCode: 'standard_monthly',
      billingInterval: 'month',
      priceTwd: null,
      currentPeriodEnd: '2026-08-20T00:00:00Z',
      cancelAtPeriodEnd: false,
      foundingStatus: 'none',
    }

    const html = renderToStaticMarkup(
      <ChildSubscription
        child={mockChild}
        subscription={subscription}
        onSubscribe={vi.fn()}
        onCancel={vi.fn()}
        onResume={vi.fn()}
      />
    )

    expect(html).toContain('體驗期')
    expect(html).toContain('選擇付款週期')
  })

  it('7. waitlist status = waiting: shows waiting pill, reassurance copy, and disables billing selector', () => {
    const html = renderToStaticMarkup(
      <ChildSubscription
        child={mockChild}
        waitlist={{
          id: 'w-1',
          childId: 'child-123',
          status: 'waiting',
          createdAt: '2026-08-20T00:00:00Z',
          releasedAt: null,
          convertedAt: null,
          notes: null,
        }}
        onSubscribe={vi.fn()}
        onCancel={vi.fn()}
        onResume={vi.fn()}
      />
    )

    expect(html).toContain('等候名單中')
    expect(html).toContain('目前學習名額等候中。我們會在名額開放時以 Email 通知您，屆時再啟用訂閱，目前不會產生任何費用。')
    expect(html).not.toContain('選擇付款週期')
    expect(html).not.toContain('開始訂閱')
  })

  it('8. waitlist status = released: shows released badge and allows standard plan selection & checkout', () => {
    const html = renderToStaticMarkup(
      <ChildSubscription
        child={mockChild}
        waitlist={{
          id: 'w-1',
          childId: 'child-123',
          status: 'released',
          createdAt: '2026-08-20T00:00:00Z',
          releasedAt: '2026-08-20T02:00:00Z',
          convertedAt: null,
          notes: null,
        }}
        onSubscribe={vi.fn()}
        onCancel={vi.fn()}
        onResume={vi.fn()}
      />
    )

    expect(html).toContain('名額已開放')
    expect(html).toContain('🎉 學習名額已為孩子開放！請選擇訂閱方案以啟用每週教材生成。')
    expect(html).toContain('選擇付款週期')
    expect(html).toContain('年繳 NT$4,999')
    expect(html).toContain('月繳 NT$499')
    expect(html).toContain('選擇年繳並開始訂閱')
  })

  it('8b. waitlist.status = released without subscription: shows Founder pricing when foundingAvailable is true', () => {
    const html = renderToStaticMarkup(
      <ChildSubscription
        child={mockChild}
        waitlist={{
          id: 'w-1',
          childId: 'child-123',
          status: 'released',
          createdAt: '2026-08-20T00:00:00Z',
          releasedAt: '2026-08-20T02:00:00Z',
          convertedAt: null,
          notes: null,
        }}
        foundingAvailable={true}
        onSubscribe={vi.fn()}
        onCancel={vi.fn()}
        onResume={vi.fn()}
      />
    )

    expect(html).toContain('名額已開放')
    expect(html).toContain('月繳 NT$349')
    expect(html).toContain('創始 30 限定')
    expect(html).toContain('NT$499')
    expect(html).toContain('鎖定 NT$349 創始價')
  })

  it('9. active redeemed Founder shows effective NT$349 price and Founder badge', () => {
    const html = renderToStaticMarkup(
      <ChildSubscription
        child={mockChild}
        subscription={{
          id: 'sub-founder', childId: 'child-123', status: 'active', planCode: 'standard_monthly',
          billingInterval: 'month', priceTwd: 499, currentPeriodEnd: '2026-09-16T00:00:00Z',
          cancelAtPeriodEnd: false, foundingStatus: 'redeemed', foundingRedeemedAt: '2026-08-16T00:00:00Z',
        }}
        onSubscribe={vi.fn()} onCancel={vi.fn()} onResume={vi.fn()}
      />
    )
    expect(html).toContain('創始 30')
    expect(html).toContain('月繳方案・每月 NT$349')
    expect(html).not.toContain('月繳方案・每月 NT$499')
  })

  it('10. exports the exact permanent-loss cancellation warning', () => {
    expect(founderCancellationWarning).toBe('本期結束前仍保留創始價格；若訂閱於期末真正終止，創始 NT$349/月資格將永久失效。到期前恢復續訂即可保留。')
  })
})
