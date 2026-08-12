import { initializePaddle, type Environments, type Paddle } from '@paddle/paddle-js'

let paddlePromise: Promise<Paddle | undefined> | undefined
let completedCallback: (() => void) | undefined

function getEnvironment(): Environments {
  return import.meta.env.VITE_PADDLE_ENV === 'production' ? 'production' : 'sandbox'
}

async function getPaddle() {
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN
  if (!token) throw new Error('Paddle browser configuration is missing')

  paddlePromise ??= initializePaddle({
    token,
    environment: getEnvironment(),
    eventCallback: (event) => {
      if (event.name === 'checkout.completed') completedCallback?.()
    },
  })
  const paddle = await paddlePromise
  if (!paddle) throw new Error('Paddle failed to initialize')
  return paddle
}

export async function openPaddleCheckout(transactionId: string, onCompleted: () => void) {
  completedCallback = onCompleted
  const paddle = await getPaddle()
  paddle.Checkout.open({
    transactionId,
    settings: {
      displayMode: 'overlay',
      theme: 'light',
      locale: 'zh-TW',
      showAddDiscounts: false,
      allowDiscountRemoval: false,
    },
  })
}
