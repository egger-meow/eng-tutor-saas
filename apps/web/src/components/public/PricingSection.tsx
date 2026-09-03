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

    {enrollment?.freePilotActive && (
      <div className="free-pilot-banner" style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
        <span style={{ display: 'inline-block', background: '#16a34a', color: '#fff', fontSize: '0.8125rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '9999px', marginBottom: '0.5rem' }}>
          🎉 100 位學員以前・全面免費公測中
        </span>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#14532d', margin: '0.25rem 0' }}>
          公測期間每週專屬教材完全免費（無需信用卡）
        </h3>
        <p style={{ color: '#166534', margin: '0.25rem 0 0', fontSize: '0.9375rem' }}>
          只要每週完成回饋，系統便會免費生成下一週教材。未來公測結束後，才會轉為以下標準付費方案。
        </p>
      </div>
    )}

    <article className="pricing-card">
      <div className="pricing-plan-grid">
        <div className="pricing-offer"><p className="price"><span>月繳・每位孩子</span>NT${formatPrice(productConfig.standardPrice)}</p><p className="pricing-cadence">每月續訂</p></div>
        <div className="pricing-offer pricing-offer-annual"><p className="price"><span>年繳・每位孩子</span>NT${formatPrice(productConfig.annualPrice)}</p><p className="pricing-cadence">每年續訂・平均每月約 NT${formatPrice(annualMonthlyEquivalentTwd)}・一年省 NT${formatPrice(annualSavingsTwd)}</p></div>
      </div>
      <ul className="pricing-includes"><li>Student PDF</li><li>Parent Answer PDF</li><li>依孩子程度與回饋持續調整</li><li>家長可管理多位孩子</li></ul>
      {capacityOpen && foundingRemaining !== null && foundingRemaining > 0 && (
        <div className="founding-offer">
          <p className="status-label">創始 30・{enrollment?.freePilotActive ? '自願提前訂閱' : '月繳限定'}</p>
          <div className="founding-copy">
            <strong>前 30 位持續訂閱期間固定 NT${formatPrice(productConfig.foundingPrice)}／月</strong>
            <span>
              {enrollment?.freePilotActive
                ? '公測期間不訂閱也能每週免費使用。若您希望在 30 個名額額滿前永久鎖定 NT$349/月優惠，可自願提前訂閱（會立即開始計費）。只要訂閱不中斷，創始價格持續保留。'
                : '第一週免費。標準月費 NT$' + formatPrice(productConfig.standardPrice) + '；創始 30 每月省 NT$150。只要訂閱不中斷，創始價格持續保留；取消後若重新加入，依當時標準方案價格計費。'}
            </span>
          </div>
          <p className="founding-remaining">🎟️ 創始 30 優惠目前仍有名額</p>
        </div>
      )}
      <a className="button pricing-cta" href={cta.href} onClick={() => trackFreeTrialClick('pricing')}>{cta.label}</a>
      {capacityOpen && (
        <p className="pricing-delivery-note">
          {enrollment?.freePilotActive
            ? '完成孩子資料後，第一份專屬教材預計隔天開放下載。公測期間每週填寫回饋即可免費持續領取。'
            : '完成孩子資料後，第一份專屬教材預計隔天開放下載。'}
        </p>
      )}
    </article>
    <CapacityStatus enrollment={enrollment} />
    <p className="capacity-explainer">
      {enrollment?.freePilotActive
        ? '公測階段以歷史錄取前 100 位孩子為限。額滿後新加入者會先進入候補，公測結束後回歸標準付費服務。既有家庭不受影響。'
        : '第一階段預計服務 100 位孩子，計數以孩子為單位，非家長帳戶。額滿後新加入者會先進入候補，既有家庭不受影響。'}
    </p>
  </section>
}

