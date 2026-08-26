import { describe, expect, it } from 'vitest'
import { isCurrentTermsEffective, legalConfig } from './config'

describe('Legal & Compliance Configuration & Invariants', () => {
  it('enforces statutory review period of at least 3 days for Taiwan standard contracts', () => {
    expect(legalConfig.reviewPeriodDays).toBeGreaterThanOrEqual(3)
  })

  it('keeps Terms v2 in review until its Taiwan effective timestamp', () => {
    expect(isCurrentTermsEffective(new Date('2026-08-28T15:59:59Z'))).toBe(false)
    expect(isCurrentTermsEffective(new Date('2026-08-28T16:00:00Z'))).toBe(true)
  })

  it('has semantic legal version strings for audit tracking', () => {
    expect(legalConfig.termsVersion).toMatch(/^\d{4}-\d{2}-\d{2}/)
    expect(legalConfig.privacyVersion).toMatch(/^\d{4}-\d{2}-\d{2}/)
  })

  it('enforces valid company information and contact channels', () => {
    expect(legalConfig.companyName).toBe('jjmow (侯均頲)')
    expect(legalConfig.representative).toBe('jjmow (侯均頲)')
    expect(legalConfig.contactEmail).toBe('jjmow.cs15@nycu.edu.tw')
    expect(legalConfig.companyAddress).toBe('台灣新竹市')
  })

  it('supports recurring subscription mode by default with safety switch capability', () => {
    // Preserves standard SaaS recurring subscription behavior while supporting regulatory overrides if required
    expect(typeof legalConfig.allowAutoRenewal).toBe('boolean')
    expect(legalConfig.allowAutoRenewal).toBe(true)
  })
})
