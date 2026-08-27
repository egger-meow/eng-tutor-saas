import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LandingPage } from './LandingPage'
import { PricingSection } from '../components/public/PricingSection'
import { getEnrollmentCta, type EnrollmentState } from '../lib/enrollment'

const base = {
  status: 'open' as const,
  capacity: 100,
  activeCount: 0,
  remaining: 100,
  foundingLimit: 30,
  foundingCount: 0,
  waitingCount: 0,
  releasedCount: 0,
}

describe('public enrollment boundary matrix', () => {
  it('0-29 Founder seats: shows Founder offer while service capacity is open', () => {
    const enrollment: EnrollmentState = { ...base, activeCount: 12, remaining: 88, foundingCount: 12 }
    const html = renderToStaticMarkup(<LandingPage enrollment={enrollment} />)

    expect(html).toContain('創始 30 名限定')
    expect(html).toContain('月繳 NT$349')
    expect(html).toContain('免費取得第一週教材')
    expect(html).not.toContain('登記候補')
  })

  it('30-99: Founder sold out but service capacity open shows standard offer without Founder copy', () => {
    const enrollment: EnrollmentState = { ...base, activeCount: 40, remaining: 60, foundingCount: 30 }
    const landing = renderToStaticMarkup(<LandingPage enrollment={enrollment} />)
    const pricing = renderToStaticMarkup(<PricingSection enrollment={enrollment} />)

    expect(landing).toContain('免費取得第一週教材')
    expect(landing).not.toContain('hero-founding-badge')
    expect(pricing).not.toContain('創始 30・月繳限定')
    expect(pricing).toContain('NT$499')
  })

  it('100+: capacity full hides Founder promotion and next-day delivery promises', () => {
    const enrollment: EnrollmentState = { ...base, activeCount: 100, remaining: 0, foundingCount: 17 }
    const landing = renderToStaticMarkup(<LandingPage enrollment={enrollment} />)
    const pricing = renderToStaticMarkup(<PricingSection enrollment={enrollment} />)

    expect(landing).toContain('登記候補')
    expect(landing).not.toContain('hero-founding-badge')
    expect(landing).not.toContain('<p class="hero-delivery-note">完成孩子資料後，第一份專屬教材預計隔天開放下載。</p>')
    expect(pricing).not.toContain('創始 30・月繳限定')
    expect(pricing).not.toContain('<p class="pricing-delivery-note">完成孩子資料後，第一份專屬教材預計隔天開放下載。</p>')
    expect(pricing).toContain('目前名額已滿')
  })

  it('does not promise a free first week before enrollment state has loaded', () => {
    const cta = getEnrollmentCta(null)
    expect(cta.label).toBe('確認目前名額…')
    expect(cta.isWaitlist).toBe(false)
  })
})
