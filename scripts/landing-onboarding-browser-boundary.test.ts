import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const source = readFileSync(resolve(root, 'apps/web/src/components/auth/LandingOnboardingPanel.tsx'), 'utf8')

describe('landing onboarding browser boundary', () => {
  it('delegates Email onboarding to the trusted Edge Function helper instead of browser-side pending/Auth orchestration', () => {
    expect(source).toContain("import { startLandingOnboarding } from '../../lib/onboarding-handoff'")
    expect(source).toContain('await startLandingOnboarding({')
    expect(source).not.toContain('createPendingOnboarding')
    expect(source).not.toContain('buildAuthRedirectUrl')
    expect(source).not.toContain('getSupabaseClient')
    expect(source).not.toContain('signInWithOtp')
  })

  it('preserves first-party analytics stitching inputs when handing the request to the Edge Function', () => {
    expect(source).toContain('anonymousId: getAnonymousId()')
    expect(source).toContain('redirectOrigin: window.location.origin')
    expect(source).toContain("trackEmailSubmit({ flow: 'landing_onboarding' })")
  })
})
