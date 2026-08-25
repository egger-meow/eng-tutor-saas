import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PayPage } from './PayPage'

vi.mock('../lib/paddle', () => ({
  initializePaddleClient: vi.fn(),
}))

describe('Paddle default payment page', () => {
  it('shows a payment shell when Paddle supplied _ptxn', () => {
    const html = renderToStaticMarkup(<PayPage search={'?_ptxn=txn_123'} />)

    expect(html).toContain('付款連結')
    expect(html).toContain('正在安全地載入付款畫面')
    expect(html).not.toContain('auth-panel')
  })

  it('shows a safe fallback without _ptxn', () => {
    const html = renderToStaticMarkup(<PayPage search={'?transaction_id=txn_123'} />)

    expect(html).toContain('付款連結')
    expect(html).toContain('找不到付款交易')
    expect(html).toContain('href=')
  })
})
