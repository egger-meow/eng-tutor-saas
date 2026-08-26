import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { legalConfig } from '../lib/config'
import { LandingPage } from './LandingPage'
import { PricingSection } from '../components/public/PricingSection'
import { TermsPage } from './TermsPage'

const openEnrollment = {
  status: 'open' as const,
  capacity: 100,
  remaining: 50,
  activeCount: 50,
  foundingLimit: 30,
  foundingCount: 0,
  waitingCount: 0,
  releasedCount: 0,
  totalDemand: 50,
}

const currentCopy = () => [
  renderToStaticMarkup(<LandingPage enrollment={openEnrollment} />),
  renderToStaticMarkup(<PricingSection enrollment={openEnrollment} />),
  renderToStaticMarkup(<TermsPage />),
].join('\n')

describe('Founder 30 canonical public contract', () => {
  it('publishes the continuous NT$349 monthly offer without a month-two reversion claim', () => {
    const copy = currentCopy()
    expect(copy).toContain('創始 30・月繳限定')
    expect(copy).toContain('持續訂閱期間固定')
    expect(copy).toContain('NT$349')
    expect(copy).not.toContain('第二個付費月')
    expect(copy).not.toContain('第一個付費月 NT$349')
  })

  it('versions only Terms for the material pricing-contract change', () => {
    expect(legalConfig.termsVersion).toBe('2026-08-26-v2')
    expect(legalConfig.privacyVersion).toBe('2026-08-16-v1')
    expect(legalConfig.termsPublishedAt).toBe('2026-08-26')
    expect(legalConfig.termsEffectiveAt).toBe('2026-08-29')
    const terms = renderToStaticMarkup(<TermsPage />)
    expect(terms).toContain('公告日期：2026 年 8 月 26 日')
    expect(terms).toContain('生效日期：2026 年 8 月 29 日')
    expect(terms).not.toContain('已於官方網站公開提供消費者至少')
    expect(terms).toContain('限額 30 位孩子')
    expect(terms).toContain('訂閱實際成為 canceled')
    expect(terms).toContain('已兌換之席次亦不回補')
    expect(terms).toContain('年繳方案不適用創始價格')
  })
})
