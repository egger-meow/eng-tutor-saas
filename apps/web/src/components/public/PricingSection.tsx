import { productConfig } from '../../content/site'
import { CapacityStatus } from './CapacityStatus'

export function PricingSection() {
  return <section className="public-section pricing-section" id="pricing" aria-labelledby="pricing-title">
    <p className="overline">方案</p>
    <h2 id="pricing-title">以每位孩子計費，兄弟姊妹各自獨立</h2>
    <div className="pricing-grid">
      <article><h3>標準方案</h3><p className="price">NT${productConfig.standardPrice}<span>／月／位孩子</span></p><p>每週一份個人化 Student PDF、一份 Parent Answer PDF，以及持續的學習紀錄與調整。</p></article>
      <article><p className="status-label">前 {productConfig.foundingLimit} 位孩子</p><h3>Founding 30</h3><p>第一週免費；第一個付費月 NT${productConfig.foundingPrice}，之後恢復 NT${productConfig.standardPrice}。</p></article>
    </div>
    <CapacityStatus />
    <p className="capacity-explainer">前 100 位是第一階段。我們希望先把每週教材品質和系統真正顧好，再開放下一批；額滿後既有家庭仍會正常收到教材。</p>
  </section>
}
