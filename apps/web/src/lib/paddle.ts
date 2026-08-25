import { initializePaddle, type Environments, type Paddle } from '@paddle/paddle-js'

let paddlePromise: Promise<Paddle | undefined> | undefined
let completedCallback: (() => void) | undefined

function getEnvironment(): Environments {
  return import.meta.env.VITE_PADDLE_ENV === 'production' ? 'production' : 'sandbox'
}

export async function initializePaddleClient() {
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

export async function openPaddleCheckout(transactionId: string, frameTarget: string, onCompleted: () => void) {
  completedCallback = onCompleted
  const paddle = await initializePaddleClient()
  paddle.Checkout.close()
  paddle.Checkout.open({
    transactionId,
    settings: {
      displayMode: 'inline',
      theme: 'light',
      locale: 'zh-TW',
      variant: 'one-page',
      frameTarget,
      frameInitialHeight: 720,
      frameStyle: 'width: 100%; min-width: 312px; background-color: transparent; border: none;',
      showAddDiscounts: false,
      allowDiscountRemoval: false,
    },
  })
}

export async function closePaddleCheckout() {
  const paddle = await initializePaddleClient()
  paddle.Checkout.close()
}
