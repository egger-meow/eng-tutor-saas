import { useEffect, useState } from 'react'
import { productConfig } from '../../content/site'
import { getEnrollmentState, type EnrollmentState } from '../../lib/enrollment'
import { CapacityStatus } from './CapacityStatus'

export function PricingSection() {
  const [enrollment, setEnrollment] = useState<EnrollmentState | null>(null)
  useEffect(() => { void getEnrollmentState().then(setEnrollment).catch(() => undefined) }, [])
  const foundingRemaining = enrollment ? Math.max(enrollment.foundingLimit - enrollment.foundingCount, 0) : null

  return <section className="public-section pricing-section" id="pricing" aria-labelledby="pricing-title">
    <div className="pricing-heading">
      <div><p className="overline">清楚知道每週得到什麼</p><h2 id="pricing-title">每月 NT${productConfig.standardPrice}，以孩子為單位</h2></div>
      <p>每個孩子都有獨立的學習記憶、教材、回饋與生成節奏。</p>
    </div>
    <article className="pricing-card">
      <div className="pricing-offer"><p className="price"><span>每位孩子</span>NT${productConfig.standardPrice}</p><p className="pricing-cadence">每月訂閱</p></div>
      <ul className="pricing-includes"><li>Student PDF</li><li>Parent Answer PDF</li><li>依孩子程度與回饋持續調整</li><li>家長可管理多位孩子</li></ul>
      <div className="founding-offer"><p className="status-label">前 {productConfig.foundingLimit} 位孩子</p><strong>第一週免費，第一個付費月 NT${productConfig.foundingPrice}</strong><span>第二個付費月起為 NT${productConfig.standardPrice}／月。{foundingRemaining === null ? '' : `目前還有 ${foundingRemaining} 個早鳥名額。`}</span></div>
      <a className="button pricing-cta" href="#login">免費取得第一週教材</a>
    </article>
    <CapacityStatus />
    <p className="capacity-explainer">前 100 位是第一階段服務容量。計數以孩子為單位，不是 Email 或家長帳戶；額滿後既有家庭仍會正常收到教材。</p>
  </section>
}
