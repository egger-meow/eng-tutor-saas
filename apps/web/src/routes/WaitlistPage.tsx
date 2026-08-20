import { AuthPanel } from '../components/auth/AuthPanel'
import { AppShell } from '../components/layout/AppShell'
import { PublicHeader } from '../components/layout/PublicHeader'
import { CapacityStatus } from '../components/public/CapacityStatus'

export function WaitlistPage() {
  return (
    <AppShell header={<PublicHeader />}>
      <section className="narrow-page">
        <p className="eyebrow">候補登記</p>
        <h1>目前名額已滿，可先建立學習檔案</h1>
        <p className="lede">
          目前名額已滿。可以先建立帳號並填寫孩子的學習資料，不會收費。有名額開放時，我們會寄 Email 通知你，再決定是否訂閱。
        </p>
        <CapacityStatus />
        <div className="login-section">
          <AuthPanel />
        </div>
        <p className="muted">登入後即可為孩子填寫完整的學習履歷；當名額開放時，我們會主動發送通知給您。</p>
      </section>
    </AppShell>
  )
}
