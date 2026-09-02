import { legalConfig } from './config'
import type { ProfileDraft } from './profile-form'
import { getSupabaseClient } from './supabase'

export type LandingOnboardingStartStatus = 'accepted' | 'waitlisted'

export interface StartLandingOnboardingInput {
  email: string
  draft: ProfileDraft
  anonymousId: string
  sessionId?: string | null
  redirectOrigin: string
}

export type StartLandingOnboardingResult = {
  status: LandingOnboardingStartStatus
}

export async function startLandingOnboarding(
  input: StartLandingOnboardingInput,
): Promise<StartLandingOnboardingResult> {
  const normalizedEmail = input.email.trim().toLowerCase()
  if (!normalizedEmail) throw new Error('請輸入 Email。')

  const { data, error } = await getSupabaseClient().functions.invoke('start-landing-onboarding', {
    body: {
      email: normalizedEmail,
      draft: input.draft,
      termsVersion: legalConfig.termsVersion,
      privacyVersion: legalConfig.privacyVersion,
      anonymousId: input.anonymousId,
      sessionId: input.sessionId?.trim() || null,
      redirectOrigin: input.redirectOrigin,
    },
  })

  if (error) throw error

  const status = data && typeof data === 'object' && 'status' in data
    ? (data as { status?: unknown }).status
    : null

  if (status !== 'accepted' && status !== 'waitlisted') {
    throw new Error('無法開始第一週教材，請稍後再試。')
  }

  return { status }
}
