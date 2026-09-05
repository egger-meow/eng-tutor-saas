import { beforeEach, describe, expect, it, vi } from 'vitest'
import { legalConfig } from './config'
import { emptyProfileDraft } from './profile-form'
import { startLandingOnboarding } from './landing-onboarding-start'

const invoke = vi.fn()

vi.mock('./supabase', () => ({
  getSupabaseClient: vi.fn(() => ({
    functions: { invoke },
  })),
}))

const input = {
  email: ' Parent@Example.COM ',
  draft: emptyProfileDraft,
  anonymousId: 'anon-123',
  redirectOrigin: 'https://paperbond.jjmowlab.com',
}

describe('landing onboarding start client', () => {
  beforeEach(() => invoke.mockReset())

  it('returns accepted from the trusted Edge Function and sends legal + attribution context', async () => {
    invoke.mockResolvedValueOnce({ data: { status: 'accepted' }, error: null })

    await expect(startLandingOnboarding(input)).resolves.toEqual({ status: 'accepted' })
    expect(invoke).toHaveBeenCalledWith('start-landing-onboarding', {
      body: {
        email: 'parent@example.com',
        draft: emptyProfileDraft,
        termsVersion: legalConfig.termsVersion,
        privacyVersion: legalConfig.privacyVersion,
        anonymousId: 'anon-123',
        sessionId: null,
        redirectOrigin: 'https://paperbond.jjmowlab.com',
      },
    })
  })

  it('preserves waitlisted without exposing account classification', async () => {
    invoke.mockResolvedValueOnce({ data: { status: 'waitlisted' }, error: null })

    await expect(startLandingOnboarding(input)).resolves.toEqual({ status: 'waitlisted' })
  })

  it('never leaks transport or Edge Function implementation errors to parents', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { message: 'Edge Function returned a non-2xx status code' } })

    await expect(startLandingOnboarding(input)).rejects.toThrow('目前無法送出登入信')
    await expect(startLandingOnboarding(input)).rejects.not.toThrow('Edge Function')
  })

  it('uses the same human-safe message for unexpected public response shapes', async () => {
    invoke.mockResolvedValueOnce({ data: { accepted: true }, error: null })

    await expect(startLandingOnboarding(input)).rejects.toThrow('目前無法送出登入信')
  })
})
