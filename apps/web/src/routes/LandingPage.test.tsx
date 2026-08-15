import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LandingPage, faqItems } from './LandingPage'
import { PricingSection } from '../components/public/PricingSection'

describe('Landing Page — First Delivery Timing Disclosure', () => {
  it('discloses next-day delivery expectation in hero section', () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain('完成孩子資料後，第一份專屬教材預計隔天開放下載。')
  })

  it('discloses next-day delivery expectation in pricing section', () => {
    const html = renderToStaticMarkup(<PricingSection />)
    expect(html).toContain('完成孩子資料後，第一份專屬教材預計隔天開放下載。')
  })

  it('includes the first material timing question and answer in FAQ', () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain('多久可以拿到第一份教材？')
    
    const deliveryFaq = faqItems.find(([q]) => q === '多久可以拿到第一份教材？')
    expect(deliveryFaq).toBeDefined()
    expect(deliveryFaq?.[1]).toBe('完成孩子資料後，第一份專屬教材預計於隔天開放下載。之後每週依固定節奏提供新的個人化教材。')
  })

  it('includes next-day expectation in onboarding login steps', () => {
    const html = renderToStaticMarkup(<LandingPage />)
    expect(html).toContain('第一份專屬教材預計隔天開放下載')
  })

  it('does NOT contain forbidden instantaneous promises or fixed hourly guarantees', () => {
    const html = renderToStaticMarkup(<LandingPage />)
    // Must NOT promise instant availability
    expect(html).not.toContain('立即下載第一份')
    expect(html).not.toContain('馬上拿到')
    expect(html).not.toContain('立刻生成')
    // Must NOT promise exact 24 hour windows
    expect(html).not.toContain('24 小時內交付')
    expect(html).not.toContain('24小時內交付')
    // Must NOT expose operational infrastructure terms to public parents
    expect(html).not.toContain('ChatGPT Scheduled')
    expect(html).not.toContain('finisher')
    expect(html).not.toContain('generation_jobs')
    expect(html).not.toContain('00:15')
  })
})
