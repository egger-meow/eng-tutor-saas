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
      <div>
        <p className="overline">
          {enrollment?.freePilotActive ? '🧪 Paper English Beta' : '清楚知道每週得到什麼'}
        </p>
        <h2 id="pricing-title">
          {enrollment?.freePilotActive
            ? 'Beta 期間，目前每週專屬教材 NT$0'
            : '月繳或年繳，都以孩子為單位'}
        </h2>
      </div>
      <p>
        {enrollment?.freePilotActive
          ? '免填信用卡、免綁卡。每週回報孩子作答狀況後，系統會繼續準備下一週教材。'
          : '每個孩子都有獨立的學習記憶、教材、回饋與生成節奏。'}
      </p>
    </div>

    <aside className="pricing-anchor-banner" aria-label="價值說明">
      <span className="pricing-anchor-kicker">
        {enrollment?.freePilotActive ? 'Beta 現行方案' : '一個月，不只一小時'}
      </span>
      <div>
        <strong>
          {enrollment?.freePilotActive
            ? '每週專屬教材 NT$0・免填信用卡'
            : '比許多一對一家教一小時更低的月費'}
        </strong>
        <p>
          {enrollment?.freePilotActive
            ? '目前不用綁卡，也不會因為建立孩子資料就自動訂閱。100 位是目前服務容量與 Beta 階段邊界，不是倒數促銷。'
            : '得到的不是一小時的課，而是一整個月持續為孩子準備、追蹤與調整的專屬教材系統。'}
        </p>
      </div>
      <div className="pricing-value-proposition" aria-label="包含的持續價值">
        <span>{enrollment?.freePilotActive ? '每週專屬教材 NT$0' : '每週專屬教材'}</span>
        <span>{enrollment?.freePilotActive ? '免填信用卡・免綁卡' : '學習記憶持續累積'}</span>
        <span>{enrollment?.freePilotActive ? '每週回饋・持續準備' : '同一訂閱・系統升級不加價'}</span>
      </div>
    </aside>

    {enrollment?.freePilotActive && (
      <div className="free-pilot-banner" style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
        <span style={{ display: 'inline-block', background: '#245c49', color: '#fff', fontSize: '0.8125rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: '9999px', marginBottom: '0.5rem' }}>
          🧪 Paper English Beta
        </span>
        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#14532d', margin: '0.25rem 0' }}>
          目前每週專屬教材 NT$0
        </h3>
        <p style={{ color: '#166534', margin: '0.35rem 0 0', fontSize: '0.95rem', lineHeight: '1.6' }}>
          免填信用卡、免綁卡。每週完成孩子作答回饋後，系統會繼續為他準備下一週教材。<br />
          Beta 目前以歷史錄取 100 位學員作為階段邊界；結束後恢復標準方案，不會自動替你開啟付費訂閱。
        </p>
      </div>
    )}

    <article className="pricing-card">
      <div className="pricing-plan-grid">
        <div className="pricing-offer">
          <p className="price">
            <span className="price-label">月繳・每位孩子</span>
            {enrollment?.freePilotActive ? (
              <span className="price-free-row" style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap', marginBlock: '0.25rem' }}>
                <del style={{ textDecoration: 'line-through', opacity: 0.45, fontSize: '1.5rem', color: '#64748b' }}>
                  NT${formatPrice(productConfig.standardPrice)}
                </del>
                <ins style={{ color: '#16a34a', fontSize: 'clamp(2.5rem, 5vw, 3.8rem)', fontWeight: 900, textDecoration: 'none' }}>
                  NT$0
                </ins>
                <span className="free-tag" style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.85rem', fontWeight: 800, padding: '0.25rem 0.65rem', borderRadius: '6px' }}>
                  Beta 目前免費
                </span>
              </span>
            ) : (
              <>NT${formatPrice(productConfig.standardPrice)}</>
            )}
          </p>
          <p className="pricing-cadence">
            {enrollment?.freePilotActive
              ? '目前每週專屬教材 NT$0・免填信用卡・每週填回饋後繼續準備下一週'
              : '每月續訂'}
          </p>
        </div>
        <div className="pricing-offer pricing-offer-annual">
          <p className="price">
            <span>年繳・每位孩子</span>
            {enrollment?.freePilotActive ? (
              <span className="price-free-wrapper" style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ opacity: 0.65, fontSize: '1.75rem' }}>
                  NT${formatPrice(productConfig.annualPrice)}
                </span>
                <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  Beta 結束後標準方案
                </span>
              </span>
            ) : (
              <>NT${formatPrice(productConfig.annualPrice)}</>
            )}
          </p>
          <p className="pricing-cadence">
            {enrollment?.freePilotActive
              ? 'Beta 期間目前不需付費；結束後如要繼續每週服務，再自行選擇方案'
              : `每年續訂・平均每月約 NT$${formatPrice(annualMonthlyEquivalentTwd)}・一年省 NT$${formatPrice(annualSavingsTwd)}`}
          </p>
        </div>
      </div>
      <ul className="pricing-includes"><li>Student PDF</li><li>Parent Answer PDF</li><li>依孩子程度與回饋持續調整</li><li>家長可管理多位孩子</li></ul>
      {foundingRemaining !== null && foundingRemaining > 0 && (
        <div className="founding-offer">
          <p className="status-label">創始 30・{enrollment?.freePilotActive ? '自願提前訂閱' : capacityOpen ? '月繳限定' : '名額保留中'}</p>
          <div className="founding-copy">
            <strong>前 30 位持續訂閱期間固定 NT${formatPrice(productConfig.foundingPrice)}／月</strong>
            <span>
              {enrollment?.freePilotActive
                ? 'Beta 期間目前每週教材 NT$0。如果希望在 30 席額滿前鎖定未來 NT$349/月優惠，可自願提前啟用月繳訂閱；這個選項會立即開始計費。若不需要鎖定席次，繼續使用目前 Beta 免費方案即可。'
                : capacityOpen
                  ? '第一週免費。標準月費 NT$' + formatPrice(productConfig.standardPrice) + '；創始 30 每月省 NT$150。只要訂閱不中斷，創始價格持續保留；取消後若重新加入，依當時標準方案價格計費。'
                  : '創始 NT$349/月優惠目前仍有名額。新學員目前先登記候補，名額開放後即可選擇訂閱鎖定優惠價格。'}
            </span>
          </div>
          <p className="founding-remaining">🎟️ 創始 30 優惠目前仍有名額（剩餘 {foundingRemaining} 席）</p>
        </div>
      )}
      <a className="button pricing-cta" href={cta.href} onClick={() => trackFreeTrialClick('pricing')}>{cta.label}</a>
      {capacityOpen && (
        <p className="pricing-delivery-note">
          {enrollment?.freePilotActive
            ? '完成孩子資料後，第一份專屬教材預計隔天開放下載。Beta 期間目前每週教材 NT$0；每週填寫回饋後會繼續準備下一週。'
            : '完成孩子資料後，第一份專屬教材預計隔天開放下載。'}
        </p>
      )}
    </article>
    <CapacityStatus enrollment={enrollment} />
    <p className="capacity-explainer">
      {enrollment?.freePilotActive
        ? '100 位是目前服務容量與 Beta 階段邊界。歷史錄取滿 100 位後，Beta 免費階段結束並恢復標準方案；已完成與正在準備中的教材不受影響，系統不會因為你曾使用 Beta 就自動替你開啟付費訂閱。'
        : '服務計數以孩子為單位，非家長帳戶。額滿後新加入者會先進入候補；已完成與正在準備中的教材不受影響，後續每週服務依訂閱方案繼續。'}
    </p>
  </section>
}
