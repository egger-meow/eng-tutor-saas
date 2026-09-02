import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../apps/web/src/styles/landing-onboarding.css', import.meta.url), 'utf8')

describe('Landing Page Onboarding/Login Layout Regression', () => {
  it('defines responsive 2-column desktop grid and mobile vertical stacking in CSS', () => {
    // Desktop 2-column grid
    expect(css).toContain('.landing-auth-grid')
    expect(css).toContain('grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr)')

    // Mobile media query stacking
    expect(css).toContain('@media (max-width: 959px)')
    expect(css).toContain('grid-template-columns: 1fr')
    expect(css).toContain('.landing-onboarding-card')
    expect(css).toContain('order: 1')
    expect(css).toContain('.landing-login-card')
    expect(css).toContain('order: 2')

    // Height stability & scroll alignment
    expect(css).toContain('min-height: clamp(34rem, 60vh, 46rem)')
    expect(css).toContain('scroll-margin-top: clamp(4rem, 8vw, 6rem)')
  })
})
