import { handleInternalLink } from '../../app/use-route'
import { founderContent } from '../../content/site'

export function FounderSummary() {
  return <section className="public-section founder-summary" aria-labelledby="founder-summary-title"><p className="overline">為什麼我做紙屬英文</p><h2 id="founder-summary-title">我想把教學現場真正需要的判斷，做成每週都能兌現的系統。</h2><p>{founderContent.philosophy}</p><p className="muted">早期產品由創辦人直接參與教材方法、軟體與 AI 系統的建立。學經歷、家教經驗、會考成績證明與作品連結只會在本人確認後公開，不用模糊的品牌話術代替信任。</p><a href="/about" onClick={handleInternalLink}>閱讀作者理念與已確認背景</a></section>
}
