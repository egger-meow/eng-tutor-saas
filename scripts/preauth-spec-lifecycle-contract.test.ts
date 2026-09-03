import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const spec = readFileSync(resolve(import.meta.dirname, '../docs/SPEC.md'), 'utf8').replace(/\r\n/g, '\n')

function section(number: number): string {
  const startMarker = `# ${number}. `
  const start = spec.indexOf(startMarker)
  if (start < 0) throw new Error(`Missing SPEC section ${number}`)
  const next = spec.indexOf(`\n# ${number + 1}. `, start + startMarker.length)
  return next < 0 ? spec.slice(start) : spec.slice(start, next)
}

describe('canonical pre-auth Week 1 lifecycle SPEC', () => {
  it('makes successful trusted Magic Link dispatch sufficient to start a brand-new first child and Week 1 before link click', () => {
    const freeWeek = section(24)
    const auth = section(33)
    const onboarding = section(44)

    for (const text of [freeWeek, auth, onboarding]) {
      expect(text).toContain('successful trusted Magic Link dispatch')
      expect(text).toContain('before the parent clicks the Magic Link')
      expect(text).toContain('pre-existing Auth account')
      expect(text).toContain('no pre-auth child mutation')
    }

    expect(freeWeek).toContain('canonical child + profile')
    expect(freeWeek).toContain('explicit Week 1 generation job')
    expect(freeWeek).toContain('Magic Link authentication / account access')
    expect(freeWeek.indexOf('explicit Week 1 generation job')).toBeLessThan(freeWeek.indexOf('Magic Link authentication / account access'))

    expect(freeWeek).not.toContain('Magic Link authentication\n↓\nAtomically bind the completed onboarding to the authenticated parent\n↓\nCreate the real child + profile exactly once')
    expect(onboarding).not.toContain('Magic Link authentication\n↓\nBind completed draft to authenticated parent\n↓\nFirst generation')
  })

  it('defines a seven-step acquisition funnel and keeps auth_complete secondary', () => {
    const analytics = section(168)
    const admin = section(172)

    expect(analytics).toContain('landing view\n→ sample click\n→ free trial CTA click\n→ child form start\n→ email submit\n→ child created\n→ onboarding complete')
    expect(analytics).toContain('`auth_complete` is a secondary account-access / engagement metric')
    expect(analytics).not.toContain('email submit\n→ auth complete\n→ child created')

    expect(admin).toContain('seven-stage first-time acquisition funnel')
    expect(admin).toContain('Magic Link account binding separately')
    expect(admin).toContain('must not count missing `auth_complete` as acquisition drop-off')
  })

  it('locks testing, account DoD, first-material DoD, and security to the trusted pre-auth activation boundary', () => {
    const testing = section(179)
    const account = section(192)
    const firstMaterial = section(193)
    const security = section(198)

    expect(testing).toContain('trusted Auth dispatch succeeds before activation')
    expect(testing).toContain('pre-existing Auth account receives no pre-auth child mutation')
    expect(testing).toContain('retry after an uncertain activation does not reclassify or duplicate')

    expect(account).toContain('successful trusted Magic Link dispatch starts first-child provisioning without requiring a Magic Link click')
    expect(account).toContain('later authenticate through the Magic Link')
    expect(account).toContain('same already-provisioned child')

    expect(firstMaterial).toContain('first-time Email submission can create the canonical child and initial generation job before browser authentication')
    expect(firstMaterial).toContain('Magic Link click is not a prerequisite for Week 1 authoring eligibility')

    expect(security).toContain('service-only prepare and activation functions')
    expect(security).toContain('anonymous browser cannot assert successful Auth dispatch')
    expect(security).toContain('pre-existing Auth accounts receive no pre-auth child mutation')
    expect(security).toContain('account existence is never revealed to the anonymous browser')
  })
})
