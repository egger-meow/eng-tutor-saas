import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const source = readFileSync(resolve(root, 'apps/web/src/components/auth/LandingOnboardingPanel.tsx'), 'utf8')

describe('landing onboarding browser boundary', () => {
  it('delegates Email onboarding to the trusted Edge Function helper instead of browser-side pending/Auth orchestration', () => {
    expect(source).toContain("import { startLandingOnboarding } from '../../lib/landing-onboarding-start'")
    expect(source).toContain('const result = await startLandingOnboarding({')
    expect(source).not.toContain('createPendingOnboarding')
    expect(source).not.toContain('buildAuthRedirectUrl')
    expect(source).not.toContain('getSupabaseClient')
    expect(source).not.toContain('signInWithOtp')
  })

  it('passes first-party attribution but leaves acquisition events server-authoritative', () => {
    expect(source).toContain('anonymousId: getAnonymousId()')
    expect(source).toContain('redirectOrigin: window.location.origin')
    expect(source).not.toContain('trackEmailSubmit')
    expect(source).not.toContain('trackChildCreated')
    expect(source).not.toContain('trackOnboardingComplete')
  })

  it('promises immediate Week 1 preparation only for accepted activation and tells waitlisted parents the truth', () => {
    expect(source).toContain('最後留下 Email，第一週做好直接寄給你')
    expect(source).toContain('開始準備第一週教材')
    expect(source).toContain("if (result.status === 'waitlisted')")
    expect(source).toContain('完成了，第一週教材已開始準備')
    expect(source).toContain('教材完成後會直接寄到你的 Email，不需要一直留在網站上。')
    expect(source).toContain('目前名額已滿，已幫你登記候補。')
    expect(source).toContain('輪到你時我們會寄 Email 通知，不會先開始產生教材。')
    expect(source).not.toContain('點開後就會完成帳號設定並直接進入孩子管理畫面')
  })
})
