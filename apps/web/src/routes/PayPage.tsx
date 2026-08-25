import { useEffect } from 'react'
import { handleInternalLink } from '../app/use-route'
import { AppShell } from '../components/layout/AppShell'
import { PublicHeader } from '../components/layout/PublicHeader'
import { initializePaddleClient } from '../lib/paddle'

function hasPaddleTransaction(search: string) {
  return new URLSearchParams(search).has('_ptxn')
}

export function PayPage({ search = typeof window === 'undefined' ? '' : window.location.search }: { search?: string }) {
  const hasTransaction = hasPaddleTransaction(search)

  useEffect(() => {
    void initializePaddleClient().catch((error: unknown) => {
      console.error('Paddle failed to initialize on the default payment page', error)
    })
  }, [])

  return (
    <AppShell className='payment-link-page' header={<PublicHeader />}>
      <section className='payment-link-shell' aria-labelledby='payment-link-title'>
        <p className='eyebrow'>Paddle Checkout</p>
        <h1 id='payment-link-title'>付款連結</h1>
        {hasTransaction ? (
          <div className='payment-link-loading' role='status' aria-live='polite'>
            <div className='loading-spinner' aria-hidden={true} />
            <p>正在安全地載入付款畫面…</p>
          </div>
        ) : (
          <div className='payment-link-fallback'>
            <p>找不到付款交易。請使用 Paddle 提供的完整付款連結後再試一次。</p>
            <a className='button' href='/' onClick={handleInternalLink}>回到首頁</a>
          </div>
        )}
      </section>
    </AppShell>
  )
}
