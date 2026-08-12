import { AppShell } from '../components/layout/AppShell'
import { PublicHeader } from '../components/layout/PublicHeader'

const steps = [['先完整讀一次', '先理解大意，不要一看到生字就停下來。'], ['圈出不懂的字', '用上下文猜意思，再查證並寫進自己的單字本。'], ['獨立完成題目', '先留下自己的思考，錯誤才有學習價值。'], ['分類錯誤原因', '分清楚是單字、文法、閱讀策略，還是粗心。'], ['最後才使用 AI', '請 AI 解釋句子或出相似練習，不要直接代寫答案。']]

export function GuidePage() { return <AppShell header={<PublicHeader />}><article className="guide-page"><p className="overline">紙上學習方法</p><h1>科技可以解釋，但不能替孩子思考。</h1><p className="lede">每週教材遵循同一個簡單順序，讓孩子逐漸建立可以帶走的閱讀方法。</p><ol>{steps.map(([title, detail]) => <li key={title}><h2>{title}</h2><p>{detail}</p></li>)}</ol><aside><strong>拍照詢問前，先遮住姓名、學校、班級與其他個資。</strong></aside></article></AppShell> }

