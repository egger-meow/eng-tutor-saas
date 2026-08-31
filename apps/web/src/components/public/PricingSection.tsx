import { productConfig } from '../../content/site'
import { annualMonthlyEquivalentTwd, annualSavingsTwd, formatPrice } from '../../lib/billing-plans'
import { getEnrollmentCta, useEnrollmentState, type EnrollmentState } from '../../lib/enrollment'
import { CapacityStatus } from './CapacityStatus'
import { trackFreeTrialClick } from '../../lib/analytics'

export function PricingSection({ enrollment: propEnrollment }: { enrollment?: EnrollmentState | null } = {}) {
  const { state: hookEnrollment } = useEnrollmentState(propEnrollment)
  const enrollment = propEnrollment !== undefined ? propEnrollment : hookEnrollment
  const cta = getEnrollmentCta(enrollment)
  const foundingRemaining = enrollment ? Math.max(enrollment.foundingLimit - enrollment.foundingCount, 0) : null
  const capacityOpen = Boolean(enrollment && enrollment.status === 'open' && enrollment.remaining > 0)

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
        <span>同一訂閱・系統升級不加價</span>
      </div>
    </aside>

    <article className="pricing-card">
      <div className="pricing-plan-grid">
        <div className="pricing-offer"><p className="price"><span>月繳・每位孩子</span>NT${formatPrice(productConfig.standardPrice)}</p><p className="pricing-cadence">每月續訂</p></div>
        <div className="pricing-offer pricing-offer-annual"><p className="price"><span>年繳・每位孩子</span>NT${formatPrice(productConfig.annualPrice)}</p><p className="pricing-cadence">每年續訂・平均每月約 NT${formatPrice(annualMonthlyEquivalentTwd)}・一年省 NT${formatPrice(annualSavingsTwd)}</p></div>
      </div>
      <ul className="pricing-includes"><li>Student PDF</li><li>Parent Answer PDF</li><li>依孩子程度與回饋持續調整</li><li>家長可管理多位孩子</li></ul>
      {capacityOpen && foundingRemaining !== null && foundingRemaining > 0 && (
        <div className="founding-offer">
          <p className="status-label">創始 30・月繳限定</p>
          <div className="founding-copy">
            <strong>前 30 位持續訂閱期間固定 NT${formatPrice(productConfig.foundingPrice)}／月</strong>
            <span>第一週免費。標準月費 NT${formatPrice(productConfig.standardPrice)}；創始 30 每月省 NT$150。只要訂閱不中斷，創始價格持續保留；取消後若重新加入，依當時標準方案價格計費。</span>
          </div>
          <p className="founding-remaining">🎟️ 創始 30 優惠目前仍有名額</p>
        </div>
      )}
      <a className="button pricing-cta" href={cta.href} onClick={() => trackFreeTrialClick('pricing')}>{cta.label}</a>
      {capacityOpen && <p className="pricing-delivery-note">完成孩子資料後，第一份專屬教材預計隔天開放下載。</p>}
    </article>
    <CapacityStatus enrollment={enrollment} />
    <p className="capacity-explainer">第一階段預計服務 100 位孩子，計數以孩子為單位，非家長帳戶。額滿後新加入者會先進入候補，既有家庭不受影響。</p>
  </section>
}

