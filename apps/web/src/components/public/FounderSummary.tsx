import { handleInternalLink } from '../../app/use-route'
import { founderContent } from '../../content/site'

export function FounderSummary() {
  return <section className="public-section founder-summary" aria-labelledby="founder-summary-title"><p className="overline">由一個人負責到底</p><h2 id="founder-summary-title">教育判斷與產品實作，不交給模糊的品牌口號</h2><p>{founderContent.philosophy}</p><a href="/about" onClick={handleInternalLink}>閱讀作者理念與背景</a></section>
}

