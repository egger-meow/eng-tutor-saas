import { productConfig } from '../../content/site'
import { CapacityStatus } from './CapacityStatus'

export function PricingSection() {
  return <section className="public-section pricing-section" id="pricing" aria-labelledby="pricing-title">
    <div className="pricing-heading">
      <div><p className="overline">一個孩子，一套持續調整的教材</p><h2 id="pricing-title">每月 NT${productConfig.standardPrice}，家長不用再從零準備每一週。</h2></div>
      <p>每位孩子各自累積程度、錯誤與回饋，因此兄弟姊妹會有不同教材，也各自計費。</p>
    </div>
    <article className="pricing-card">
      <div className="pricing-offer"><p className="price"><span>每位孩子每月</span>NT${productConfig.standardPrice}</p><p className="pricing-cadence">每週交付一套可列印教材</p></div>
      <ul className="pricing-includes"><li>個人化 Student PDF</li><li>獨立的 Parent Answer PDF</li><li>程度、進度與錯誤的持續記憶</li><li>家長回饋影響下一週教材</li></ul>
      <div className="founding-offer"><p className="status-label">前 {productConfig.foundingLimit} 位孩子</p><strong>第一週免費，第一個付費月 NT${productConfig.foundingPrice}</strong><span>第二個付費月起為 NT${productConfig.standardPrice}／月。</span></div>
      <a className="button pricing-cta" href="#login">免費取得第一週教材</a>
    </article>
    <CapacityStatus />
    <p className="capacity-explainer">前 100 位是第一階段。我們希望先把每週教材品質和系統真正顧好，再開放下一批；額滿後既有家庭仍會正常收到教材。</p>
  </section>
}
