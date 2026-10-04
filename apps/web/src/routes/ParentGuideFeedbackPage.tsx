import type { Session } from '@supabase/supabase-js'
import { ProductFeedbackForm } from '../components/product-feedback/ProductFeedbackForm'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { PageTransition } from '../components/motion/PageTransition'
import { getSupabaseClient } from '../lib/supabase'

const onlineSteps = [
  ['自然閱讀與分次作答', '從網頁直接開始，文章支援朗讀輔助。作答會自動暫存草稿，隨時可以停下來，之後再接續完成。'],
  ['整份提交與解鎖正解', '完成後確認提交。部分作答即有效、未答不算錯；整份提交後作答鎖定並顯示客觀題解析，但仍可隨時閱讀與朗讀。'],
  ['選填回饋與主動申請', '提交後即可主動申請下一份教材（每服務月最多 4 份）。家長觀察回饋為選填，送出後會成為未來教材的調整依據。'],
]

const paperSteps = [
  ['下載空白教材並列印', '家長由會員後台下載學生教材 PDF，自行列印於紙本供孩子動筆練習。'],
  ['核對解答與引導思考', '歷史紙本教材可由家長直接開啟解答 PDF 對答案；帶孩子檢視卡住的句子與生字。'],
  ['紙本回報與續用申請', '紙筆做完後，於後台填寫這週完成度與難度回饋，確認後即可主動申請下一份專屬教材。'],
]

const aiSteps = [
  ['把錯題變成理解，而不是抄答案', '先請孩子說說原本選了什麼、為什麼這樣選。看完答案後若仍不理解，再請 AI 解釋原因。'],
  ['用照片問 AI 的安全流程', '只拍需要討論的題目，不拍姓名、學校等個資。提問時說明原本想法，並請 AI 出一題相似題讓孩子再試一次。'],
]

export function ParentGuideFeedbackPage({ session }: { session: Session }) {
  return <AppShell header={<ParentNavigation email={session.user.email} onSignOut={() => void getSupabaseClient().auth.signOut()} />}>
    <PageTransition><section className="parent-guide-page">
      <p className="overline">家長使用說明</p><h1>陪孩子使用教材，不需要自己當英文老師</h1>
      <p className="lede">你只要幫孩子建立節奏、在完成後提供答案或引導提交、觀察學習情況；需要時，再一起善用 AI 找到「為什麼」。</p>
      
      <div className="parent-guide-sections">
        <section className="guide-flow-section">
          <h2>線上學習流程（推薦）</h2>
          <div className="parent-guide-steps">
            {onlineSteps.map(([title, detail], index) => (
              <section key={title}><span>{index + 1}</span><div><h3>{title}</h3><p>{detail}</p></div></section>
            ))}
          </div>
        </section>

        <section className="guide-flow-section">
          <h2>紙筆列印流程</h2>
          <div className="parent-guide-steps">
            {paperSteps.map(([title, detail], index) => (
              <section key={title}><span>{index + 1}</span><div><h3>{title}</h3><p>{detail}</p></div></section>
            ))}
          </div>
        </section>

        <section className="guide-flow-section">
          <h2>善用 AI 引導思考</h2>
          <div className="parent-guide-steps">
            {aiSteps.map(([title, detail], index) => (
              <section key={title}><span>{index + 1}</span><div><h3>{title}</h3><p>{detail}</p></div></section>
            ))}
          </div>
        </section>
      </div>

      <section className="product-feedback-section" aria-labelledby="product-feedback-heading"><p className="overline">協助我們變得更好</p><h2 id="product-feedback-heading">使用回饋</h2><p>遇到 Bug、流程卡住，或想對教材提出建議，都可以在這裡告訴我們。</p><ProductFeedbackForm /></section>
    </section></PageTransition>
  </AppShell>
}
