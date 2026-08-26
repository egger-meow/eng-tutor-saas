import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { legalConfig } from '../lib/config'
import { LandingPage } from './LandingPage'
import { PricingSection } from '../components/public/PricingSection'
import { TermsPage } from './TermsPage'

const currentCopy = () => [
  renderToStaticMarkup(<LandingPage />),
  renderToStaticMarkup(<PricingSection />),
  renderToStaticMarkup(<TermsPage />),
].join('\n')

describe('Founder 30 canonical public contract', () => {
  it('publishes the continuous NT$299 monthly offer without a month-two reversion claim', () => {
    const copy = currentCopy()
    expect(copy).toContain('創始 30・月繳限定')
    expect(copy).toContain('持續訂閱期間固定')
    expect(copy).not.toContain('第二個付費月')
    expect(copy).not.toContain('第一個付費月 NT$299')
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
    expect(terms).toContain('保留 Founder 名額 14 日')
    expect(terms).toContain('訂閱實際成為 canceled')
    expect(terms).toContain('已使用之 Founder 席次亦不會回補')
    expect(terms).toContain('年繳訂閱成功啟用時')
  })
})
