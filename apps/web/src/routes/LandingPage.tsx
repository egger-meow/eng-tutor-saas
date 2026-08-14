import { AuthPanel } from '../components/auth/AuthPanel'
import { AppShell } from '../components/layout/AppShell'
import { PublicHeader } from '../components/layout/PublicHeader'
import { FounderSummary } from '../components/public/FounderSummary'
import { PricingSection } from '../components/public/PricingSection'
import { FadeInUp } from '../components/motion/FadeInUp'
import { StaggerContainer, StaggerItem } from '../components/motion/StaggerContainer'
import { PageTransition } from '../components/motion/PageTransition'

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

export function LandingPage() {
  return (
    <AppShell className="landing-page" header={<PublicHeader />}>
      <PageTransition>
        <section className="landing-hero">
          <FadeInUp duration={0.4} className="hero-copy">
            <p className="eyebrow">給國小高年級到國中生的每週紙本英文教材</p>
            <h1>
              孩子願意讀，<br /><em>英文能力真的練得到。</em>
            </h1>
            <p className="lede">紙屬英文每週依孩子的程度、學校進度與學習狀況，製作一套個人化英文教材。從有興趣的內容開始，練出能帶進學校、段考與會考的單字、文法與閱讀能力。</p>
            <ul className="hero-benefits" aria-label="紙屬英文重點">
              <li>每週 Student PDF + Parent Answer PDF</li>
              <li>孩子用紙筆閱讀、作答與思考</li>
              <li>家長不用找教材、備課或出題</li>
            </ul>
            <div className="hero-actions">
              <a className="button hero-cta" href="#login">免費取得第一週教材</a>
              <a className="text-link" href="#samples">先看真實教材 ↓</a>
            </div>
            <p className="hero-note">前 30 位孩子第一週免費；第一個付費月 NT$299，之後每月 NT$499。</p>
          </FadeInUp>

          <FadeInUp delay={0.15} duration={0.4} className="hero-editorial" aria-label="每週教材內容示意">
            <span className="edition-mark">THIS WEEK · FOR ONE CHILD</span>
            <p>不是聊天機器人，也不是線上家教。</p>
            <strong>是一套每週更新、<br />可以直接印出來學的<br />個人化英文教材。</strong>
            <div className="paper-rule" />
            <small>AI 在背後記憶與調整；孩子在紙上完成真正的學習。</small>
          </FadeInUp>
        </section>

        <section className="outcome-strip" aria-label="孩子與家長得到的價值">
          {abilityBenefits.map(([title, body], index) => (
            <article key={title}><span>0{index + 1}</span><h2>{title}</h2><p>{body}</p></article>
          ))}
        </section>

        <section className="public-section week-story" id="personalization">
          <FadeInUp className="section-heading">
            <p className="overline">這週的狀況，會改變下週</p>
            <h2>個人化不是換個故事主題。<br />是孩子下一步練什麼，真的會變。</h2>
            <p>家長只要回報難度、完成度與卡住的地方，系統就把這些訊號放進下一週的教材設計。</p>
          </FadeInUp>

          <FadeInUp delay={0.1} className="week-flow">
            <div className="week-sheet">
              <span>這週觀察</span>
              <ul><li>閱讀明顯太簡單</li><li>do / does 再次答錯</li><li>學校開始現在進行式</li><li>最近開始喜歡籃球</li></ul>
            </div>
            <div className="flow-line" aria-label="因此產生下一週">下一週真的跟著改 <b>→</b></div>
            <div className="week-sheet next-week">
              <span>下週調整</span>
              <ul><li>閱讀難度提高一級</li><li>安排 do / does 間隔複習</li><li>銜接現在進行式的提示與題目</li><li>用籃球情境承載適合程度的閱讀</li></ul>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.15} className="inline-objection">
            <p className="overline">只讀興趣主題，對考試真的有用嗎？</p>
            <h3>興趣是入口，不是能力的邊界。</h3>
            <p>主題先讓孩子願意讀；學習目標仍由國中英文能力決定。孩子練的是能轉移到不同文章的單字、文法、上下文理解、細節判讀與推理，不是只會看某一種故事。</p>
          </FadeInUp>
        </section>

        <section className="public-section deliverables-section" id="samples">
          <FadeInUp className="section-heading">
            <p className="overline">先看每週實際拿到什麼</p>
            <h2>兩份 PDF：孩子能自己做，家長看得懂怎麼陪。</h2>
            <ul className="weekly-contents">{weeklyContents.map((item) => <li key={item}>{item}</li>)}</ul>
          </FadeInUp>

          <StaggerContainer className="document-pair pdf-preview-grid" staggerDelay={0.15}>
            <StaggerItem><article className="pdf-preview-card">
              <p className="document-label">Student PDF</p><h3>答案不會先出現，留給孩子真正思考</h3>
              <a className="pdf-preview" href={`${import.meta.env.BASE_URL}samples/sample-week-1-student.pdf`} target="_blank" rel="noreferrer" aria-label="另開視窗查看學生教材 PDF">
                <iframe title="Student PDF 教材預覽" src={`${import.meta.env.BASE_URL}samples/sample-week-1-student.pdf#page=1&view=FitH&toolbar=0`} /><span>放大查看真實教材 ↗</span>
              </a>
              <ul className="preview-notes"><li>清楚告訴孩子每一區怎麼做</li><li>自然閱讀、單字、文法、理解與回想練習</li></ul>
            </article></StaggerItem>
            <StaggerItem><article className="pdf-preview-card">
              <p className="document-label">Parent Answer PDF</p><h3>完整答案分開放，家長不用先備課</h3>
              <a className="pdf-preview" href={`${import.meta.env.BASE_URL}samples/sample-week-1-parent-answer.pdf`} target="_blank" rel="noreferrer" aria-label="另開視窗查看家長解答 PDF">
                <iframe title="Parent Answer PDF 教材預覽" src={`${import.meta.env.BASE_URL}samples/sample-week-1-parent-answer.pdf#page=1&view=FitH&toolbar=0`} /><span>放大查看真實解答 ↗</span>
              </a>
              <ul className="preview-notes"><li>完整答案、簡短解釋與觀察重點</li><li>不用會教英文，也知道孩子卡在哪裡</li></ul>
            </article></StaggerItem>
          </StaggerContainer>
        </section>

        <section className="public-section philosophy-section">
          <FadeInUp><p className="overline">為什麼選紙本？</p><h2>讓科技做它擅長的事，<br />讓孩子完成不能外包的思考。</h2></FadeInUp>
          <FadeInUp delay={0.1}><p>AI 負責記住進度、分析錯誤、調整難度；孩子面前只有紙、筆與題目。可以畫線、圈單字、留下錯誤痕跡，也少一個會跳出通知的螢幕。</p></FadeInUp>
        </section>

        <section className="public-section ai-section" id="method">
          <FadeInUp className="section-heading">
            <p className="overline">AI 是教材背後的機制，不是替孩子作答的人</p>
            <h2>先自己讀、自己答；<br />真的不懂，再請 AI 解釋為什麼。</h2>
            <p>每週學習仍從孩子的閱讀與作答開始。AI 可以在卡住時當解釋與延伸練習工具，但不是完成作業的捷徑。</p>
          </FadeInUp>
          <StaggerContainer className="learning-sequence" staggerDelay={0.08}>
            <StaggerItem tag="li"><span>01</span>先完整讀過文章</StaggerItem><StaggerItem tag="li"><span>02</span>圈出不懂的字句</StaggerItem><StaggerItem tag="li"><span>03</span>自己完成作答</StaggerItem><StaggerItem tag="li"><span>04</span>對答案、找出錯因</StaggerItem><StaggerItem tag="li"><span>05</span>需要時請 AI 解釋，再做一題</StaggerItem>
          </StaggerContainer>
          <FadeInUp delay={0.1} className="why-not-gpt" id="chatgpt-difference">
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
          <FadeInUp><p className="overline">家長每週要做什麼？</p><h2>列印、觀察、點幾下回饋。<br />不用自己當英文老師。</h2><p>看看難度是否合適、完成了多少、哪一區反覆卡住。簡短回饋就能幫助下一週調整；家長不必找文章、出題、做答案或記住上週錯了什麼。</p></FadeInUp>
          <a className="button mid-page-cta" href="#login">免費取得孩子的第一週教材</a>
        </section>

        <FadeInUp><FounderSummary /></FadeInUp>
        <FadeInUp><PricingSection /></FadeInUp>

        <section className="public-section faq" id="faq">
          <FadeInUp className="section-heading"><p className="overline">FAQ</p><h2>決定之前，你可能還想確認。</h2></FadeInUp>
          <StaggerContainer staggerDelay={0.06}>
            <StaggerItem><details><summary>這適合幾年級的孩子？</summary><p>目前主要為國小高年級到國中生設計，長期方向是國中英文與會考所需能力，不是高中英文產品。難度不按年級死切，而會依實際程度、作答表現與回饋調整。</p></details></StaggerItem>
            <StaggerItem><details><summary>第一週怎麼判斷孩子程度？</summary><p>會先參考年級、課本版本、學校進度、已知強弱項與家長描述。第一週同時是校準教材；收到使用回饋後，下一週可以做更明顯的難度調整。</p></details></StaggerItem>
            <StaggerItem><details><summary>一定要讓孩子使用 AI 嗎？</summary><p>不用。AI 使用是選擇性的；核心仍是孩子先閱讀、作答、對答案與找錯因。只有需要更多解釋或類題時才使用外部 AI 工具。</p></details></StaggerItem>
            <StaggerItem><details><summary>每個孩子都要各自付費嗎？</summary><p>是。每位孩子有獨立的程度、學習記憶、每週教材與訂閱，因此以每位孩子每月計費。</p></details></StaggerItem>
            <StaggerItem><details><summary>100 位額滿後會怎麼樣？</summary><p>新孩子會先進入候補，既有家庭照常收到教材。第一階段上限是真實的服務容量，不會用隨機數字或假倒數製造急迫感。</p></details></StaggerItem>
          </StaggerContainer>
        </section>

        <section className="public-section login-section" id="login">
          <FadeInUp><p className="overline">免費取得第一週教材</p><h2>先讓教材認識你的孩子。</h2><p>從家長 Email 登入，再填寫孩子目前的程度、學校進度與興趣。第一週會依這些資料製作，也作為後續調整的起點。</p><ul className="login-expectations"><li>建立家長帳號</li><li>填寫一位孩子的學習狀況</li><li>等待第一週個人化教材完成</li></ul></FadeInUp>
          <FadeInUp delay={0.15}><AuthPanel /></FadeInUp>
        </section>
      </PageTransition>
    </AppShell>
  )
}
