import { useEffect, useState } from 'react'
import { AuthPanel } from '../components/auth/AuthPanel'
import { AppShell } from '../components/layout/AppShell'
import { PublicFooter } from '../components/layout/PublicFooter'
import { PublicHeader } from '../components/layout/PublicHeader'
import { FounderSummary } from '../components/public/FounderSummary'
import { PricingSection } from '../components/public/PricingSection'
import { CoreBrainsSection } from '../components/public/CoreBrainsSection'
import { FadeInUp } from '../components/motion/FadeInUp'
import { PageTransition } from '../components/motion/PageTransition'
import { getEnrollmentCta, useEnrollmentState, type EnrollmentState } from '../lib/enrollment'
import { trackLandingView, trackSampleClick, trackFreeTrialClick } from '../lib/analytics'
import '../landing-evolution.css'
import '../styles/landing-details.css'

const abilityBenefits = [
  ['願意開始讀', '先用孩子有興趣、也有內容的題材降低抗拒，再把注意力帶進真正的英文閱讀。'],
  ['練得到能力', '單字、文法、閱讀理解與推理，都以國中英文與會考能力為長期方向。'],
  ['家長不用備課', '每週直接拿到學生教材與家長解答，不必自己找文章、出題或判斷難度。'],
] as const

const evolutionPillars = [
  ['01', '孩子越用，教材越懂他', '程度、學校進度、學過的內容、常錯的地方與家長回饋會持續累積，下一週接著孩子真正的位置往前。'],
  ['02', '教材系統自己也會持續升級', '題型、課程對齊、錯誤診斷與教材設計能力會持續改善，後續教材直接承接這些改善。'],
  ['03', 'AI 進步，教材也跟著進步', '我們持續把更適合教育的模型與方法接進系統；家長不用研究模型版本。'],
] as const

const usageModes = [
  ['自己完成', '孩子自己學', 'Student PDF 直接給孩子，照著閱讀、提示與練習一步一步完成。'],
  ['一起使用', '家長陪著學', '搭配 Parent Answer PDF，不必先備課；有時間時一起讀、訂正、聊錯在哪裡。'],
  ['交給老師', '搭配家教／老師使用', '直接當作每週教學內容、補充教材或回家作業，老師不用從零準備一整套。'],
] as const

export const faqItems = [
  ['這適合幾年級的孩子？', '目前主要為國小高年級到國中生設計，長期方向是國中英文與會考所需能力，不是高中英文產品。難度不按年級死切，而會依實際程度、作答表現與回饋調整。'],
  ['第一週怎麼判斷孩子程度？', '會先參考年級、課本版本、學校進度、已知強弱項與家長描述。第一週同時是校準教材；收到使用回饋後，下一週可以做更明顯的難度調整。'],
  ['多久可以拿到第一份教材？', '名額開放時，完成孩子資料後會立即開始製作第一份專屬教材；完成後直接開放下載。若目前額滿，會先進入候補且不收費，有名額時再通知你。之後每週依固定節奏提供新的個人化教材。'],
  ['一定要讓孩子自己學嗎？', '不用。孩子可以自己完成，也可以由家長陪讀，或把 Student PDF 與 Parent Answer PDF 交給家教、老師當作每週教學內容與回家練習。教材準備好，怎麼使用由家庭決定。'],
  ['教材之後也會持續變好嗎？', '會。除了孩子自己的學習記憶會持續累積，紙屬英文也會持續改善教材架構、題型、課程對齊與使用的 AI 能力。這些系統升級會直接反映在之後產生的教材，不需要家長另外設定。'],
  ['可以直接把紙本教材寄到家嗎？', '目前教材以 PDF 提供，家長可以直接下載列印。我們目前專注在每週教材內容的個人化調整，暫不提供實體郵寄服務。'],
  ['一定要讓孩子使用 AI 嗎？', '不用。AI 使用是選擇性的；核心仍是孩子先閱讀、作答、對答案與找錯因。只有需要更多解釋或類題時才使用外部 AI 工具。'],
  ['目前需要付費嗎？', '紙屬英文 Beta 期間，目前每週專屬教材為 NT$0，免填信用卡、免綁卡。Beta 階段以歷史錄取 100 位學員為目前邊界；之後恢復標準方案（月繳 NT$499 或年繳 NT$4,999），不會因為你填了孩子資料就自動訂閱或扣款。'],
  ['創始 30 的 NT$349 是什麼？', '這是為首批支持者提供的終身優惠（限額前 30 個月繳訂閱）。Beta 期間目前每週教材雖為 NT$0，但若希望在 30 席額滿前鎖定未來的 NT$349/月優惠，可自願提前訂閱（會立即開始計費）。只要同一月繳訂閱持續有效，NT$349／月就會永久保留。年繳不適用創始價格。'],
  ['100 位是什麼意思？', '100 位是目前服務容量與 Beta 階段的邊界，不是倒數促銷。服務達容量時，新加入者會先進入候補；Beta 免費階段結束後，後續每週服務依當時方案繼續，已完成與正在準備中的教材不受影響。'],
] as const

export function LandingPage({ enrollment: propEnrollment }: { enrollment?: EnrollmentState | null } = {}) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  const { state: hookEnrollment } = useEnrollmentState(propEnrollment)
  const enrollment = propEnrollment !== undefined ? propEnrollment : hookEnrollment
  const cta = getEnrollmentCta(enrollment)
  const foundingRemaining = enrollment ? Math.max(enrollment.foundingLimit - enrollment.foundingCount, 0) : null
  const capacityOpen = Boolean(enrollment && enrollment.status === 'open' && enrollment.remaining > 0)
  const foundingAvailable = foundingRemaining !== null && foundingRemaining > 0
  const isFreePilot = Boolean(enrollment?.freePilotActive)
  const heroNote = enrollment === null
    ? '正在確認目前名額與方案…'
    : isFreePilot
      ? 'Beta 期間目前每週專屬教材 NT$0。免填信用卡、免綁卡；100 位是目前服務容量與 Beta 階段邊界，不是倒數促銷。'
      : cta.isWaitlist
        ? (foundingAvailable ? '目前服務名額已滿，候補不會先收費；創始 NT$349/月優惠目前仍有名額。' : '目前服務名額已滿；候補不會先收費。')
        : foundingAvailable
          ? null
          : '第一週免費；之後可選月繳 NT$499 或年繳 NT$4,999。'

  useEffect(() => {
    trackLandingView()
    const handleHash = () => {
      if (typeof window !== 'undefined' && window.location.hash === '#login') {
        window.requestAnimationFrame(() => {
          const loginEl = document.getElementById('login')
          loginEl?.scrollIntoView({ block: 'start' })
          loginEl?.querySelector('input')?.focus()
        })
      }
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  return (
    <AppShell className="landing-page" header={<PublicHeader />}>
      <PageTransition>
        <section className="landing-hero">
          <FadeInUp duration={0.4} className="hero-copy">
            <p className="eyebrow">🧪 紙屬英文 Beta · 給國小高年級到國中生</p>
            <h1 className="hero-title">
              <span>每週一份，</span><span><em>照孩子現在的狀況</em></span><span>重新做的英文教材。</span>
            </h1>
            <p className="lede"><strong>從孩子真的有興趣的內容開始，但一路對齊學校進度、國中英文與會考能力。</strong>每週的程度、錯題與回饋會接到下一週，不是每次重新抽一篇文章。</p>
            <ul className="hero-benefits" aria-label="紙屬英文重點">
              <li>每週 Student PDF + Parent Answer PDF</li>
              <li>孩子用紙筆閱讀、作答與思考</li>
              <li>家長不用找教材、備課或出題</li>
            </ul>

            {isFreePilot ? (
              <div className="hero-beta-badge" aria-label="紙屬英文 Beta 免費說明">
                <span className="hero-beta-kicker">🧪 紙屬英文 Beta</span>
                <div className="hero-beta-price"><strong>NT$0</strong><span>目前每週專屬教材</span></div>
                <p className="hero-beta-meta">免填信用卡・免綁卡。每週完成孩子作答回饋後，系統會繼續準備下一週。</p>
                <span className="hero-beta-capacity">Beta 目前以 100 位孩子作為服務容量與階段邊界</span>
              </div>
            ) : foundingAvailable ? (
              <div className="hero-founding-badge" aria-label="創始優惠說明">
                <div className="hero-founding-badge-main">
                  <span className="hero-founding-tag">創始 30 名限定</span>
                  <strong className="hero-founding-price">
                    {capacityOpen ? '月繳 NT$349，持續訂閱期間價格固定不變' : '月繳 NT$349（目前仍有名額）'}
                  </strong>
                </div>
                <span className="hero-founding-sub">
                  {capacityOpen
                    ? '標準價 NT$499/月 · 第一週免費'
                    : '目前服務名額已滿候補中 · 開放名額後即可選擇訂閱鎖定 NT$349/月'}
                </span>
              </div>
            ) : null}

            <div className="hero-actions">
              <a className="button hero-cta" href={cta.href} onClick={() => trackFreeTrialClick('hero')}>{cta.label}</a>
              <a className="text-link" href="#samples" onClick={() => trackSampleClick('hero_samples_link')}>先看真實教材 ↓</a>
            </div>
            {heroNote && <p className="hero-note">{heroNote}</p>}
            {capacityOpen && <p className="hero-delivery-note">完成孩子資料後立即開始製作；第一週完成後直接開放下載。</p>}
          </FadeInUp>

          <FadeInUp delay={0.12} duration={0.4} className="hero-editorial" aria-label="每週教材內容示意">
            <span className="edition-mark">THIS WEEK · FOR ONE CHILD</span>
            <p>不是買一份固定教材。</p>
            <strong><span>孩子這週的狀況，</span><span>會真的改變</span><span>下週拿到的內容。</span></strong>
            <div className="paper-rule" />
            <small>技術留在背後，孩子面前還是紙、筆、閱讀與思考。</small>
          </FadeInUp>
        </section>

        <nav className="landing-section-nav" aria-label="首頁快速導覽">
          <a href="#samples">先看教材</a>
          <a href="#onboarding">免費開始</a>
          <a href="#personalization">怎麼個人化</a>
          <a href="#usage-modes">怎麼使用</a>
          <a href="#pricing">Beta / 價格</a>
        </nav>

        <section className="public-section deliverables-section early-sample-section" id="samples">
          <div className="section-heading early-sample-intro">
            <p className="overline">不用先相信我們，先看教材</p>
            <h2>這就是孩子每週真的會拿到的兩份 PDF。</h2>
            <p>Student PDF 給孩子直接做；Parent Answer PDF 分開放完整解答、理由與觀察重點。下面不是 mockup，是系統實際產出的第 3 週教材。</p>
            <div className="early-sample-proof" aria-label="範例可信度說明"><span>真實產出</span><span>去識別化</span><span>可直接打開 PDF</span></div>
          </div>

          <div className="sample-personalization-explainer">
            <div className="sample-context-card">
              <div className="sample-context-header">
                <span className="sample-context-badge">真實第 3 週範例</span>
                <h3 className="sample-context-title">這不是為廣告另外做的展示教材</h3>
              </div>
              <p className="sample-context-meta"><strong>範例學生</strong>：國一 ｜ 第 3 週 ｜ 預計 94 分鐘 ｜ 目標：<strong>閱讀理解、證據整合與位置表達</strong></p>
              <p className="sample-context-narrative">同一名內部測試學生連續使用到第 3 週後，系統實際產出的教材。公開版不公開學生身分、原始回饋或內部生成資料。</p>
              <div className="sample-flow-strip" aria-label="個人化教材生成流程">
                <div className="sample-flow-node"><span className="node-label">孩子的興趣</span><div className="node-tags"><span className="tag-pill tag-accent">遊戲</span><span className="tag-pill tag-accent">AI</span><span className="tag-pill tag-accent">音樂科技</span></div></div>
                <span className="flow-plus" aria-hidden="true">＋</span>
                <div className="sample-flow-node"><span className="node-label">目前程度</span><div className="node-tags"><span className="tag-pill">國一</span><span className="tag-pill">第 3 週</span></div></div>
                <span className="flow-arrow" aria-hidden="true">→</span>
                <div className="sample-flow-node node-output"><span className="node-label">本週教材</span><strong className="output-title">How Does a Game Place Sound Around You?</strong><span className="output-subtitle">spatial audio 閱讀＋at/on/in＋distance/direction/obstruction 推論</span></div>
              </div>
            </div>
          </div>

          <div className="document-pair pdf-preview-grid">
            <article className="pdf-preview-card">
              <p className="document-label">Student PDF</p>
              <h3>答案不會先出現，留給孩子真正思考</h3>
              <a className="pdf-preview" href="/samples/sample-student.pdf" target="_blank" rel="noreferrer" aria-label="另開視窗查看學生教材 PDF" onClick={() => trackSampleClick('student_pdf')}>
                <img
                  src="/samples/sample-student-preview.png"
                  alt="Student PDF 學生教材第 1 頁預覽"
                  width={595}
                  height={842}
                  loading="lazy"
                />
                <span>放大查看真實教材 ↗</span>
              </a>
            </article>
            <article className="pdf-preview-card">
              <p className="document-label">Parent Answer PDF</p>
              <h3>完整答案分開放，家長不用先備課</h3>
              <a className="pdf-preview" href="/samples/sample-parent-answer.pdf" target="_blank" rel="noreferrer" aria-label="另開視窗查看家長解答 PDF" onClick={() => trackSampleClick('parent_pdf')}>
                <img
                  src="/samples/sample-parent-answer-preview.png"
                  alt="Parent Answer PDF 家長解答第 1 頁預覽"
                  width={595}
                  height={842}
                  loading="lazy"
                />
                <span>放大查看真實解答 ↗</span>
              </a>
            </article>
          </div>
        </section>

        <section className="public-section onboarding-login-section" aria-labelledby="onboarding-section-title">
          <div className="section-heading">
            <p className="overline">{cta.isWaitlist ? '候補登記' : isFreePilot ? '🧪 Beta 目前 NT$0' : '開始使用或登入'}</p>
            <h2 id="onboarding-section-title">{cta.isWaitlist ? '目前名額已滿，先登記候補。' : '看完範例，就可以直接開始。'}</h2>
            <p>{cta.isWaitlist ? '留下資料即可，不會先收費。名額開放時我們會再寄 Email 通知。' : enrollment === null ? '目前正在確認服務名額…' : '第一次使用先填孩子資料；已有帳號的家長可直接輸入 Email 登入。'}</p>
            {capacityOpen && (
              <ul className="login-expectations">
                <li>填寫一位孩子的學習狀況</li>
                <li>完成 3 個步驟後留下 Email</li>
                <li>送出後立即開始製作，完成後直接開放下載</li>
              </ul>
            )}
          </div>
          <div>
            {cta.isWaitlist
              ? <a className="button" href={cta.href}>{cta.label}</a>
              : <AuthPanel isPublicLanding />}
          </div>
        </section>

        <section className="outcome-strip" aria-label="孩子與家長得到的價值">
          {abilityBenefits.map(([title, description], index) => (
            <article key={title}><span>0{index + 1}</span><h2>{title}</h2><p>{description}</p></article>
          ))}
        </section>

        <section className="public-section week-story" id="personalization">
          <div className="section-heading">
            <p className="overline">這週的狀況，會改變下週</p>
            <h2>個人化不是換個故事主題。<br />是孩子下一步練什麼，真的會變。</h2>
            <p>家長只要回報難度、完成度與卡住的地方，系統就把這些訊號放進下一週的教材設計。</p>
          </div>
          <div className="week-flow">
            <div className="week-sheet"><span>這週觀察</span><ul><li>閱讀明顯太簡單</li><li>do / does 再次答錯</li><li>學校開始現在進行式</li><li>最近開始喜歡籃球</li></ul></div>
            <div className="flow-line" aria-label="因此產生下一週">下一週真的跟著改 <b>→</b></div>
            <div className="week-sheet next-week"><span>下週調整</span><ul><li>閱讀難度提高一級</li><li>安排 do / does 間隔複習</li><li>銜接現在進行式</li><li>用籃球情境承載適合程度的閱讀</li></ul></div>
          </div>
          <div className="inline-objection">
            <p className="overline">不只是換一個有趣主題</p>
            <h3>興趣是入口，孩子也真的會讀到新東西。</h3>
            <p>文章本身會帶進適合程度的真實知識與可查證內容。遇到科技、AI、運動等快速變動的題材，也會在適合時納入近期發展；英文能力仍是主線。</p>
          </div>
        </section>

        <section className="public-section usage-modes-section" id="usage-modes">
          <div className="usage-heading">
            <p className="overline">一套教材，三種都能用</p>
            <h2>怎麼教，由你決定；每週要教什麼，我們幫你準備好。</h2>
          </div>
          <div className="usage-grid">
            {usageModes.map(([label, title, description]) => (
              <article className="usage-card" key={title}><span>{label}</span><h3>{title}</h3><p>{description}</p></article>
            ))}
          </div>
        </section>

        <details className="public-section landing-more-details">
          <summary>想知道為什麼是紙本、AI 怎麼用？</summary>
          <div className="landing-details-body">
            <section className="philosophy-section philosophy-card">
              <div className="philosophy-copy">
                <p className="overline">為什麼選紙本？</p>
                <h2>讓科技做它擅長的事，<br className="heading-break" />讓孩子完成不能外包的思考。</h2>
              </div>
              <div className="philosophy-detail">
                <p>AI 負責記住進度、分析錯誤、調整難度；孩子面前只有紙、筆與題目。可以畫線、圈單字、留下錯誤痕跡，也少一個會跳出通知的螢幕。</p>
              </div>
            </section>

            <section className="ai-section" id="method">
              <div className="ai-heading">
                <p className="overline">AI 是教材背後的機制，不是替孩子作答的人</p>
                <h2>先自己讀、自己答；<br className="heading-break" />真的不懂，再請 AI 解釋為什麼。</h2>
                <p>每週學習仍從孩子的閱讀與作答開始。AI 可以在卡住時當解釋與延伸練習工具，但不是完成作業的捷徑。</p>
              </div>

              <ol className="learning-sequence" aria-label="紙屬英文五步驟自主學習法">
                <li><span>01</span><strong>先完整讀過文章</strong></li>
                <li><span>02</span><strong>圈出不懂的字句</strong></li>
                <li><span>03</span><strong>自己完成作答</strong></li>
                <li><span>04</span><strong>對答案、找出錯因</strong></li>
                <li><span>05</span><strong>需要時請 AI 解釋，再做一題</strong></li>
              </ol>

              <div className="why-not-gpt" id="chatgpt-difference">
                <div className="why-not-gpt-header">
                  <p className="overline">常見疑問</p>
                  <h3>那直接用 ChatGPT 不就好了？</h3>
                  <p className="why-not-gpt-subtitle">ChatGPT 本身很強；差別不是它會不會，而是誰把這些能力變成一套持續運作的教材系統。</p>
                </div>
                <div className="comparison-compact">
                  <div className="comparison-col">
                    <div className="comparison-badge">通用對話 AI</div>
                    <h4>直接使用 ChatGPT</h4>
                    <p>可以搜尋網路、解釋英文、產生文章與題目；但通常仍要自己交代孩子程度、進度、錯誤、來源與難度，並在每次使用時維持這些教育規則。關掉視窗後，學習記憶就斷了。</p>
                  </div>
                  <div className="comparison-col highlighted">
                    <div className="comparison-badge accent">專屬教材系統</div>
                    <h4>紙屬英文</h4>
                    <p>把孩子的長期學習記憶、全網知識搜尋與可靠資訊篩選、會考命題大腦和每週品質檢查接成固定流程，持續每週交付可直接列印的完整教材。</p>
                  </div>
                </div>
                <p className="comparison-conclusion">差別不是我們用了另一個 AI，而是把 AI 變成一套專門替孩子持續做教材的系統。</p>
              </div>

              <div className="parent-role">
                <p className="overline">家長每週要做什麼？</p>
                <h2>列印、觀察、點幾下回饋。<br className="heading-break" />不用自己當英文老師。</h2>
                <p>看看難度是否合適、完成了多少、哪一區反覆卡住。簡短回饋就能幫助下一週調整；家長不必找文章、出題、做答案或記住上週錯了什麼。</p>
              </div>
            </section>
          </div>
        </details>

        <details className="public-section landing-more-details">
          <summary>想了解這套系統怎麼越用越準、越做越好？</summary>
          <div className="landing-details-body">
            <section className="system-evolution-section" id="system-evolution">
              <div className="system-evolution-heading">
                <p className="overline">訂閱的是一個會變好的系統</p>
                <h2>你訂閱的不是一份教材，而是一套會陪孩子一起進步的教材系統。</h2>
              </div>
              <div className="evolution-grid">
                {evolutionPillars.map(([step, title, description]) => (
                  <article className="evolution-card" key={step}><span className="evolution-step">{step}</span><h3>{title}</h3><p>{description}</p></article>
                ))}
              </div>
            </section>
            <CoreBrainsSection />
          </div>
        </details>

        <FounderSummary />
        <PricingSection enrollment={enrollment} />

        <section className="public-section faq" id="faq">
          <div className="section-heading"><p className="overline">FAQ</p><h2>決定之前，你可能還想確認。</h2></div>
          <div>
            {faqItems.map(([question, answer], index) => {
              const open = openFaqIndex === index
              return (
                <article className="faq-item" key={question}>
                  <button type="button" className="faq-trigger" aria-expanded={open} aria-controls={`faq-answer-${index}`} onClick={() => setOpenFaqIndex(open ? null : index)}>
                    <span>{question}</span><span className="faq-icon" aria-hidden="true">{open ? '−' : '+'}</span>
                  </button>
                  {open && <div className="faq-answer" id={`faq-answer-${index}`}><p>{answer}</p></div>}
                </article>
              )
            })}
          </div>
        </section>

        <details className="public-section landing-more-details improvement-note">
          <summary>Beta 期間我們還在改善什麼？</summary>
          <div className="landing-details-body">
            <div className="improvement-note-inner">
              <p className="overline">持續改善，也保持透明</p>
              <h2>我們還在把它做得更好</h2>
              <div className="improvement-note-copy">
                <p>紙屬英文目前已能依孩子的程度、興趣與學習紀錄調整教材內容，但我們知道「個人化」不只是不斷換主題。</p>
                <p>我們正在持續改善不同週次之間的文本形式、題型組合與學習任務變化，讓長期使用不會逐漸形成固定套路。</p>
                <p>這些變化不會以隨機取代教學邏輯。孩子該學什麼、難度怎麼走、哪些內容需要複習，仍會由學習狀態與證據決定。</p>
              </div>
              <p className="improvement-note-commitment">
                <strong>我們會持續公開我們看見的限制，也持續把系統做得更好。不會因為你填了孩子資料就自動訂閱或扣款，也不會自動替你開啟付費訂閱。</strong>
              </p>
            </div>
          </div>
        </details>

        <PublicFooter />
      </PageTransition>
    </AppShell>
  )
}