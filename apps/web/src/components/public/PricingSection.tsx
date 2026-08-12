import { productConfig } from '../../content/site'

export function PricingSection() {
  return <section className="public-section pricing-section" id="pricing" aria-labelledby="pricing-title">
    <p className="overline">方案</p><h2 id="pricing-title">每位孩子，一份獨立的學習計畫</h2>
    <div className="pricing-grid"><article><h3>標準方案</h3><p className="price">NT${productConfig.standardPrice}<span>／月／孩子</span></p><p>每週學生教材、家長解答與依回饋持續調整。</p></article><article><p className="status-label">前 {productConfig.foundingLimit} 位孩子</p><h3>創始家庭方案</h3><p>第一週個人化教材免費；第一個付費月 NT${productConfig.foundingPrice}，之後每月 NT${productConfig.standardPrice}。</p></article></div>
  </section>
}

