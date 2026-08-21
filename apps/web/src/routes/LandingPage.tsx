import { useState } from 'react'
import { AuthPanel } from '../components/auth/AuthPanel'
import { AppShell } from '../components/layout/AppShell'
import { PublicFooter } from '../components/layout/PublicFooter'
import { PublicHeader } from '../components/layout/PublicHeader'
import { FounderSummary } from '../components/public/FounderSummary'
import { PricingSection } from '../components/public/PricingSection'
import { FadeInUp } from '../components/motion/FadeInUp'
import { StaggerContainer, StaggerItem } from '../components/motion/StaggerContainer'
import { PageTransition } from '../components/motion/PageTransition'
import { getEnrollmentCta, useEnrollmentState } from '../lib/enrollment'
import '../landing-evolution.css'

const abilityBenefits = [
  ['願意開始讀', '先用孩子有興趣的題材降低抗拒，再把注意力帶進真正的英文閱讀。'],
  ['練得到能力', '單字、文法、閱讀理解與推理，都以國中英文與會考能力為長期方向。'],
  ['家長不用備課', '每週直接拿到學生教材與家長解答，不必自己找文章、出題或判斷難度。'],
] as const

const weeklyContents = [
  '約 8–12 頁、可在家列印的 Student PDF',
  '閱讀、核心單字、文法提示、理解與應用練習',
  '獨立的 Parent Answer PDF，附完整答案與觀察重點',
  '依程度、學校進度、錯誤與回饋調整的下一週教材',
] as const

const evolutionPillars = [
  ['01', '孩子越用，教材越懂他', '不是每週重新猜一次。程度、學校進度、學過的內容、常錯的地方與家長回饋會持續累積，下一週接著孩子真正的位置往前。'],
  ['02', '教材系統自己也會持續升級', '題型、課程對齊、錯誤診斷與教材設計能力會持續改善。就像軟體更新，訂閱中的孩子會直接得到更完整的下一份教材。'],
  ['03', 'AI 進步，教材也跟著進步', '我們持續把更適合教育的模型與方法接進系統。家長不用研究模型版本，技術升級是我們的事，孩子拿到更好的教材才是你看見的事。'],
] as const

const usageModes = [
  ['自己完成', '孩子自己學', 'Student PDF 直接給孩子，照著閱讀、提示與練習一步一步完成。'],
  ['一起使用', '家長陪著學', '搭配 Parent Answer PDF，不必先備課；有時間時一起讀、訂正、聊錯在哪裡。'],
  ['交給老師', '搭配家教／老師使用', '直接當作每週教學內容、補充教材或回家作業，老師不用從零準備一整套。'],
] as const

export const faqItems = [
  ['這適合幾年級的孩子？', '目前主要為國小高年級到國中生設計，長期方向是國中英文與會考所需能力，不是高中英文產品。難度不按年級死切，而會依實際程度、作答表現與回饋調整。'],
  ['第一週怎麼判斷孩子程度？', '會先參考年級、課本版本、學校進度、已知強弱項與家長描述。第一週同時是校準教材；收到使用回饋後，下一週可以做更明顯的難度調整。'],
  ['多久可以拿到第一份教材？', '完成孩子資料後，第一份專屬教材預計於隔天開放下載。之後每週依固定節奏提供新的個人化教材。'],
  ['一定要讓孩子自己學嗎？', '不用。孩子可以自己完成，也可以由家長陪讀，或把 Student PDF 與 Parent Answer PDF 交給家教、老師當作每週教學內容與回家練習。教材準備好，怎麼使用由家庭決定。'],
  ['教材之後也會持續變好嗎？', '會。除了孩子自己的學習記憶會持續累積，紙屬英文也會持續改善教材架構、題型、課程對齊與使用的 AI 能力。這些系統升級會直接反映在之後產生的教材，不需要家長另外設定。'],
  ['可以直接把紙本教材寄到家嗎？', '目前教材以 PDF 提供，家長可以直接下載列印。我們目前專注在每週教材內容的個人化調整，暫不提供實體郵寄服務。'],
  ['一定要讓孩子使用 AI 嗎？', '不用。AI 使用是選擇性的；核心仍是孩子先閱讀、作答、對答案與找錯因。只有需要更多解釋或類題時才使用外部 AI 工具。'],
  ['每個孩子都要各自付費嗎？', '是。每位孩子有獨立的程度、學習記憶、每週教材與訂閱，因此以每位孩子計費，可選月繳 NT$499 或年繳 NT$4,999。'],
  ['100 位額滿後會怎麼樣？', '新孩子會先進入候補，既有家庭照常收到教材。第一階段上限是真實的服務容量，不會用隨機數字或假倒數製造急迫感。'],
] as const

export function LandingPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  const { state: enrollment } = useEnrollmentState()
  const cta = getEnrollmentCta(enrollment)

  return (
    <AppShell className="landing-page" header={<PublicHeader />}>
      <PageTransition>
        <section className="landing-hero">
          <FadeInUp duration={0.4} className="hero-copy">
            <p className="eyebrow">給國小高年級到國中生的每週紙本英文教材</p>
            <h1 className="hero-title">
              <span>每週一份，</span><span><em>只屬</em>於你孩子的</span><span>英文教材。</span>
            </h1>
            <p className="lede"><strong>先讓孩子願意讀，再把英文能力真的練起來。</strong>紙屬英文會記得孩子的程度、學校進度、興趣與每週表現，讓教材不是重來，而是一路接著他往前。</p>
            <ul className="hero-benefits" aria-label="紙屬英文重點">
              <li>每週 Student PDF + Parent Answer PDF</li>
              <li>孩子用紙筆閱讀、作答與思考</li>
              <li>家長不用找教材、備課或出題</li>
            </ul>
            <div className="hero-actions">
              <a className="button hero-cta" href={cta.href}>{cta.label}</a>
              <a className="text-link" href="#samples">先看真實教材 ↓</a>
            </div>
            <p className="hero-note">{cta.label === '免費取得第一週教材' ? '前 30 位孩子第一週免費；月繳第一個付費月 NT$299，之後每月 NT$499；也可選年繳 NT$4,999。' : cta.isWaitlist ? '目前服務名額已滿；候補不會先收費。' : '目前可選月繳 NT$499 或年繳 NT$4,999。'}</p>
            <p className="hero-delivery-note">完成孩子資料後，第一份專屬教材預計隔天開放下載。</p>
          </FadeInUp>

          <FadeInUp delay={0.15} duration={0.4} className="hero-editorial" aria-label="每週教材內容示意">
            <span className="edition-mark">THIS WEEK · FOR ONE CHILD</span>
            <p>不是買一份固定教材。</p>
            <strong><span>是一套會記得孩子、</span><span>每週重新替他做教材的</span><span>學習系統。</span></strong>
            <div className="paper-rule" />
            <small>AI 在背後記憶、調整與升級；孩子在紙上完成真正的學習。</small>
          </FadeInUp>
        </section>

        <StaggerContainer tag="section" className="outcome-strip" staggerDelay={0.09} aria-label="孩子與家長得到的價值">
          {abilityBenefits.map(([title, body], index) => (
            <StaggerItem tag="article" key={title} delay={index * 0.05}><span>0{index + 1}</span><h2>{title}</h2><p>{body}</p></StaggerItem>
          ))}
        </StaggerContainer>

        <section className="public-section week-story" id="personalization">
          <FadeInUp reveal="pop" className="section-heading">
            <p className="overline">這週的狀況，會改變下週</p>
            <h2>個人化不是換個故事主題。<br />是孩子下一步練什麼，真的會變。</h2>
            <p>家長只要回報難度、完成度與卡住的地方，系統就把這些訊號放進下一週的教材設計。</p>
          </FadeInUp>

          <StaggerContainer className="week-flow" staggerDelay={0.16}>
            <StaggerItem reveal="left" delay={0} className="week-sheet">
              <span>這週觀察</span>
              <ul><li>閱讀明顯太簡單</li><li>do / does 再次答錯</li><li>學校開始現在進行式</li><li>最近開始喜歡籃球</li></ul>
            </StaggerItem>
            <StaggerItem reveal="pop" delay={0.08} className="flow-line" aria-label="因此產生下一週">下一週真的跟著改 <b>→</b></StaggerItem>
            <StaggerItem reveal="right" delay={0.16} className="week-sheet next-week">
              <span>下週調整</span>
              <ul><li>閱讀難度提高一級</li><li>安排 do / does 間隔複習</li><li>銜接現在進行式的提示與題目</li><li>用籃球情境承載適合程度的閱讀</li></ul>
            </StaggerItem>
          </StaggerContainer>

          <FadeInUp delay={0.15} className="inline-objection">
            <p className="overline">只讀興趣主題，對考試真的有用嗎？</p>
            <h3>興趣是入口，不是能力的邊界。</h3>
            <p>主題先讓孩子願意讀；學習目標仍由國中英文能力決定。孩子練的是能轉移到不同文章的單字、文法、上下文理解、細節判讀與推理，不是只會看某一種故事。</p>
          </FadeInUp>
        </section>

        <section className="public-section system-evolution-section" id="system-evolution">
          <FadeInUp reveal="pop" className="system-evolution-heading">
            <p className="overline">訂閱的是一個會變好的系統</p>
            <h2>你訂閱的不是一份教材，而是一套會陪孩子一起進步的教材系統。</h2>
            <p>三條進步路徑同時發生：孩子的學習記憶在累積、教材引擎在升級、底層 AI 也持續變強。</p>
          </FadeInUp>

          <StaggerContainer className="evolution-grid" staggerDelay={0.1}>
            {evolutionPillars.map(([step, title, body], index) => (
              <StaggerItem key={step} reveal="pop" delay={index * 0.05}>
                <article className="evolution-card">
                  <span className="evolution-step">{step}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <FadeInUp reveal="left" delay={0.12} className="evolution-loop" aria-label="教材持續進步的循環">
            <span>Week 1</span><b>→</b><span>回饋與學習記憶</span><b>→</b><span>Week 2 更貼合</span><b>→</b><span>系統持續升級</span>
          </FadeInUp>
        </section>

        <section className="public-section deliverables-section" id="samples">
          <FadeInUp reveal="pop" className="section-heading">
            <p className="overline">先看每週實際拿到什麼</p>
            <h2>兩份 PDF：孩子能自己做，家長看得懂怎麼陪。</h2>
            <ul className="weekly-contents">{weeklyContents.map((item) => <li key={item}>{item}</li>)}</ul>
          </FadeInUp>

          <FadeInUp delay={0.1} className="sample-personalization-explainer">
            <div className="sample-context-card">
              <div className="sample-context-header">
                <span className="sample-context-badge">範例拆解</span>
                <h3 className="sample-context-title">這份教材為什麼是 Minecraft？</h3>
              </div>

              <p className="sample-context-meta">
                <strong>範例學生</strong>：國一 ｜ 喜歡 <strong>Minecraft、科技</strong> ｜ 依目前程度與本週學習目標設計
              </p>
              <p className="sample-context-narrative">
                因此這週以 Minecraft 的紅石自動門作為閱讀情境，練習真正需要累積的單字、文法與閱讀理解。
              </p>

              <div className="sample-flow-strip" aria-label="個人化教材生成流程">
                <div className="sample-flow-node">
                  <span className="node-label">孩子的興趣</span>
                  <div className="node-tags">
                    <span className="tag-pill tag-accent">Minecraft</span>
                    <span className="tag-pill tag-accent">科技</span>
                  </div>
                </div>

                <span className="flow-plus" aria-hidden="true">＋</span>

                <div className="sample-flow-node">
                  <span className="node-label">目前程度</span>
                  <div className="node-tags">
                    <span className="tag-pill">國一</span>
                  </div>
                </div>

                <span className="flow-plus" aria-hidden="true">＋</span>

                <div className="sample-flow-node">
                  <span className="node-label">學習目標</span>
                  <div className="node-tags">
                    <span className="tag-pill">閱讀理解</span>
                    <span className="tag-pill">核心單字</span>
                    <span className="tag-pill">文法</span>
                  </div>
                </div>

                <span className="flow-arrow" aria-hidden="true">→</span>

                <div className="sample-flow-node node-output">
                  <span className="node-label">本週教材</span>
                  <strong className="output-title">The Redstone Door Test</strong>
                  <span className="output-subtitle">Minecraft 紅石自動門情境閱讀</span>
                </div>
              </div>

              <div className="sample-context-footer">
                <p className="footer-message">
                  <strong>孩子喜歡什麼，決定我們怎麼帶他進入英文；他最後學會的，仍然是能帶去學校、段考與會考的英文能力。</strong>
                </p>
                <p className="footer-subtext">
                  主題是引導閱讀的興趣載體，累積的單字、文法、上下文理解與推論能力皆能跨題材轉移。
                </p>
              </div>
            </div>
          </FadeInUp>

          <StaggerContainer className="document-pair pdf-preview-grid" staggerDelay={0.15}>
            <StaggerItem reveal="left"><article className="pdf-preview-card">
              <p className="document-label">Student PDF</p><h3>答案不會先出現，留給孩子真正思考</h3>
              <a className="pdf-preview" href="/samples/sample-week-1-student.pdf" target="_blank" rel="noreferrer" aria-label="另開視窗查看學生教材 PDF">
                <iframe title="Student PDF 教材預覽" src="/samples/sample-week-1-student.pdf#page=1&view=FitH&toolbar=0" /><span>放大查看真實教材 ↗</span>
              </a>
              <ul className="preview-notes"><li>清楚告訴孩子每一區怎麼做</li><li>自然閱讀、單字、文法、理解與回想練習</li></ul>
            </article></StaggerItem>
            <StaggerItem reveal="right"><article className="pdf-preview-card">
              <p className="document-label">Parent Answer PDF</p><h3>完整答案分開放，家長不用先備課</h3>
              <a className="pdf-preview" href="/samples/sample-week-1-parent-answer.pdf" target="_blank" rel="noreferrer" aria-label="另開視窗查看家長解答 PDF">
                <iframe title="Parent Answer PDF 教材預覽" src="/samples/sample-week-1-parent-answer.pdf#page=1&view=FitH&toolbar=0" /><span>放大查看真實解答 ↗</span>
              </a>
              <ul className="preview-notes"><li>完整答案、簡短解釋與觀察重點</li><li>不用會教英文，也知道孩子卡在哪裡</li></ul>
            </article></StaggerItem>
          </StaggerContainer>
        </section>

        <section className="public-section usage-modes-section" id="usage-modes">
          <FadeInUp reveal="pop" className="usage-heading">
            <p className="overline">一套教材，三種都能用</p>
            <h2>怎麼教，由你決定；每週要教什麼，我們幫你準備好。</h2>
            <p>紙屬英文不是強迫孩子只能自學。它先把每週最花時間的「找內容、抓難度、出題、做答案」準備好，再讓家庭選最適合自己的使用方式。</p>
          </FadeInUp>
          <StaggerContainer className="usage-grid" staggerDelay={0.1}>
            {usageModes.map(([tag, title, body], index) => (
              <StaggerItem key={title} delay={index * 0.05}>
                <article className="usage-card">
                  <span>{tag}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        <section className="public-section philosophy-section">
          <FadeInUp reveal="left"><p className="overline">為什麼選紙本？</p><h2>讓科技做它擅長的事，<br />讓孩子完成不能外包的思考。</h2></FadeInUp>
          <FadeInUp reveal="right" delay={0.08}><p>AI 負責記住進度、分析錯誤、調整難度；孩子面前只有紙、筆與題目。可以畫線、圈單字、留下錯誤痕跡，也少一個會跳出通知的螢幕。</p></FadeInUp>
        </section>

        <section className="public-section ai-section" id="method">
          <FadeInUp reveal="pop" className="section-heading">
            <p className="overline">AI 是教材背後的機制，不是替孩子作答的人</p>
            <h2>先自己讀、自己答；<br />真的不懂，再請 AI 解釋為什麼。</h2>
            <p>每週學習仍從孩子的閱讀與作答開始。AI 可以在卡住時當解釋與延伸練習工具，但不是完成作業的捷徑。</p>
          </FadeInUp>
          <StaggerContainer className="learning-sequence" staggerDelay={0.08}>
            <StaggerItem tag="li" delay={0}><span>01</span>先完整讀過文章</StaggerItem><StaggerItem tag="li" delay={0.05}><span>02</span>圈出不懂的字句</StaggerItem><StaggerItem tag="li" delay={0.1}><span>03</span>自己完成作答</StaggerItem><StaggerItem tag="li" delay={0.15}><span>04</span>對答案、找出錯因</StaggerItem><StaggerItem tag="li" delay={0.2}><span>05</span>需要時請 AI 解釋，再做一題</StaggerItem>
          </StaggerContainer>
          <FadeInUp reveal="right" delay={0.08} className="why-not-gpt" id="chatgpt-difference">
            <p className="overline">那直接用 ChatGPT 不就好了？</p>
            <h3>ChatGPT 解決一次提問；紙屬英文維持一段學習。</h3>
            <div className="comparison-compact">
              <p><strong>一般聊天工具</strong><span>需要家長反覆說明程度、寫提示、控制難度、整理成可印教材。</span></p>
              <p><strong>紙屬英文</strong><span>持續記住課程進度、學過的字、錯誤、主題與回饋，並負責每週交付完整教材。</span></p>
            </div>
            <p className="comparison-conclusion">差別不只是一個 Prompt，而是學習記憶、課程邊界與每週持續調整。</p>
          </FadeInUp>
        </section>

        <section className="public-section parent-role">
          <FadeInUp reveal="left"><p className="overline">家長每週要做什麼？</p><h2>列印、觀察、點幾下回饋。<br />不用自己當英文老師。</h2><p>看看難度是否合適、完成了多少、哪一區反覆卡住。簡短回饋就能幫助下一週調整；家長不必找文章、出題、做答案或記住上週錯了什麼。</p></FadeInUp>
          <FadeInUp reveal="pop" delay={0.1}><a className="button mid-page-cta" href={cta.href}>{cta.label}</a></FadeInUp>
        </section>

        <FadeInUp reveal="right"><FounderSummary /></FadeInUp>
        <FadeInUp reveal="left"><PricingSection /></FadeInUp>

        <section className="public-section faq" id="faq">
          <FadeInUp className="section-heading"><p className="overline">FAQ</p><h2>決定之前，你可能還想確認。</h2></FadeInUp>
          <StaggerContainer staggerDelay={0.06}>
            {faqItems.map(([question, answer], index) => {
              const isOpen = openFaqIndex === index
              return (
                <StaggerItem key={question} delay={(index % 4) * 0.04}>
                  <article className="faq-item">
                    <button
                      type="button"
                      className="faq-trigger"
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${index}`}
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    >
                      <span>{question}</span><span className="faq-icon" aria-hidden="true">{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen && <p id={`faq-answer-${index}`}>{answer}</p>}
                  </article>
                </StaggerItem>
              )
            })}
          </StaggerContainer>
        </section>

        <section className="public-section login-section" id="login">
          <FadeInUp><p className="overline">{cta.isWaitlist ? '候補登記' : '開始使用或登入'}</p><h2>{cta.isWaitlist ? '目前名額已滿，先登記候補。' : '先讓教材認識你的孩子。'}</h2><p>{cta.isWaitlist ? '初期最多服務 100 位孩子。候補不會先收費，有名額時會通知你。' : '第一次使用，從家長 Email 建立帳號；已有帳號則使用原本 Email 登入，再回到孩子的教材。'}</p>{!cta.isWaitlist && <ul className="login-expectations"><li>建立家長帳號或登入</li><li>填寫一位孩子的學習狀況</li><li>第一份專屬教材預計隔天開放下載</li></ul>}</FadeInUp>
          <FadeInUp delay={0.15}>{cta.isWaitlist ? <a className="button" href="/waitlist">登記候補</a> : <AuthPanel />}</FadeInUp>
        </section>
      </PageTransition>
      <PublicFooter />
    </AppShell>
  )
}
