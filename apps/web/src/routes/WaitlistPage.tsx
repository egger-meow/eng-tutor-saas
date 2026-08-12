import { AuthPanel } from '../components/auth/AuthPanel'
import { AppShell } from '../components/layout/AppShell'
import { PublicHeader } from '../components/layout/PublicHeader'
import { CapacityStatus } from '../components/public/CapacityStatus'

export function WaitlistPage() {
  return <AppShell header={<PublicHeader />}><section className="narrow-page"><p className="eyebrow">候補登記</p><h1>先留下 Email，有名額時再通知</h1><p className="lede">初期最多服務 100 位孩子，確保每週教材與回饋都能維持品質。候補不會先收費，也不代表已建立訂閱。</p><CapacityStatus /><div className="login-section"><AuthPanel /></div><p className="muted">登入後可先建立孩子的學習資料；實際名額與付款仍以後端確認為準。</p></section></AppShell>
}
