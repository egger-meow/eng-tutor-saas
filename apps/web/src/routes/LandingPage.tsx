import { AuthPanel } from '../components/auth/AuthPanel'
import { AppShell } from '../components/layout/AppShell'
import { PublicHeader } from '../components/layout/PublicHeader'
import { FounderSummary } from '../components/public/FounderSummary'
import { PricingSection } from '../components/public/PricingSection'
import { FadeInUp } from '../components/motion/FadeInUp'
import { StaggerContainer, StaggerItem } from '../components/motion/StaggerContainer'
import { PageTransition } from '../components/motion/PageTransition'

const memorySignals = [
  ['程度', '真正讀得懂多少，而不只是年級'],
  ['學校進度', '課本版本、單元與最近開始的文法'],
  ['單字記憶', '學過、忘記、反覆答錯與正在熟悉的字'],
  ['文法與錯誤', '持續追蹤 do / does、時態等錯誤模式'],
  ['每週結果', '完成度，以及內容太簡單、適當或太難'],
  ['孩子近況', '家長回饋、目前興趣與剛改變的新興趣'],
] as const

export function LandingPage() {
  return (
    <AppShell className="landing-page" header={<PublicHeader />}>
      <PageTransition>
        <section className="landing-hero">
          <FadeInUp duration={0.4} className="hero-copy">
            <p className="eyebrow">每週個人化英文教材</p>
            <h1>
              每週一份，<em>只屬於你孩子</em>的英文教材。
            </h1>
            <p className="hero-audience">為國小高年級到國中階段設計，以國中英文能力與會考為長期目標。</p>
            <p className="lede">用孩子願意讀的內容，練出能帶進學校、段考與會考的單字、文法與閱讀能力。程度、學校進度、上週錯題與家長回饋，都會真正改變下一份教材。</p>
            <div className="hero-actions">
              <a className="button hero-cta" href="#login">
                免費產生第一週
              </a>
              <a className="text-link" href="#samples">
                直接看教材範例 ↓
              </a>
            </div>
            <p className="hero-note">前 30 位孩子第一週免費，不需先綁定付費。</p>
          </FadeInUp>

          <FadeInUp delay={0.15} duration={0.4} className="hero-editorial" aria-label="紙屬英文個人化概念">
            <span className="edition-mark">WEEKLY · 01</span>
            <p>參考書是為幾萬個孩子寫的。</p>
            <strong>
              紙屬英文，<br />
              是為你家這一個孩子寫的。
            </strong>
            <div className="paper-rule" />
            <small>閱讀內容與下一步練習，同時因孩子而變。</small>
          </FadeInUp>
        </section>

        <section className="public-section reference-section" id="personalization">
          <FadeInUp className="section-heading">
            <p className="overline">標準內容，與持續適應</p>
            <h2>
              參考書提供一條共同的路。<br />
              紙屬英文知道孩子現在走到哪裡。
            </h2>
          </FadeInUp>

          <StaggerContainer className="comparison-layout" staggerDelay={0.12}>
            <StaggerItem className="reference-book">
              <span>普通參考書</span>
              <strong>同一本內容</strong>
              <p>給幾萬個孩子</p>
              <ul>
                <li>不知道孩子已經會什麼</li>
                <li>看不見反覆答錯的地方</li>
                <li>無法因上週太簡單而重寫</li>
                <li>不會跟著學校與興趣變化</li>
              </ul>
            </StaggerItem>

            <div className="comparison-arrow" aria-hidden="true">
              ≠
            </div>

            <StaggerItem className="adaptive-book">
              <span>紙屬英文</span>
              <strong>每週重新判斷</strong>
              <p>只服務這一位孩子</p>
              <ul>
                <li>記住已學、未熟與反覆犯錯</li>
                <li>銜接學校正在教的內容</li>
                <li>依真實難度調整閱讀與練習</li>
                <li>讓新的興趣進入適合的題材</li>
              </ul>
            </StaggerItem>
          </StaggerContainer>

          <FadeInUp delay={0.1} className="editorial-quote">
            教材主題、難度與練習重點，都會跟著孩子每週的狀態調整。<br />
            <span>但個人化不只是換主題——孩子讀什麼，與孩子下一步需要練什麼，每週都會動態調整。</span>
          </FadeInUp>
        </section>

        <section className="public-section memory-section">
          <FadeInUp className="section-heading">
            <p className="overline">不是一次性的 Prompt</p>
            <h2>它會記得，一本參考書與一個空白聊天室記不住的事。</h2>
            <p>每週教材建立在孩子持續累積的學習記憶上，而不是每次重新猜測。</p>
          </FadeInUp>

          <StaggerContainer className="memory-ledger" staggerDelay={0.06}>
            {memorySignals.map(([title, body], index) => (
              <StaggerItem key={title} className="memory-item">
                <article>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        <section className="public-section week-story">
          <FadeInUp className="section-heading">
            <p className="overline">Week N → Week N+1</p>
            <h2>回饋不是問卷。它會進到下一週的教材裡。</h2>
          </FadeInUp>

          <FadeInUp delay={0.1} className="week-flow">
            <div className="week-sheet">
              <span>這週觀察</span>
              <ul>
                <li>閱讀明顯太簡單</li>
                <li>do / does 再次答錯</li>
                <li>學校開始現在進行式</li>
                <li>最近開始看新的動漫</li>
              </ul>
            </div>
            <div className="flow-line" aria-label="因此產生下一週">
              下一週真的跟著改 <b>→</b>
            </div>
            <div className="week-sheet next-week">
              <span>下週調整</span>
              <ul>
                <li>閱讀難度提高一級</li>
                <li>do / does 安排間隔複習</li>
                <li>銜接現在進行式的提示與題目</li>
                <li>以新興趣承載適合程度的閱讀</li>
              </ul>
            </div>
          </FadeInUp>
        </section>

        <section className="public-section deliverables-section" id="samples">
          <FadeInUp className="section-heading">
            <p className="overline">每週兩份 PDF</p>
            <h2>孩子能獨立做，家長不用先備課。</h2>
          </FadeInUp>

          <StaggerContainer className="document-pair pdf-preview-grid" staggerDelay={0.15}>
            <StaggerItem>
              <article className="pdf-preview-card">
                <p className="document-label">Student PDF</p>
                <h3>一份留給孩子思考的教材</h3>
                <a className="pdf-preview" href={`${import.meta.env.BASE_URL}samples/sample-week-1-student.pdf`} target="_blank" rel="noreferrer" aria-label="放大查看學生教材 PDF">
                  <iframe title="Student PDF 教材預覽" src={`${import.meta.env.BASE_URL}samples/sample-week-1-student.pdf#page=1&view=FitH&toolbar=0`} />
                  <span>點擊放大查看</span>
                </a>
                <ul className="preview-notes"><li>孩子直接閱讀、作答</li><li>自然閱讀、單字、文法與理解練習</li></ul>
              </article>
            </StaggerItem>
            <StaggerItem>
              <article className="pdf-preview-card">
                <p className="document-label">Parent Answer PDF</p>
                <h3>一份讓家長看懂重點的解答</h3>
                <a className="pdf-preview" href={`${import.meta.env.BASE_URL}samples/sample-week-1-parent-answer.pdf`} target="_blank" rel="noreferrer" aria-label="放大查看家長解答 PDF">
                  <iframe title="Parent Answer PDF 教材預覽" src={`${import.meta.env.BASE_URL}samples/sample-week-1-parent-answer.pdf#page=1&view=FitH&toolbar=0`} />
                  <span>點擊放大查看</span>
                </a>
                <ul className="preview-notes"><li>家長不需要備課，附完整答案與簡短引導</li><li>每週內容依孩子狀況重新生成</li></ul>
              </article>
            </StaggerItem>
          </StaggerContainer>
        </section>

        <section className="public-section philosophy-section">
          <FadeInUp>
            <p className="overline">Paper × Intelligence</p>
            <h2>
              AI 負責記憶、分析、調整。<br />
              孩子負責閱讀、寫字、思考。
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p>
              紙本不是拒絕科技，而是讓科技待在最有價值的位置。孩子不必再多看一個學習
              App；真正學習時，面前只有紙、筆，以及自己的推理。
            </p>
          </FadeInUp>
        </section>

        <section className="public-section ai-section" id="method">
          <FadeInUp className="section-heading">
            <p className="overline">學習方法</p>
            <h2>
              AI 在背後持續調整，<br />
              真正的閱讀與思考由孩子完成。
            </h2>
            <p>這不是請 AI 隨機生成一篇文章，而是一個每週依學習目標、實際表現與回饋重新設計的循環。</p>
          </FadeInUp>

          <StaggerContainer className="learning-sequence" staggerDelay={0.08}>
            <StaggerItem tag="li"><span>01</span>孩子的程度、興趣與回饋</StaggerItem>
            <StaggerItem tag="li"><span>02</span>AI 分析目前狀況</StaggerItem>
            <StaggerItem tag="li"><span>03</span>依國中英文目標設計教材</StaggerItem>
            <StaggerItem tag="li"><span>04</span>孩子閱讀、寫作與推理</StaggerItem>
            <StaggerItem tag="li"><span>05</span>每週回饋，再調整下一週</StaggerItem>
          </StaggerContainer>

          <FadeInUp delay={0.1} className="why-not-gpt" id="chatgpt-difference">
            <p className="overline">那為什麼不直接用 GPT？</p>
            <h3>因為聊天工具能回答當下；紙屬英文負責設計一段持續發生的學習。</h3>
            <p>
              一個新聊天室不知道孩子的課本進度、哪些字已經學過、同一個文法錯了幾週，也不會固定交付分級教材、把答案與學生卷分開，或在收到家長回饋後重排下週內容。紙屬英文把
              AI 放進有課程邊界、有學習記憶、有每週交付責任的完整系統裡。
            </p>
            <strong>GPT 是一個強大的工具；紙屬英文把工具變成真正跟得上孩子的學習流程。</strong>
          </FadeInUp>
        </section>

        <section className="public-section parent-role">
          <FadeInUp>
            <p className="overline">家長不必成為英文老師</p>
            <h2>每週只要列印、觀察、回饋。</h2>
            <p>
              看看難度是否合適、完成了多少、哪一區反覆卡住。幾個簡短選項就能提供有效訊號；即使這週來不及回饋，也不會中斷下一次交付。
            </p>
          </FadeInUp>
        </section>

        <FadeInUp>
          <FounderSummary />
        </FadeInUp>

        <FadeInUp>
          <PricingSection />
        </FadeInUp>

        <section className="public-section faq">
          <FadeInUp className="section-heading">
            <p className="overline">FAQ</p>
            <h2>開始之前，家長常問的事。</h2>
          </FadeInUp>

          <StaggerContainer staggerDelay={0.06}>
            <StaggerItem>
              <details>
                <summary>那我直接叫孩子用 ChatGPT 不就好了？</summary>
                <p>聊天工具擅長回答眼前的一個問題；紙屬英文持續記住孩子的程度、學習狀況與回饋，設計下一週真正適合他的內容。<br /><a href="#chatgpt-difference">看看兩者差在哪裡 ↑</a></p>
              </details>
            </StaggerItem>
            <StaggerItem>
              <details>
                <summary>一直讀孩子喜歡的主題，考試遇到其他文章怎麼辦？</summary>
                <p>興趣是學習的入口，不是能力的邊界。孩子在喜歡的題材裡建立的單字、文法直覺、閱讀速度、上下文理解與推理能力，都能轉移到科學、生活、人物與會考文章。興趣讓孩子願意學；系統確保他學到能帶走的英文能力。</p>
              </details>
            </StaggerItem>
            <StaggerItem>
              <details>
                <summary>這適合幾年級的孩子？</summary>
                <p>目前主要為國小高年級到國中生設計，目標是建立國中階段需要的英文能力，逐步銜接段考與會考；不是高中英文產品。難度不按年級死切，而會依單字量、閱讀能力、文法程度、作答表現與家長回饋調整。</p>
              </details>
            </StaggerItem>
            <StaggerItem>
              <details>
                <summary>這和一般參考書最根本的差別是什麼？</summary>
                <p>
                  參考書提供可靠的標準內容；紙屬英文則以孩子的程度、學校進度、錯誤、難度反應與回饋，持續改寫下一週。兩者不是誰取代誰，而是解決不同問題。
                </p>
              </details>
            </StaggerItem>
            <StaggerItem>
              <details>
                <summary>有興趣主題，就算個人化嗎？</summary>
                <p>
                  不只。興趣決定「用什麼內容吸引孩子讀」，學習記憶則決定「下一步真正需要練什麼」。兩者會同時影響教材。
                </p>
              </details>
            </StaggerItem>
            <StaggerItem>
              <details>
                <summary>一定要讓孩子使用 AI 嗎？</summary>
                <p>
                  不用。AI
                  是選擇性的解釋與練習工具。核心順序始終是孩子先作答、先發現問題，再在需要時請 AI 解釋。
                </p>
              </details>
            </StaggerItem>
            <StaggerItem>
              <details>
                <summary>100 位額滿後會怎麼樣？</summary>
                <p>
                  新孩子會先進入候補，既有家庭照常收到教材。我們不會用假倒數製造急迫感；第一階段只服務 100
                  位，是為了先把每週品質真正顧好。
                </p>
              </details>
            </StaggerItem>
          </StaggerContainer>
        </section>

        <section className="public-section login-section" id="login">
          <FadeInUp>
            <p className="overline">開始第一週</p>
            <h2>先讓教材認識你的孩子。</h2>
            <p>建立家長帳號後，填寫孩子目前的程度、學校進度與興趣。第一週同時也是校準的開始。</p>
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <AuthPanel />
          </FadeInUp>
        </section>
      </PageTransition>
    </AppShell>
  )
}
