import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const dashboardSource = readFileSync(new URL('../apps/web/src/routes/DashboardPage.tsx', import.meta.url), 'utf8')

describe('DashboardPage material reveal', () => {
  it('keeps child material cards visible immediately on SPA navigation', () => {
    expect(dashboardSource).toMatch(
      /<StaggerItem\s+key=\{child\.id\}[\s\S]*?initial=\{false\}[\s\S]*?data-revealed="true"[\s\S]*?>/,
    )
  })

  it('ensures Week 1 progress container resets empty-state borders and provides clean orbit styling', () => {
    const betaUxCss = readFileSync(new URL('../apps/web/src/styles/beta-trust-ux.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
    const componentsCss = readFileSync(new URL('../apps/web/src/styles/components.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n')

    // empty-state has rounded border-radius
    expect(componentsCss).toContain('.empty-state { padding: var(--space-8); border: 1px dashed var(--color-rule-strong); border-radius: var(--radius-surface);')

    // generation-progress resets border and padding
    expect(betaUxCss).toContain('.empty-state.generation-progress {\n  display: grid;\n  gap: 0.9rem;\n  padding: 0;\n  border: none;\n  background: transparent;')

    // generation-progress-ready has solid border and rounded corners
    expect(betaUxCss).toContain('.empty-state.generation-progress-ready {\n  padding: clamp(1.25rem, 3vw, 1.75rem);\n  border: 1px solid #b8d5c4;\n  border-radius: 16px;')

    // week1-fast-orbit has breathing animation and center particle
    expect(betaUxCss).toContain('.week1-fast-orbit {')
    expect(betaUxCss).toContain('animation: paper-spin 0.78s linear infinite, week1-breathe 1.8s ease-in-out infinite;')
    expect(betaUxCss).toContain('.week1-fast-orbit::before {')

    // active step marker is highlighted
    expect(betaUxCss).toContain('.week1-fast-step.is-active .week1-fast-marker {')
  })
})
