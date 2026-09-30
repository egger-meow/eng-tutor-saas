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
import { DisclosureItem } from '../components/motion/Disclosure'
import { AnimatedDetails } from '../components/motion/AnimatedDetails'
import { PersonalizationStory } from '../components/public/PersonalizationStory'
import { AssessmentSellingSection } from '../components/public/AssessmentSellingSection'
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
  ['01', '孩子越用，教材越懂他', '起點程度、選用的程度診斷、學校進度、學過的內容與每週真實作答回饋會持續累積，系統以最新學習表現為優先依據往前推進。'],
  ['02', '教材系統自己也會持續升級', '題型、課程對齊、錯誤診斷與教材設計能力會持續改善，後續教材直接承接這些改善。'],
  ['03', 'AI 進步，教材也跟著進步', '我們持續把更適合教育的模型與方法接進系統；家長不用研究模型版本。'],
] as const

const usageModes = [
  ['自己完成', '孩子自己學', '用網頁閱讀、朗讀與輸入作答，草稿自動保存；也能下載空白 PDF 用紙筆完成。'],
  ['一起使用', '家長陪著學', '整份提交後一起看結果、回到文章找證據；家長可選填觀察，不必先備課。'],
  ['交給老師', '搭配家教／老師使用', '直接當作每週教學內容、補充教材或回家作業，老師不用從零準備一整套。'],
] as const

export const faqItems = [
  ['一定要列印嗎？', '不用。網頁是主要閱讀與作答介面，支援文字輸入與裝置朗讀；空白學生 PDF 保留給喜歡紙筆的家庭。寫句子目前是文字輸入，並非手寫筆跡。'],
  ['答案什麼時候出現？', '新教材需提交整份作答後才開放答案。可以部分完成，未答不算錯；開放題尚未評分。提交後作答鎖定，家長回饋選填，申請下一份是獨立動作，每服務月最多 4 份。'],
  ['這適合幾年級的孩子？', '目前主要為國小高年級到國中生設計，長期方向是國中英文與會考所需能力，不是高中英文產品。難度不按年級死切，而會依實際程度、作答表現與回饋調整。'],
  ['第一週怎麼判斷孩子程度？', '會先參考年級、課本版本與家長設定的起點程度。登入後，家長亦可自由選擇讓孩子做一段程度診斷（題數會依作答情況調整），讓系統直接掌握單字、文法與閱讀的具體能力輪廓；即使不進行診斷，第一週也會依年級基準出題，並在收到每週作答回饋後迅速微調難度。'],
  ['程度診斷一定要做嗎？', '不用，完全是選用的。如果不做診斷，系統會先依據年級與家長填寫的起點程度生成每週教材，並隨每週實際作答回饋逐步調整。若孩子願意做，自適應程度診斷（題數會依作答情況調整）能讓系統在第一時間掌握更具體的能力輪廓。'],
  ['多久可以重新做程度診斷？', '完成診斷後需間隔 90 天才能再次進行。這項設計是為了避免孩子產生頻繁測驗的壓力，同時給孩子足夠的時間透過每週教材與練習累積真實進步。在 90 天冷卻期間，系統會持續依據每週的作答回饋自動微調教材，不需要依賴頻繁重測。'],
  ['多久可以拿到第一份教材？', '名額開放時，完成孩子資料後會立即開始製作第一份專屬教材；完成後直接開放下載。若目前額滿，會先進入候補且不收費，有名額時再通知你。提交本份作答後，可選填家長回饋，再主動申請下一份；每服務月最多 4 份。'],
  ['一定要讓孩子自己學嗎？', '不用。孩子可以在網頁自行閱讀作答，也可以由家長陪讀，或下載空白學生教材交給老師作為練習。新教材整份提交後才開放解答。教材準備好，怎麼使用由家庭決定。'],
  ['教材之後也會持續變好嗎？', '會。除了孩子自己的學習記憶會持續累積，紙屬英文也會持續改善教材架構、題型、課程對齊與使用的 AI 能力。這些系統升級會直接反映在之後產生的教材，不需要家長另外設定。'],
  ['可以直接把紙本教材寄到家嗎？', '目前教材可線上閱讀與作答，也提供空白學生 PDF 下載列印。我們目前專注在每週教材內容的個人化調整，暫不提供實體郵寄服務。'],
  ['一定要讓孩子使用 AI 嗎？', '不用。AI 使用是選擇性的；核心仍是孩子先閱讀、作答、對答案與找錯因。只有需要更多解釋或類題時才使用外部 AI 工具。'],
  ['目前需要付費嗎？', '紙屬英文 Beta 期間，目前每週專屬教材為 NT$0，免填信用卡、免綁卡。Beta 階段以 100 位 14 天內活躍學習學員為目前邊界；首次達標後永久結束並恢復標準方案（月繳 NT$499 或年繳 NT$4,999），不會因為你填了孩子資料就自動訂閱或扣款。'],
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
          <FadeInUp duration={0.44} reveal="text" className="hero-copy">
            <p className="eyebrow">🧪 紙屬英文 Beta · 給國小高年級到國中生</p>
            <h1 className="hero-title">
              <span>每週一份，</span><span><em>只屬</em>於你孩子的</span><span>英文教材。</span>
            </h1>
            <p className="lede"><strong>從孩子真的有興趣的內容開始，但一路對齊學校進度、國中英文與會考能力。</strong>每週的程度、錯題與回饋會接到下一週，不是每次重新抽一篇文章。</p>
            <ul className="hero-benefits" aria-label="紙屬英文重點">
              <li>4 步驟約 2 分鐘基礎設定，免綁卡；登入後可隨時讓孩子做一段程度診斷，也可以直接開始學習</li>
              <li>線上閱讀、裝置朗讀與作答；整份提交後看答案</li>
              <li>也可下載空白 A4 學生教材，用紙筆學習</li>
            </ul>

            {isFreePilot ? (
              <div className="hero-beta-badge" aria-label="紙屬英文 Beta 免費說明">
                <span className="hero-beta-kicker">🧪 紙屬英文 Beta</span>
                <div className="hero-beta-price"><strong>NT$0</strong><span>目前每週專屬教材</span></div>
                <p className="hero-beta-meta">免填信用卡・免綁卡。提交作答後可選填家長回饋，再主動申請下一份；每服務月最多 4 份。</p>
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
              <a className="text-link" href="#samples" onClick={() => trackSampleClick('hero_samples_link')}>先試讀與作答 ↓</a>
            </div>
            {heroNote && <p className="hero-note">{heroNote}</p>}
            {capacityOpen && <p className="hero-delivery-note">完成孩子資料後立即開始製作；第一週完成後直接開放下載。</p>}
          </FadeInUp>

          <FadeInUp delay={0.14} duration={0.48} reveal="paper" className="hero-editorial" aria-label="每週教材內容示意">
            <span className="edition-mark">THIS WEEK · FOR ONE CHILD</span>
            <p>不是買一份固定教材。</p>
            <strong><span>孩子這週的狀況，</span><span>會真的改變</span><span>下週拿到的內容。</span></strong>
            <div className="paper-rule" />
            <small>線上閱讀與作答，依真實表現調整；紙筆列印也完整保留。</small>
          </FadeInUp>
        </section>

        <nav className="landing-section-nav" aria-label="首頁快速導覽">
          <a href="#samples">先看教材</a>
          <a href="#assessment">程度診斷</a>
          <a href="#onboarding">免費開始</a>
          <a href="#personalization">怎麼個人化</a>
          <a href="#usage-modes">怎麼使用</a>
          <a href="#pricing">Beta / 價格</a>
        </nav>

        <section className="public-section deliverables-section early-sample-section" id="samples">
          <div className="section-heading early-sample-intro">
            <p className="overline">不用先相信我們，先試教材</p>
            <h2>先線上讀、試著答，也能印下來學。</h2>
            <p>不用登入就能體驗選擇題、寫句子、裝置朗讀與提交結果。整份提交後才在畫面顯示參考答案；空白列印版不含作答與解答。</p>
            <div className="early-sample-proof" aria-label="範例說明"><span>公開合成範例</span><span>只存本機</span><span>不耗教材配額</span></div>
          </div>
          <div className="document-pair">
            <article className="sample-context-card">
              <p className="overline">Try the learning loop</p>
              <h3>Two Places, One Question</h3>
              <p>用屋頂花園的合成故事練習找證據、推論與 do / does。這份固定範例不是為你的孩子生成的個人化教材。</p>
              <a className="button" href="/sample" onClick={() => trackSampleClick('interactive_demo')}>試讀與作答範例</a>
            </article>
            <article className="sample-context-card">
              <p className="overline">Print when you prefer</p>
              <h3>同一份內容，空白 A4 學生教材</h3>
              <p>喜歡紙筆時下載列印，圈字、寫句子與做筆記。列印不會帶入這次試用的填答或參考答案。</p>
              <a className="button secondary" href="/samples/demo-student.pdf" target="_blank" rel="noreferrer" onClick={() => trackSampleClick('demo_student_pdf')}>開啟空白列印版</a>
            </article>
          </div>
        </section>

        <AssessmentSellingSection />

        <section className="public-section onboarding-login-section" aria-labelledby="onboarding-section-title">
          <div className="section-heading">
            <p className="overline">{cta.isWaitlist ? '候補登記' : isFreePilot ? '🧪 Beta 目前 NT$0' : '開始使用或登入'}</p>
            <h2 id="onboarding-section-title">{cta.isWaitlist ? '目前名額已滿，先登記候補。' : '看完範例，就可以直接開始。'}</h2>
            <p>{cta.isWaitlist ? '留下資料即可，不會先收費。名額開放時我們會再寄 Email 通知。' : enrollment === null ? '目前正在確認服務名額…' : '第一次使用先填孩子資料；已有帳號的家長可直接輸入 Email 登入。'}</p>
            {capacityOpen && (
              <ul className="login-expectations">
                <li>填寫一位孩子的學習狀況</li>
                <li>4 個步驟快速完成（程度 ➔ 興趣 ➔ 節奏 ➔ Email）</li>
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
            <p>已提交的客觀題表現與開放題作答會成為下一份設計的依據；未答不當成答錯，家長也可選填觀察。</p>
          </div>
          <PersonalizationStory />
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

        <AnimatedDetails summary="想知道為什麼是紙本、AI 怎麼用？">
          <div className="landing-details-body">
            <section className="philosophy-section philosophy-card">
              <div className="philosophy-copy">
                <p className="overline">為什麼選紙本？</p>
                <h2>讓科技做它擅長的事，<br className="heading-break" />讓孩子完成不能外包的思考。</h2>
              </div>
              <div className="philosophy-detail">
                <p>網頁提供閱讀、作答草稿與裝置朗讀；喜歡紙筆時可下載空白教材，畫線、圈單字、留下思考痕跡。AI 在幕後協助教材設計，孩子仍要自己讀、自己答。</p>
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
                    <p>可以幫忙解釋英文、找資料與設計練習。自行使用時，家長仍需要維護孩子的程度、學校進度、歷次作答與教材安排，並確認內容和答案是否適合。</p>
                  </div>
                  <div className="comparison-col highlighted">
                    <div className="comparison-badge accent">專屬教材系統</div>
                    <h4>紙屬英文</h4>
                    <p>把孩子的長期學習記憶、全網知識搜尋與可靠資訊篩選、會考命題大腦和每週品質檢查接成固定流程，交付可線上閱讀作答、也能列印的完整教材。</p>
                  </div>
                </div>
                <p className="comparison-conclusion">差別不是我們用了另一個 AI，而是把 AI 變成一套專門替孩子持續做教材的系統。</p>
              </div>

              <div className="parent-role">
                <p className="overline">家長每週要做什麼？</p>
                <h2>一起看看結果，有觀察再補充。<br className="heading-break" />不用自己當英文老師。</h2>
                <p>線上作答由系統保存，整份提交後可一起回顧。家長回饋是選填；準備好再申請下一份。紙本學習時，也可補充難度與卡住之處，不必自己找文章、出題或維護錯題紀錄。</p>
              </div>
            </section>
          </div>
        </AnimatedDetails>

        <AnimatedDetails summary="想了解這套系統怎麼越用越準、越做越好？">
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
        </AnimatedDetails>

        <FounderSummary />
        <PricingSection enrollment={enrollment} />

        <section className="public-section faq" id="faq">
          <div className="section-heading"><p className="overline">FAQ</p><h2>決定之前，你可能還想確認。</h2></div>
          <div>
            {faqItems.map(([question, answer], index) => (
              <DisclosureItem
                key={question}
                id={`faq-${index}`}
                title={question}
                open={openFaqIndex === index}
                onToggle={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                className="faq-item"
                triggerClassName="faq-trigger"
                panelClassName="faq-answer"
                panelId={`faq-answer-${index}`}
              >
                <p>{answer}</p>
              </DisclosureItem>
            ))}
          </div>
        </section>

        <AnimatedDetails className="improvement-note" summary="Beta 期間我們還在改善什麼？">
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
        </AnimatedDetails>

        <PublicFooter />
      </PageTransition>
    </AppShell>
  )
}