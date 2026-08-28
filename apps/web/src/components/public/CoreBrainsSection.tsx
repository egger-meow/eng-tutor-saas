import { FadeInUp } from '../motion/FadeInUp'
import { StaggerContainer, StaggerItem } from '../motion/StaggerContainer'
import './CoreBrainsSection.css'

const brains = [
  {
    mark: '01',
    icon: '◎',
    eyebrow: '決定這週值得讀什麼',
    title: '全網知識大腦',
    body: '依孩子的興趣、英文程度與本週學習目標，搜尋並篩選可靠的真實資訊。遇到科技、AI、運動等快速變化的題材，也會在適合時納入近期發展，再重新寫成孩子現在讀得懂的英文。',
    principle: '興趣不是文章換皮，而是通往真實新知的入口。',
    tags: ['可靠資訊', '適齡新知', '程度重寫'],
  },
  {
    mark: '02',
    icon: '◇',
    eyebrow: '決定怎麼把內容變成好教材',
    title: '會考命題大腦',
    body: '近五年國中會考英文 215 題被拆解成命題知識，讓系統理解題目真正使用的證據、推理深度、跨句整合與干擾選項設計。新題先對齊這套品質標準，再依孩子程度自由設計，不照抄也不把題型鎖死。',
    principle: '會考是品質底線，不是限制創意的模具。',
    tags: ['閱讀證據', '推理深度', '干擾選項'],
  },
] as const

export function CoreBrainsSection() {
  return (
    <section className="public-section core-brains-section" id="core-brains" aria-labelledby="core-brains-title">
      <FadeInUp reveal="pop" className="core-brains-heading">
        <p className="overline">不是叫 AI 隨機寫文章、再隨機出幾題</p>
        <h2 id="core-brains-title">紙屬英文的兩顆核心大腦</h2>
        <p>一顆負責把世界帶進教材，一顆負責守住國中英文與會考需要的思考品質。最後再和孩子自己的學習狀態合在一起。</p>
      </FadeInUp>

      <StaggerContainer className="core-brains-grid" staggerDelay={0.12}>
        {brains.map((brain, index) => (
          <StaggerItem key={brain.title} reveal={index === 0 ? 'left' : 'right'} delay={index * 0.06}>
            <article className="core-brain-card">
              <div className="core-brain-topline">
                <span className="core-brain-mark">{brain.mark}</span>
                <span className="core-brain-icon" aria-hidden="true">{brain.icon}</span>
              </div>
              <p className="core-brain-eyebrow">{brain.eyebrow}</p>
              <h3>{brain.title}</h3>
              <p className="core-brain-body">{brain.body}</p>
              <div className="core-brain-tags" aria-label={`${brain.title}的重點`}>
                {brain.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
              <p className="core-brain-principle"><strong>{brain.principle}</strong></p>
            </article>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <FadeInUp reveal="pop" delay={0.1} className="core-brains-equation" aria-label="兩顆核心大腦如何形成本週教材">
        <div><span>孩子現在的位置</span><small>程度・進度・興趣・上週表現</small></div>
        <b aria-hidden="true">＋</b>
        <div><span>全網知識大腦</span><small>把值得學的新知帶進來</small></div>
        <b aria-hidden="true">＋</b>
        <div><span>會考命題大腦</span><small>守住閱讀與推理品質</small></div>
        <b className="core-brains-arrow" aria-hidden="true">→</b>
        <div className="core-brains-result"><span>這一週，只屬於他的教材</span><small>內容有料，也練得到能力</small></div>
      </FadeInUp>
    </section>
  )
}
