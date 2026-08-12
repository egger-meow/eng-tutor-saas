import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { navigate } from '../app/use-route'
import { ChildSubscription } from '../components/billing/ChildSubscription'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { listChildren, type Child } from '../lib/children'
import { listOwnedSubscriptions, type SubscriptionView } from '../lib/subscriptions'
import { prepareCheckout } from '../lib/subscriptions'
import { openPaddleCheckout } from '../lib/paddle'
import { getSupabaseClient } from '../lib/supabase'

export function BillingPage({ session }: { session: Session }) {
  const [children, setChildren] = useState<Child[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkoutChildId, setCheckoutChildId] = useState<string | null>(null)
  const [checkoutNotice, setCheckoutNotice] = useState('')

  async function refreshSubscriptions() {
    setSubscriptions(await listOwnedSubscriptions())
  }

  async function startCheckout(childId: string) {
    setCheckoutChildId(childId)
    setCheckoutNotice('')
    setError('')
    try {
      const checkout = await prepareCheckout(childId)
      await openPaddleCheckout(checkout.transactionId, () => {
        setCheckoutNotice('付款已送出，正在等候 Paddle 確認訂閱狀態。通常幾秒內會完成。')
        window.setTimeout(() => void refreshSubscriptions(), 2500)
        window.setTimeout(() => void refreshSubscriptions(), 7000)
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '目前無法開啟安全付款，請稍後再試。')
    } finally {
      setCheckoutChildId(null)
    }
  }

  useEffect(() => {
    void Promise.all([listChildren(), listOwnedSubscriptions()])
      .then(([nextChildren, nextSubscriptions]) => {
        setChildren(nextChildren)
        setSubscriptions(nextSubscriptions)
      })
      .catch(() => setError('目前無法讀取訂閱資料，請稍後再試。'))
      .finally(() => setLoading(false))
  }, [])

  return <AppShell header={<ParentNavigation email={session.user.email} onSignOut={() => void getSupabaseClient().auth.signOut()} />}>
    <header className="page-heading">
      <p className="eyebrow">帳戶設定</p>
      <h1>每位孩子的訂閱</h1>
      <p>方案與交付週期彼此獨立。此頁目前只顯示由後端確認的狀態，不會在瀏覽器直接變更付款。</p>
    </header>
    {loading && <p role="status">正在讀取訂閱…</p>}
    {error && <p className="notice notice-error" role="alert">{error}</p>}
    {checkoutNotice && <p className="notice" role="status">{checkoutNotice}</p>}
    {!loading && children.length === 0 && <div className="empty-state"><h2>先新增孩子</h2><p>方案以每位孩子為單位。建立孩子資料後，就能產生第一週教材並測試付款。</p><button className="button" type="button" onClick={() => navigate('/children/new')}>＋ 新增孩子</button></div>}
    <div className="subscription-list">
      {children.map((child) => <ChildSubscription key={child.id} child={child} subscription={subscriptions.find((item) => item.childId === child.id)} busy={checkoutChildId === child.id} onSubscribe={(childId) => void startCheckout(childId)} />)}
    </div>
    <p className="muted">付款由 Paddle 安全處理。訂閱狀態以伺服器收到的 Paddle 通知為準；需要取消或處理付款問題時，請透過聯絡管道協助。</p>
  </AppShell>
}
