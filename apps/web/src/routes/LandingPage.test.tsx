import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LandingPage, faqItems } from './LandingPage'
import { PricingSection } from '../components/public/PricingSection'
import { PublicFooter } from '../components/layout/PublicFooter'
import { PublicHeader } from '../components/layout/PublicHeader'
import { getEnrollmentCta } from '../lib/enrollment'

const confirmedOpenEnrollment = {
  status: 'open' as const,
  capacity: 100,
  activeCount: 1,
  remaining: 99,
  foundingLimit: 30,
  foundingCount: 0,
  waitingCount: 0,
  releasedCount: 0,
}

const freePilotEnrollment = {
  status: 'open' as const,
  capacity: 100,
  activeCount: 20,
  remaining: 80,
  foundingLimit: 30,
  foundingCount: 5,
  freePilotActive: true,
  freePilotAdmissions: 20,
  freePilotLimit: 100,
}

describe('Public Footer — Paddle Review Links', () => {
  it('links directly to pricing and all public legal policies', () => {
    const html = renderToStaticMarkup(<PublicFooter />)
    expect(html).toContain('href="/#pricing"')
    expect(html).toContain('href="/terms"')
    expect(html).toContain('href="/privacy"')
    expect(html).toContain('href="/refund"')
    expect(html).toContain('退款政策 / Refund Policy')
  })
})

describe('Landing Page — Trust-first information architecture', () => {
  it('shows the real material before the long personalization explanation', () => {
    const html = renderToStaticMarkup(<LandingPage enrollment={freePilotEnrollment} />)
    const sampleIndex = html.indexOf('id="samples"')
    const personalizationIndex = html.indexOf('id="personalization"')

    expect(html).toContain('landing-section-nav')
    expect(sampleIndex).toBeGreaterThan(-1)
    expect(personalizationIndex).toBeGreaterThan(sampleIndex)
    expect(html).toContain('不用先相信我們，先看教材')
  })

  it('presents the real Week 3 production sample with truthful de-identified claims', () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain('How Does a Game Place Sound Around You?')
    expect(html).toContain('真實第 3 週範例')
    expect(html).toContain('這不是為廣告另外做的展示教材')
    expect(html).toContain('國一 ｜ 第 3 週 ｜ 預計 94 分鐘')
    expect(html).toContain('不公開學生身分、原始回饋或內部生成資料')
    expect(html).toContain('samples/sample-student.pdf')
    expect(html).toContain('samples/sample-parent-answer.pdf')
    expect(html).not.toContain('developing')
  })

  it('keeps deeper AI and system detail available without forcing it into the primary reading path', () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain('<details')
    expect(html).toContain('想知道為什麼是紙本、AI 怎麼用？')
    expect(html).toContain('想了解這套系統怎麼越用越準、越做越好？')
    expect(html).toContain('你訂閱的不是一份教材，而是一套會陪孩子一起進步的教材系統。')
    expect(html).toContain('孩子越用，教材越懂他')
    expect(html).toContain('教材系統自己也會持續升級')
    expect(html).toContain('AI 進步，教材也跟著進步')
  })
})

describe('Landing Page — Beta trust hierarchy', () => {
  it('leads with Beta and NT$0 instead of scarcity copy when the free pilot is active', () => {
    const html = renderToStaticMarkup(<LandingPage enrollment={freePilotEnrollment} />)

    expect(html).toContain('🧪 紙屬英文 Beta')
    expect(html).toContain('hero-beta-badge')
    expect(html).toContain('NT$0')
    expect(html).toContain('目前每週專屬教材')
    expect(html).toContain('免填信用卡・免綁卡')
    expect(html).toContain('100 位是目前服務容量與 Beta 階段邊界，不是倒數促銷。')
    expect(html).toContain('立即免費開始（每週專屬教材 NT$0）')
    expect(html).not.toContain('前 100 位學員・全面免費')
    expect(html).not.toContain('🔥 前 100 位學員限定')
    expect(html).not.toContain('前 100 位每週免費')
  })

  it('makes clear that Beta does not silently turn profile creation into a paid subscription', () => {
    const html = renderToStaticMarkup(<LandingPage enrollment={freePilotEnrollment} />)
    expect(html).toContain('不會因為你填了孩子資料就自動訂閱或扣款')
    expect(html).toContain('不會自動替你開啟付費訂閱')
  })

  it('keeps Founding 30 as an explicitly optional paid choice during Beta', () => {
    const html = renderToStaticMarkup(<PricingSection enrollment={freePilotEnrollment} />)
    expect(html).toContain('創始 30・自願提前訂閱')
    expect(html).toContain('這個選項會立即開始計費')
    expect(html).toContain('繼續使用目前 Beta 免費方案即可')
  })
})

describe('Landing Page — First Delivery Timing Disclosure', () => {
  it('states immediate production start without promising an instant finished PDF', () => {
    const page = renderToStaticMarkup(<LandingPage enrollment={confirmedOpenEnrollment} />)
    const pricing = renderToStaticMarkup(<PricingSection enrollment={confirmedOpenEnrollment} />)
    expect(page).toContain('完成孩子資料後立即開始製作；第一週完成後直接開放下載。')
    expect(pricing).toContain('完成孩子資料後會立即開始製作第一份專屬教材；完成後直接開放下載。')
    expect(page).not.toContain('第一份專屬教材預計隔天開放下載')
    expect(pricing).not.toContain('第一份專屬教材預計隔天開放下載')
  })

  it('includes a capacity-safe first material timing answer in FAQ', () => {
    const deliveryFaq = faqItems.find(([q]) => q === '多久可以拿到第一份教材？')
    expect(deliveryFaq).toBeDefined()
    expect(deliveryFaq?.[1]).toBe('名額開放時，完成孩子資料後會立即開始製作第一份專屬教材；完成後直接開放下載。若目前額滿，會先進入候補且不收費，有名額時再通知你。之後每週依固定節奏提供新的個人化教材。')
  })

  it('does not make forbidden instantaneous-finish or fixed-hour promises', () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).not.toContain('立即下載第一份')
    expect(html).not.toContain('馬上拿到')
    expect(html).not.toContain('立刻生成')
    expect(html).not.toContain('24 小時內交付')
    expect(html).not.toContain('24小時內交付')
    expect(html).not.toContain('ChatGPT Scheduled')
    expect(html).not.toContain('finisher')
    expect(html).not.toContain('generation_jobs')
  })
})

describe('Landing Page — Product explanation', () => {
  it('makes clear that interest leads into worthwhile content', () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain('興趣是入口，孩子也真的會讀到新東西。')
    expect(html).toContain('真實知識與可查證內容')
    expect(html).toContain('科技、AI、運動等快速變動的題材')
    expect(html).toContain('適合時納入近期發展')
    expect(html).not.toContain('temporalMode')
    expect(html).not.toContain('Source -&gt; Fact')
  })

  it('renders all three flexible usage modes', () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain('怎麼教，由你決定；每週要教什麼，我們幫你準備好。')
    expect(html).toContain('孩子自己學')
    expect(html).toContain('家長陪著學')
    expect(html).toContain('搭配家教／老師使用')
  })

  it('keeps the print-only delivery expectation', () => {
    const faq = faqItems.find(([q]) => q === '可以直接把紙本教材寄到家嗎？')
    expect(faq?.[1]).toContain('目前教材以 PDF 提供')
    expect(faq?.[1]).toContain('暫不提供實體郵寄服務')
  })
})

describe('Founder 30 and Service Capacity CTA Rules', () => {
  it('keeps the free Week 1 CTA when normal capacity is open', () => {
    expect(getEnrollmentCta({ ...confirmedOpenEnrollment, foundingCount: 5 }).label).toBe('免費取得第一週教材')
    expect(getEnrollmentCta({ ...confirmedOpenEnrollment, activeCount: 50, remaining: 50, foundingCount: 30 }).label).toBe('免費取得第一週教材')
  })

  it('uses the NT$0 CTA during Beta', () => {
    const cta = getEnrollmentCta(freePilotEnrollment)
    expect(cta.label).toBe('立即免費開始（每週專屬教材 NT$0）')
    expect(cta.isWaitlist).toBe(false)
    expect(cta.href).toBe('#onboarding')
  })

  it('switches to waitlist only when total capacity is full', () => {
    const cta = getEnrollmentCta({
      status: 'waitlist',
      capacity: 100,
      activeCount: 100,
      remaining: 0,
      foundingLimit: 30,
      foundingCount: 30,
    })
    expect(cta.label).toBe('登記候補')
    expect(cta.isWaitlist).toBe(true)
    expect(cta.href).toBe('/waitlist')
  })

  it('keeps normal Founding 30 messaging after Beta', () => {
    const html = renderToStaticMarkup(<LandingPage enrollment={confirmedOpenEnrollment} />)
    expect(html).toContain('hero-founding-badge')
    expect(html).toContain('創始 30 名限定')
    expect(html).toContain('月繳 NT$349，持續訂閱期間價格固定不變')
    expect(html).toContain('標準價 NT$499/月 · 第一週免費')
  })
})

describe('Landing Page — Onboarding & Direct Login', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each(['/', '/dashboard', '/children/new', '/unknown-page'])(
    'renders child-first onboarding and direct login when LandingPage is shown at %s',
    (pathname) => {
      vi.stubGlobal('window', { location: { pathname }, addEventListener: vi.fn(), removeEventListener: vi.fn() })
      const html = renderToStaticMarkup(<LandingPage enrollment={confirmedOpenEnrollment} />)
      const onboardingIndex = html.indexOf('id="onboarding"')
      const loginIndex = html.indexOf('id="login"')
      expect(html).toContain('landing-auth-grid')
      expect(onboardingIndex).toBeGreaterThan(-1)
      expect(loginIndex).toBeGreaterThan(onboardingIndex)
      expect(html.slice(onboardingIndex, loginIndex)).toContain('孩子怎麼稱呼？')
      expect(html.slice(onboardingIndex, loginIndex)).not.toContain('type="email"')
      expect(html.slice(loginIndex)).toContain('id="login-email"')
    },
  )

  it('targets navbar login directly to #login and primary CTA to #onboarding', () => {
    const headerHtml = renderToStaticMarkup(<PublicHeader />)
    expect(headerHtml).toContain('href="/#login"')
    expect(headerHtml).toContain('已有帳號？登入')
    expect(headerHtml).toContain('href="/#onboarding"')
  })

  it('keeps child-first instructions and avoids autofocus jumps', () => {
    const html = renderToStaticMarkup(<LandingPage enrollment={confirmedOpenEnrollment} />)
    expect(html).toContain('填寫一位孩子的學習狀況')
    expect(html).toContain('完成 3 個步驟後留下 Email')
    expect(html).toContain('送出後立即開始製作，完成後直接開放下載')
    expect(html).not.toContain('第一份專屬教材預計隔天開放下載')
    expect(html).not.toContain('從家長 Email 建立帳號')
    expect(html).not.toContain('建立家長帳號或登入')
    expect(html).not.toMatch(/\bautofocus\b/i)
  })

  it('keeps the waitlist + Founding offer truthful after Beta', () => {
    const html = renderToStaticMarkup(<LandingPage enrollment={{
      status: 'waitlist',
      capacity: 100,
      activeCount: 100,
      remaining: 0,
      foundingLimit: 30,
      foundingCount: 11,
      freePilotActive: false,
      freePilotAdmissions: 100,
      freePilotLimit: 100,
    }} />)
    expect(html).toContain('創始 30 名限定')
    expect(html).toContain('月繳 NT$349（目前仍有名額）')
    expect(html).toContain('登記候補')
  })
})