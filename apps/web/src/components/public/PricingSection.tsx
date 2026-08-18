import { productConfig } from '../../content/site'
import { annualMonthlyEquivalentTwd, annualSavingsTwd, formatPrice } from '../../lib/billing-plans'
import { getEnrollmentCta, useEnrollmentState } from '../../lib/enrollment'
import { CapacityStatus } from './CapacityStatus'

export function PricingSection() {
  const { state: enrollment } = useEnrollmentState()
  const cta = getEnrollmentCta(enrollment)
  const foundingRemaining = enrollment ? Math.max(enrollment.foundingLimit - enrollment.foundingCount, 0) : null

  return <section className="public-section pricing-section" id="pricing" aria-labelledby="pricing-title">
    <div className="pricing-heading">
      <div><p className="overline">清楚知道每週得到什麼</p><h2 id="pricing-title">月繳或年繳，都以孩子為單位</h2></div>
      <p>每個孩子都有獨立的學習記憶、教材、回饋與生成節奏。</p>
    </div>

    <aside className="pricing-anchor-banner" aria-label="月費價值比較">
      <span className="pricing-anchor-kicker">一個月，不只一小時</span>
      <div>
        <strong>比許多一對一家教一小時更低的月費</strong>
        <p>得到的不是一小時的課，而是一整個月持續為孩子準備、追蹤與調整的專屬教材系統。</p>
      </div>
      <div className="pricing-value-proposition" aria-label="每月包含的持續價值">
        <span>每週專屬教材</span>
        <span>學習記憶持續累積</span>
        <span>系統升級自動享有</span>
      </div>
    </aside>

    <article className="pricing-card">
      <div className="pricing-plan-grid">
        <div className="pricing-offer"><p className="price"><span>月繳・每位孩子</span>NT${formatPrice(productConfig.standardPrice)}</p><p className="pricing-cadence">每月續訂</p></div>
        <div className="pricing-offer pricing-offer-annual"><p className="price"><span>年繳・每位孩子</span>NT${formatPrice(productConfig.annualPrice)}</p><p className="pricing-cadence">每年續訂・平均每月約 NT${formatPrice(annualMonthlyEquivalentTwd)}・一年省 NT${formatPrice(annualSavingsTwd)}</p></div>
      </div>
      <ul className="pricing-includes"><li>Student PDF</li><li>Parent Answer PDF</li><li>依孩子程度與回饋持續調整</li><li>家長可管理多位孩子</li></ul>
      {foundingRemaining === null || (enrollment?.status === 'open' && foundingRemaining > 0) ? (
        <div className="founding-offer"><p className="status-label">月繳限定・前 {productConfig.foundingLimit} 位孩子</p><strong>第一週免費，第一個付費月 NT${formatPrice(productConfig.foundingPrice)}</strong><span>第二個付費月起為 NT${formatPrice(productConfig.standardPrice)}／月；年繳固定為 NT${formatPrice(productConfig.annualPrice)}。{foundingRemaining === null ? '' : `目前還有 ${foundingRemaining} 個早鳥名額。`}</span></div>
      ) : (
        <div className="founding-offer"><p className="status-label">目前不開放創始優惠</p><strong>月繳 NT${formatPrice(productConfig.standardPrice)}・年繳 NT${formatPrice(productConfig.annualPrice)}</strong><span>{enrollment?.status === 'open' ? '新加入的孩子不適用創始前 30 位優惠。' : '服務名額開放後，會以當時方案為準。'}</span></div>
      )}
      <a className="button pricing-cta" href={cta.href}>{cta.label}</a>
      <p className="pricing-delivery-note">完成孩子資料後，第一份專屬教材預計隔天開放下載。</p>
    </article>
    <CapacityStatus />
    <p className="capacity-explainer">前 100 位是第一階段服務容量。計數以孩子為單位，不是 Email 或家長帳戶；額滿後既有家庭仍會正常收到教材。</p>
  </section>
}
