import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const app = readFileSync(resolve(root, 'apps/web/src/App.tsx'), 'utf8')
const magicLink = readFileSync(resolve(root, 'supabase/templates/magic-link.html'), 'utf8')

function callCount(name: string): number {
  return [...app.matchAll(new RegExp(`${name}\\(`, 'gu'))].length
}

describe('pre-auth Week 1 Magic Link bind contract', () => {
  it('does not duplicate server-authoritative child acquisition events when binding a pre-provisioned first child', () => {
    expect(app).toContain('const result = await finalizePendingOnboarding')
    expect(app).toContain('clearLandingHandoffClientState()')
    expect(callCount('trackChildCreated')).toBe(1)
    expect(callCount('trackOnboardingComplete')).toBe(1)
  })

  it('keeps acquisition analytics for an explicitly confirmed additional child', () => {
    expect(app).toContain('const childId = await confirmAdditionalChildOnboarding')
    expect(app).toContain("trackAdditionalChildConfirmed(childId, { flow: 'landing_onboarding' })")
    expect(app).toContain("trackChildCreated(childId, { flow: 'landing_onboarding', finalized_after_auth: true, additional_child: true })")
    expect(app).toContain("trackOnboardingComplete(childId, { flow: 'landing_onboarding', finalized_after_auth: true, additional_child: true })")
  })

  it('keeps the Magic Link positioned as login and child-management binding, not the trigger that starts Week 1', () => {
    expect(magicLink).toContain('連結到你的家長帳號')
    expect(magicLink).toContain('孩子管理畫面')
    expect(magicLink).not.toContain('開始準備第一週')
    expect(magicLink).not.toContain('點擊後開始產生')
  })
})
