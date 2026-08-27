import { describe, expect, it, vi } from 'vitest'

const invoke = vi.fn()

vi.mock('./supabase', () => ({
  getSupabaseClient: () => ({ functions: { invoke } }),
}))

import { prepareCheckout } from './subscriptions'

describe('checkout capacity rejection copy', () => {
  it('turns capacity_full_waitlisted into the actual waitlist message instead of a generic payment error', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: {
        context: new Response(JSON.stringify({ error: 'capacity_full_waitlisted' }), {
          status: 409,
          headers: { 'content-type': 'application/json' },
        }),
      },
    })

    await expect(prepareCheckout('child-1', 'monthly')).rejects.toThrow(
      '目前學習名額已滿，孩子已進入候補；不會收費，有名額時會寄 Email 通知你。'
    )
  })
})
