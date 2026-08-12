import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ChildSubscription } from '../components/billing/ChildSubscription'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { listChildren, type Child } from '../lib/children'
import { listOwnedSubscriptions, type SubscriptionView } from '../lib/subscriptions'
import { getSupabaseClient } from '../lib/supabase'

export function BillingPage({ session }: { session: Session }) {
  const [children, setChildren] = useState<Child[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    {!loading && !error && children.length === 0 && <div className="empty-state">新增孩子並完成第一週設定後，訂閱狀態會顯示在這裡。</div>}
    <div className="subscription-list">
      {children.map((child) => <ChildSubscription key={child.id} child={child} subscription={subscriptions.find((item) => item.childId === child.id)} />)}
    </div>
    <p className="muted">需要取消或處理付款問題？目前請透過聯絡管道協助；正式付款服務完成伺服器端驗證後才會開放自助操作。</p>
  </AppShell>
}
