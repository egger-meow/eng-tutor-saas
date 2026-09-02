import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  confirmAdditionalChildOnboarding,
  createPendingOnboarding,
  discardPendingOnboarding,
  finalizePendingOnboarding,
  readOnboardingToken,
} from './onboarding-handoff'
import { emptyProfileDraft } from './profile-form'

const rpc = vi.fn()

vi.mock('./supabase', () => ({
  getSupabaseClient: vi.fn(() => ({ rpc })),
}))

describe('onboarding handoff', () => {
  beforeEach(() => rpc.mockReset())

  it('creates an opaque pending onboarding without writing a child before authentication', async () => {
    rpc.mockResolvedValueOnce({ data: 'opaque-token', error: null })

    const token = await createPendingOnboarding(' Parent@Example.COM ', {
      ...emptyProfileDraft,
      displayName: '小宇',
      grade: 7,
      gradeStage: 'incoming_grade_7',
      baselineLevel: 'average',
    })

    expect(token).toBe('opaque-token')
    expect(rpc).toHaveBeenCalledWith('create_pending_onboarding', expect.objectContaining({
      p_email: 'parent@example.com',
      p_draft: expect.objectContaining({ displayName: '小宇', gradeStage: 'incoming_grade_7' }),
    }))
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
