import { beforeEach, describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()

vi.mock('./supabase', () => ({
  getSupabaseClient: () => ({ functions: { invoke } }),
}))

import { cancelSubscription, prepareCheckout, resumeSubscription } from './subscriptions'

describe('subscription checkout boundary', () => {
  beforeEach(() => invoke.mockReset())

  it('sends only the semantic annual plan and returns verified summary data', async () => {
    invoke.mockResolvedValue({
      data: {
        transaction_id: 'txn_annual',
        plan: 'annual',
        billing_interval: 'year',
        price_twd: 4999,
        founding_applies: false,
        checkout_price_twd: 4999,
      },
      error: null,
    })

    await expect(prepareCheckout('child-1', 'annual')).resolves.toMatchObject({
      transactionId: 'txn_annual',
      plan: 'annual',
      billingInterval: 'year',
      priceTwd: 4999,
      foundingApplies: false,
    })
    expect(invoke).toHaveBeenCalledWith('paddle-checkout', {
      body: { child_id: 'child-1', plan: 'annual' },
    })
  })

  it('rejects a server response for a different plan', async () => {
    invoke.mockResolvedValue({
      data: {
        transaction_id: 'txn_wrong',
        plan: 'monthly',
        billing_interval: 'month',
        price_twd: 499,
        founding_applies: false,
        checkout_price_twd: 499,
      },
      error: null,
    })

    await expect(prepareCheckout('child-1', 'annual')).rejects.toThrow('付款方案驗證失敗')
  })

  it('invokes paddle-cancel-subscription with child_id and reason', async () => {
    invoke.mockResolvedValue({
      data: { cancel_at_period_end: true },
      error: null,
    })
    await expect(cancelSubscription('child-1', 'taking a break')).resolves.toBeUndefined()
    expect(invoke).toHaveBeenCalledWith('paddle-cancel-subscription', {
      body: { child_id: 'child-1', reason: 'taking a break' },
    })
  })

  it('invokes paddle-update-subscription with action resume', async () => {
    invoke.mockResolvedValue({
      data: { cancel_at_period_end: false },
      error: null,
    })
    await expect(resumeSubscription('child-1')).resolves.toBeUndefined()
    expect(invoke).toHaveBeenCalledWith('paddle-update-subscription', {
      body: { child_id: 'child-1', action: 'resume' },
    })
  })
})

