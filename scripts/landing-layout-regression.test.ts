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

  it('ensures why-not-gpt and parent-role cards match 100% width and landing-section-nav is centered', () => {
    const landingDetailsCss = readFileSync(new URL('../apps/web/src/styles/landing-details.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
    const betaUxCss = readFileSync(new URL('../apps/web/src/styles/beta-trust-ux.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
    const appCss = readFileSync(new URL('../apps/web/src/App.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n')

    // why-not-gpt and parent-role have full width
    expect(landingDetailsCss).toContain('.why-not-gpt {\n  position: relative;\n  overflow: hidden;\n  width: 100%;\n  max-width: none !important;\n  box-sizing: border-box;')
    expect(landingDetailsCss).toContain('.parent-role {\n  position: relative;\n  overflow: hidden;\n  width: 100%;\n  max-width: none !important;\n  box-sizing: border-box;')

    // App.css does not constrain why-not-gpt with max-width
    expect(appCss).toContain('.why-not-gpt { width: 100%; }')
    expect(appCss).toContain('.parent-role { width: 100%; }')

    // landing-section-nav is fit-content
    expect(betaUxCss).toContain('.landing-section-nav {\n  display: flex;\n  gap: 0.5rem;\n  flex-wrap: wrap;\n  align-items: center;\n  justify-content: center;\n  width: fit-content;')
  })
})
