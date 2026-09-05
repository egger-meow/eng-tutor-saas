import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const source = readFileSync(resolve(root, 'apps/web/src/components/auth/LandingOnboardingPanel.tsx'), 'utf8')
const app = readFileSync(resolve(root, 'apps/web/src/App.tsx'), 'utf8')
const childCard = readFileSync(resolve(root, 'apps/web/src/components/dashboard/ChildCard.tsx'), 'utf8')
const progress = readFileSync(resolve(root, 'apps/web/src/components/materials/Week1FastProgress.tsx'), 'utf8')

describe('landing onboarding browser boundary', () => {
  it('delegates Email onboarding to the trusted Edge Function helper instead of browser-side pending/Auth orchestration', () => {
    expect(source).toContain("from '../../lib/landing-onboarding-start'")
    expect(source).toContain('startLandingOnboarding')
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

  it('locks successful submission so parents cannot immediately trigger a duplicate Magic Link send', () => {
    expect(source).toContain("type PanelMode = 'profile' | 'email' | 'existing' | 'submitted'")
    expect(source).toContain("if (busy || mode === 'submitted') return")
    expect(source).toContain("setMode('submitted')")
    expect(source).toContain('登入信只用來安全登入，不需要重複送出')
  })

  it('starts Week 1 immediately only for accepted activation and keeps waitlist copy truthful', () => {
    expect(source).toContain('最後留下 Email，第一週現在就開始做')
    expect(source).toContain('立即開始製作第一週教材')
    expect(source).toContain('setSubmissionStatus(result.status)')
    expect(source).toContain("submissionStatus === 'waitlisted'")
    expect(source).toContain('第一週已開始製作')
    expect(source).toContain('系統已經開始替孩子製作第一週教材')
    expect(source).toContain('目前名額已滿，已幫你登記候補。')
    expect(source).toContain('輪到你時我們會寄 Email 通知，不會先開始產生教材。')
    expect(source).not.toContain('點開後就會完成帳號設定並直接進入孩子管理畫面')
  })

  it('shows authoritative live preparation progress instead of a dead-looking blank screen', () => {
    expect(app).toContain('onboarding-progress-card')
    expect(app).toContain('正在把孩子資料接到帳號')
    expect(childCard).toContain('OwnedWeek1FastProgress')
    expect(childCard).toContain('<OwnedWeek1FastProgress childId={child.id} onReady={onRefresh} />')
    expect(progress).toContain('資料已收到')
    expect(progress).toContain('已排入教材製作')
    expect(progress).toContain('正在製作內容')
    expect(progress).toContain('品質檢查與排版')
    expect(progress).toContain('教材可以下載')
  })
})
