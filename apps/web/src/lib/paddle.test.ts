import { beforeAll, describe, expect, it, vi } from 'vitest'

const paddle = vi.hoisted(() => ({
  Checkout: {
    close: vi.fn(),
    open: vi.fn(),
  },
}))

const initializePaddle = vi.hoisted(() => vi.fn(async () => paddle))

vi.mock('@paddle/paddle-js', () => ({ initializePaddle }))

describe('shared Paddle client', () => {
  beforeAll(() => {
    vi.stubEnv('VITE_PADDLE_CLIENT_TOKEN', 'live_client_token')
    vi.stubEnv('VITE_PADDLE_ENV', 'production')
  })

  it('initializes once for payment links and preserves transaction-based inline checkout', async () => {
    const { initializePaddleClient, openPaddleCheckout } = await import('./paddle')
    const onCompleted = vi.fn()

    await initializePaddleClient()
    await openPaddleCheckout('txn_inline', 'paddle-checkout-frame', onCompleted)

    expect(initializePaddle).toHaveBeenCalledTimes(1)
    expect(initializePaddle).toHaveBeenCalledWith(expect.objectContaining({
      token: 'live_client_token',
      environment: 'production',
      eventCallback: expect.any(Function),
    }))
    expect(paddle.Checkout.open).toHaveBeenCalledWith({
      transactionId: 'txn_inline',
      settings: expect.objectContaining({
        displayMode: 'inline',
        frameTarget: 'paddle-checkout-frame',
        showAddDiscounts: false,
        allowDiscountRemoval: false,
      }),
    })
  })
})
