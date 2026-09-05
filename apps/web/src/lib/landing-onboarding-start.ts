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

const LANDING_ONBOARDING_SEND_ERROR = '目前無法送出登入信。請稍後再試；如果你剛剛已收到紙屬英文的 Email，請直接使用最新一封登入信，不用再次送出。'

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

  if (error) throw new Error(LANDING_ONBOARDING_SEND_ERROR)

  const status = data && typeof data === 'object' && 'status' in data
    ? (data as { status?: unknown }).status
    : null

  if (status !== 'accepted' && status !== 'waitlisted') {
    throw new Error(LANDING_ONBOARDING_SEND_ERROR)
  }

  return { status }
}
