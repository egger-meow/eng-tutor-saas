export interface LandingOnboardingStartInput {
  email: string
  draft: Record<string, unknown>
  termsVersion: string
  privacyVersion: string
  anonymousId: string
  sessionId?: string | null
  redirectOrigin: string
}

export interface LandingOnboardingPrepareInput {
  email: string
  draft: Record<string, unknown>
  termsVersion: string
  privacyVersion: string
  anonymousId: string
  sessionId: string | null
}

export type LandingOnboardingStartStatus = 'accepted' | 'waitlisted'

export interface LandingOnboardingStartDeps {
  prepare: (input: LandingOnboardingPrepareInput) => Promise<string>
  sendMagicLink: (input: { email: string; redirectTo: string }) => Promise<void>
  activate: (token: string) => Promise<unknown>
  sleep: (ms: number) => Promise<void>
  allowedRedirectOrigins: string[]
}

const ACTIVATION_ATTEMPTS = 3
const ACTIVATION_RETRY_DELAYS_MS = [100, 250]

function normalizeOrigin(origin: string): string {
  return new URL(origin).origin
}

function buildRedirect(origin: string, anonymousId: string, token: string): string {
  const redirect = new URL('/', origin)
  redirect.searchParams.set('aid', anonymousId)
  redirect.searchParams.set('onboarding', token)
  return redirect.toString()
}

function readActivationStatus(value: unknown): LandingOnboardingStartStatus {
  if (!value || typeof value !== 'object' || !('status' in value)) {
    throw new Error('invalid_activation_status')
  }
  const status = (value as { status?: unknown }).status
  if (status !== 'accepted' && status !== 'waitlisted') {
    throw new Error('invalid_activation_status')
  }
  return status
}

export async function startLandingOnboarding(
  input: LandingOnboardingStartInput,
  deps: LandingOnboardingStartDeps,
): Promise<{ status: LandingOnboardingStartStatus }> {
  const redirectOrigin = normalizeOrigin(input.redirectOrigin)
  const allowedOrigins = deps.allowedRedirectOrigins.map(normalizeOrigin)
  if (!allowedOrigins.includes(redirectOrigin)) {
    throw new Error('invalid_redirect_origin')
  }

  const email = input.email.trim().toLowerCase()
  const token = await deps.prepare({
    email,
    draft: input.draft,
    termsVersion: input.termsVersion,
    privacyVersion: input.privacyVersion,
    anonymousId: input.anonymousId,
    sessionId: input.sessionId?.trim() || null,
  })

  await deps.sendMagicLink({
    email,
    redirectTo: buildRedirect(redirectOrigin, input.anonymousId, token),
  })

  let lastError: unknown
  for (let attempt = 0; attempt < ACTIVATION_ATTEMPTS; attempt += 1) {
    let activation: unknown
    try {
      activation = await deps.activate(token)
    } catch (error) {
      lastError = error
      if (attempt < ACTIVATION_ATTEMPTS - 1) {
        await deps.sleep(ACTIVATION_RETRY_DELAYS_MS[attempt] ?? 250)
      }
      continue
    }

    return { status: readActivationStatus(activation) }
  }

  throw lastError instanceof Error ? lastError : new Error('activation_failed')
}
