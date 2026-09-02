import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  confirmAdditionalChildOnboarding,
  discardPendingOnboarding,
  finalizePendingOnboarding,
  readOnboardingToken,
  startLandingOnboarding,
} from './onboarding-handoff'
import { legalConfig } from './config'
import { emptyProfileDraft } from './profile-form'

const rpc = vi.fn()
const invoke = vi.fn()

vi.mock('./supabase', () => ({
  getSupabaseClient: vi.fn(() => ({
    rpc,
    functions: { invoke },
  })),
}))

describe('onboarding handoff', () => {
  beforeEach(() => {
    rpc.mockReset()
    invoke.mockReset()
  })

  it('starts landing onboarding through the trusted Edge Function without browser-side auth or pending RPCs', async () => {
    invoke.mockResolvedValueOnce({ data: { accepted: true }, error: null })
    const draft = {
      ...emptyProfileDraft,
      displayName: '小宇',
      grade: 7,
      gradeStage: 'incoming_grade_7',
      baselineLevel: 'average',
    }

    await expect(startLandingOnboarding({
      email: ' Parent@Example.COM ',
      draft,
      anonymousId: 'anon-123',
      redirectOrigin: 'https://paperbond.jjmowlab.com',
    })).resolves.toBeUndefined()

    expect(invoke).toHaveBeenCalledTimes(1)
    expect(invoke).toHaveBeenCalledWith('start-landing-onboarding', {
      body: {
        email: 'parent@example.com',
        draft,
        termsVersion: legalConfig.termsVersion,
        privacyVersion: legalConfig.privacyVersion,
        anonymousId: 'anon-123',
        sessionId: null,
        redirectOrigin: 'https://paperbond.jjmowlab.com',
      },
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('treats an Edge Function transport or non-accepted response as a retryable send failure', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { message: 'edge unavailable' } })
    await expect(startLandingOnboarding({
      email: 'parent@example.com',
      draft: emptyProfileDraft,
      anonymousId: 'anon-123',
      redirectOrigin: 'https://paperbond.jjmowlab.com',
    })).rejects.toThrow('edge unavailable')

    invoke.mockResolvedValueOnce({ data: { accepted: false }, error: null })
    await expect(startLandingOnboarding({
      email: 'parent@example.com',
      draft: emptyProfileDraft,
      anonymousId: 'anon-123',
      redirectOrigin: 'https://paperbond.jjmowlab.com',
    })).rejects.toThrow('無法寄送安全連結')
  })

  it('finalizes a first child after auth and returns a created result', async () => {
    rpc.mockResolvedValueOnce({ data: '11111111-1111-1111-1111-111111111111', error: null })

    await expect(finalizePendingOnboarding('opaque-token')).resolves.toEqual({
      status: 'created',
      childId: '11111111-1111-1111-1111-111111111111',
    })
    expect(rpc).toHaveBeenCalledWith('finalize_pending_onboarding', { p_token: 'opaque-token' })
  })

  it('turns the returning-parent database guard into an explicit confirmation state', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'ADDITIONAL_CHILD_CONFIRMATION_REQUIRED' },
    })

    await expect(finalizePendingOnboarding('opaque-token')).resolves.toEqual({
      status: 'additional_child_confirmation_required',
    })
  })

  it('creates an additional child only through the explicit authenticated confirmation RPC', async () => {
    rpc.mockResolvedValueOnce({ data: '22222222-2222-2222-2222-222222222222', error: null })

    await expect(confirmAdditionalChildOnboarding('opaque-token')).resolves.toBe('22222222-2222-2222-2222-222222222222')
    expect(rpc).toHaveBeenCalledWith('confirm_additional_child_onboarding', { p_token: 'opaque-token' })
  })

  it('can discard the pending landing draft without creating another child', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null })

    await expect(discardPendingOnboarding('opaque-token')).resolves.toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('discard_pending_onboarding', { p_token: 'opaque-token' })
  })

  it('reads only a bounded onboarding token from the magic-link return URL', () => {
    expect(readOnboardingToken('?aid=a1&onboarding=abc-123')).toBe('abc-123')
    expect(readOnboardingToken(`?onboarding=${'x'.repeat(257)}`)).toBeNull()
    expect(readOnboardingToken('?onboarding=%20%20')).toBeNull()
  })
})
