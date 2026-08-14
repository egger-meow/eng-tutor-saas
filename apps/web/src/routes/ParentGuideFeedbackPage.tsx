import type { Session } from '@supabase/supabase-js'
import { ProductFeedbackForm } from '../components/product-feedback/ProductFeedbackForm'
import { AppShell } from '../components/layout/AppShell'
import { ParentNavigation } from '../components/layout/ParentNavigation'
import { PageTransition } from '../components/motion/PageTransition'
import { getSupabaseClient } from '../lib/supabase'

const steps = [
  ['先自己做，再一起對答案', '請讓孩子先讀文章、完成題目。完成一個段落後，再打開家長答案，標記答錯或不確定的題目。'],
  ['把錯題變成理解，而不是答案', '先請孩子說說自己選了什麼、為什麼這樣選。看完答案後，若還是不懂，再請 AI 解釋錯誤的原因。'],
  ['用照片問 AI 的安全流程', '只拍需要討論的題目，不要拍姓名、學校、電話或其他個資。提問時說明原本選項，請 AI 解釋原因，並出一題相似題讓孩子再試一次。'],
  ['每週花一分鐘觀察', '留意教材是否太難或太簡單、完成多少、哪一類題目常錯，以及孩子喜歡或抱怨什麼。這些可填在每週教材旁的回饋，會用於未來教材調整。'],
]

export function ParentGuideFeedbackPage({ session }: { session: Session }) {
  return <AppShell header={<ParentNavigation email={session.user.email} onSignOut={() => void getSupabaseClient().auth.signOut()} />}>
    <PageTransition><section className="parent-guide-page">
      <p className="overline">家長使用說明</p><h1>陪孩子使用教材，不需要自己當英文老師</h1>
      <p className="lede">你只要幫孩子建立節奏、在完成後提供答案、觀察學習情況；需要時，再一起善用 AI 找到「為什麼」。</p>
      <div className="parent-guide-steps">{steps.map(([title, detail], index) => <section key={title}><span>{index + 1}</span><div><h2>{title}</h2><p>{detail}</p></div></section>)}</div>
      <section className="product-feedback-section" aria-labelledby="product-feedback-heading"><p className="overline">協助我們變得更好</p><h2 id="product-feedback-heading">使用回饋</h2><p>遇到 Bug、流程卡住，或想對教材提出建議，都可以在這裡告訴我們。</p><ProductFeedbackForm /></section>
    </section></PageTransition>
  </AppShell>
}
