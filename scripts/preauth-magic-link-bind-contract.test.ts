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
    expect(app).toContain('finalizePendingOnboarding(token)')
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

  it('keeps the Magic Link positioned as login and child-management access, not the trigger that starts Week 1', () => {
    expect(magicLink).toContain('第一週教材已經開始準備')
    expect(magicLink).toContain('安全登入、查看進度與管理孩子')
    expect(magicLink).toContain('這封信只是讓你安全登入')
    expect(magicLink).not.toContain('點擊後開始產生')
    expect(magicLink).not.toContain('按下按鈕後開始準備第一週')
  })
})
