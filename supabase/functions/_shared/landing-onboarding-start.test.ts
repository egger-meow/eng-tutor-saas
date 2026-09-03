import { describe, expect, it, vi } from 'vitest'
import { startLandingOnboarding } from './landing-onboarding-start'

const input = {
  email: ' Parent@Example.com ',
  draft: { displayName: '小紙', grade: 7, gradeStage: 'grade_7', baselineLevel: 'on-level', weeklyMinutes: 60 },
  termsVersion: '2026-08-01',
  privacyVersion: '2026-08-01',
  anonymousId: 'anon-123',
  sessionId: 'session-123',
  redirectOrigin: 'https://paperbond.jjmowlab.com',
}

function deps() {
  return {
    prepare: vi.fn(async () => 'token-1234567890123456789012345678901234567890'),
    sendMagicLink: vi.fn(async () => undefined),
    activate: vi.fn(async () => ({ status: 'accepted' })),
    sleep: vi.fn(async () => undefined),
    allowedRedirectOrigins: ['https://paperbond.jjmowlab.com'],
  }
}

describe('startLandingOnboarding', () => {
  it('prepares before Auth dispatch, then activates the exact prepared token', async () => {
    const d = deps()
    const order: string[] = []
    d.prepare.mockImplementation(async () => { order.push('prepare'); return 'token-1234567890123456789012345678901234567890' })
    d.sendMagicLink.mockImplementation(async () => { order.push('send'); return undefined })
    d.activate.mockImplementation(async () => { order.push('activate'); return { status: 'accepted' } })

    await expect(startLandingOnboarding(input, d)).resolves.toEqual({ status: 'accepted' })

    expect(order).toEqual(['prepare', 'send', 'activate'])
    expect(d.prepare).toHaveBeenCalledTimes(1)
    expect(d.prepare).toHaveBeenCalledWith(expect.objectContaining({
      email: 'parent@example.com',
      anonymousId: 'anon-123',
      sessionId: 'session-123',
    }))
    expect(d.sendMagicLink).toHaveBeenCalledWith({
      email: 'parent@example.com',
      redirectTo: 'https://paperbond.jjmowlab.com/?aid=anon-123&onboarding=token-1234567890123456789012345678901234567890',
    })
    expect(d.activate).toHaveBeenCalledWith('token-1234567890123456789012345678901234567890')
  })

  it('never activates when Auth rejects the Magic Link request', async () => {
    const d = deps()
    d.sendMagicLink.mockRejectedValueOnce(new Error('auth unavailable'))

    await expect(startLandingOnboarding(input, d)).rejects.toThrow('auth unavailable')
    expect(d.prepare).toHaveBeenCalledTimes(1)
    expect(d.activate).not.toHaveBeenCalled()
  })

  it('retries activation with the same token after Auth dispatch without re-sending email', async () => {
    const d = deps()
    d.activate
      .mockRejectedValueOnce(new Error('AUTH_USER_NOT_READY'))
      .mockRejectedValueOnce(new Error('network uncertain'))
      .mockResolvedValueOnce({ status: 'accepted' })

    await expect(startLandingOnboarding(input, d)).resolves.toEqual({ status: 'accepted' })

    expect(d.prepare).toHaveBeenCalledTimes(1)
    expect(d.sendMagicLink).toHaveBeenCalledTimes(1)
    expect(d.activate).toHaveBeenCalledTimes(3)
    expect(d.activate.mock.calls.every(([token]) => token === 'token-1234567890123456789012345678901234567890')).toBe(true)
    expect(d.sleep).toHaveBeenCalledTimes(2)
  })

  it('propagates the authoritative accepted or waitlisted activation status', async () => {
    const accepted = deps()
    accepted.activate.mockResolvedValueOnce({ status: 'accepted' })
    const waitlisted = deps()
    waitlisted.activate.mockResolvedValueOnce({ status: 'waitlisted' })

    await expect(startLandingOnboarding(input, accepted)).resolves.toEqual({ status: 'accepted' })
    await expect(startLandingOnboarding(input, waitlisted)).resolves.toEqual({ status: 'waitlisted' })
  })

  it('rejects an unexpected activation response instead of inventing success', async () => {
    const d = deps()
    d.activate.mockResolvedValueOnce({ accepted: true } as never)

    await expect(startLandingOnboarding(input, d)).rejects.toThrow('invalid_activation_status')
  })

  it('rejects an unapproved redirect origin before touching private state', async () => {
    const d = deps()

    await expect(startLandingOnboarding({ ...input, redirectOrigin: 'https://evil.example' }, d)).rejects.toThrow('invalid_redirect_origin')
    expect(d.prepare).not.toHaveBeenCalled()
    expect(d.sendMagicLink).not.toHaveBeenCalled()
    expect(d.activate).not.toHaveBeenCalled()
  })
})
