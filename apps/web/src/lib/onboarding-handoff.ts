import { legalConfig } from './config'
import type { ProfileDraft } from './profile-form'
import { getSupabaseClient } from './supabase'

const MAX_HANDOFF_TOKEN_LENGTH = 256

export async function createPendingOnboarding(email: string, draft: ProfileDraft): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) throw new Error('請輸入 Email。')

  const { data, error } = await getSupabaseClient().rpc('create_pending_onboarding', {
    p_email: normalizedEmail,
    p_draft: draft,
    p_terms_version: legalConfig.termsVersion,
    p_privacy_version: legalConfig.privacyVersion,
  })
  if (error) throw error
  if (typeof data !== 'string' || !data.trim()) throw new Error('無法建立安全設定連結，請稍後再試。')
  return data
}

export async function finalizePendingOnboarding(token: string): Promise<string> {
  const cleanToken = token.trim()
  if (!cleanToken || cleanToken.length > MAX_HANDOFF_TOKEN_LENGTH) throw new Error('設定連結無效。')

  const { data, error } = await getSupabaseClient().rpc('finalize_pending_onboarding', { p_token: cleanToken })
  if (error) throw error
  if (typeof data !== 'string' || !data.trim()) throw new Error('無法完成孩子設定，請稍後再試。')
  return data
}

export function readOnboardingToken(search?: string): string | null {
  const source = search ?? (typeof window !== 'undefined' ? window.location.search : '')
  const value = new URLSearchParams(source).get('onboarding')?.trim() ?? ''
  if (!value || value.length > MAX_HANDOFF_TOKEN_LENGTH) return null
  return value
}

export function clearOnboardingTokenFromUrl(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (!url.searchParams.has('onboarding')) return
  url.searchParams.delete('onboarding')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}
