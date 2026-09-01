import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPendingOnboarding, finalizePendingOnboarding, readOnboardingToken } from './onboarding-handoff'
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

  it('finalizes the handoff after auth and returns the existing or newly-created child id', async () => {
    rpc.mockResolvedValueOnce({ data: '11111111-1111-1111-1111-111111111111', error: null })

    await expect(finalizePendingOnboarding('opaque-token')).resolves.toBe('11111111-1111-1111-1111-111111111111')
    expect(rpc).toHaveBeenCalledWith('finalize_pending_onboarding', { p_token: 'opaque-token' })
  })

  it('reads only a bounded onboarding token from the magic-link return URL', () => {
    expect(readOnboardingToken('?aid=a1&onboarding=abc-123')).toBe('abc-123')
    expect(readOnboardingToken(`?onboarding=${'x'.repeat(257)}`)).toBeNull()
    expect(readOnboardingToken('?onboarding=%20%20')).toBeNull()
  })
})
