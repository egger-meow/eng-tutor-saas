import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const dashboardSource = readFileSync(new URL('./DashboardPage.tsx', import.meta.url), 'utf8')

describe('DashboardPage material reveal', () => {
  it('keeps child material cards visible immediately on SPA navigation', () => {
    expect(dashboardSource).toMatch(
      /<StaggerItem\s+key=\{child\.id\}[\s\S]*?initial=\{false\}[\s\S]*?data-revealed="true"[\s\S]*?>/,
    )
  })
})
