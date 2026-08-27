import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ChildSubscription, founderCancellationWarning } from './ChildSubscription'
import type { Child } from '../../lib/children'

const child: Child = {
  id: 'child-founder',
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

describe('Founder scheduled cancellation persistent truth', () => {
  it('keeps the permanent-loss warning visible after reload while the Founder subscription is scheduled to cancel', () => {
    const html = renderToStaticMarkup(
      <ChildSubscription
        child={child}
        subscription={{
          id: 'sub-founder',
          childId: child.id,
          status: 'active',
          planCode: 'standard_monthly',
          billingInterval: 'month',
          priceTwd: 499,
          currentPeriodEnd: '2026-09-27T00:00:00Z',
          cancelAtPeriodEnd: true,
          foundingStatus: 'redeemed',
          foundingRedeemedAt: '2026-08-27T00:00:00Z',
        }}
        onSubscribe={vi.fn()}
        onCancel={vi.fn()}
        onResume={vi.fn()}
      />
    )

    expect(html).toContain('已取消自動續訂')
    expect(html).toContain('月繳方案・每月 NT$349')
    expect(html).toContain(founderCancellationWarning)
    expect(html).toContain('恢復自動續訂')
  })
})
