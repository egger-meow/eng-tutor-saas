import { AuthPanel } from '../components/auth/AuthPanel'
import { AppShell } from '../components/layout/AppShell'
import { PublicHeader } from '../components/layout/PublicHeader'
import { FounderSummary } from '../components/public/FounderSummary'
import { PricingSection } from '../components/public/PricingSection'

export function LandingPage() {
  return <AppShell className="landing-page" header={<PublicHeader />}>
    <section className="landing-hero"><div><p className="eyebrow">每週個人化紙本英文</p><h1>讓孩子回到紙上，真正讀、想、寫。</h1><p className="lede">依照程度、學校進度、興趣與每週回饋，準備可以直接列印的學生教材與家長解答。</p><a className="button hero-cta" href="#login">免費取得第一週教材</a></div><div className="paper-preview" aria-label="教材內容示意"><span>WEEK 01</span><h2>A Story Worth Reading</h2><p>自然閱讀 · 核心單字 · 文法提示 · 理解練習</p></div></section>
    <section className="public-section"><p className="overline">不是固定題庫</p><h2>孩子每週的狀態，會改變下一週的教材。</h2><div className="feature-grid"><article><h3>先建立學習資料</h3><p>程度、課本、進度、興趣與可用時間形成第一週起點。</p></article><article><h3>家長提供短回饋</h3><p>完成度、難度與卡住的地方，用來調整下一週。</p></article><article><h3>保留連續進度</h3><p>追蹤學過的單字、文法與反覆出現的錯誤，不每週重新開始。</p></article></div></section>
    <section className="public-section split-section"><div><p className="overline">一份給孩子</p><h2>Student PDF</h2><p>自然閱讀、單字、文法提示、理解題與作業，讓孩子能獨立完成。</p></div><div><p className="overline">一份給家長</p><h2>Parent Answer PDF</h2><p>答案、簡短說明與本週觀察重點，不需要家長先備課。</p></div></section>
    <section className="public-section statement-section"><h2>AI 在背後整理與調整；孩子面前仍然是一張紙、一支筆，和自己的思考。</h2><p>孩子先讀、先猜、先回答；需要解釋時再使用 AI。AI 是輔助工具，不是答案機器，也不是產品的主角。</p></section>
    <section className="public-section"><p className="overline">家長每週只做三件事</p><h2>列印、觀察、回饋。</h2><p>不需要教完整堂課，也不需要每天登入系統。回饋截止前沒有填寫也不會中斷交付；教材會沿著既有進度繼續。</p></section>
    <FounderSummary /><PricingSection />
    <section className="public-section faq"><h2>常見問題</h2><details><summary>為什麼不直接叫孩子用 ChatGPT？</summary><p>因為產品先設計學習順序、難度與連續記憶，並要求孩子先獨立思考；聊天工具本身不會自動建立這些邊界。</p></details><details><summary>為什麼不買一本講義？</summary><p>講義不會知道孩子本週完成多少、哪裡反覆犯錯，或學校目前教到哪裡。</p></details></section>
    <section className="public-section login-section" id="login"><div><p className="overline">開始第一週</p><h2>先用 Email 建立家長帳號</h2></div><AuthPanel /></section>
  </AppShell>
}
