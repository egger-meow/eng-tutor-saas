import { legalConfig } from './config'
import type { ProfileDraft } from './profile-form'
import { getSupabaseClient } from './supabase'

const MAX_HANDOFF_TOKEN_LENGTH = 256
const ADDITIONAL_CHILD_CONFIRMATION_REQUIRED = 'ADDITIONAL_CHILD_CONFIRMATION_REQUIRED'

export type FinalizePendingOnboardingResult =
  | { status: 'created'; childId: string }
  | { status: 'additional_child_confirmation_required' }

function cleanOnboardingToken(token: string): string {
  const cleanToken = token.trim()
  if (!cleanToken || cleanToken.length > MAX_HANDOFF_TOKEN_LENGTH) throw new Error('設定連結無效。')
  return cleanToken
}

function isAdditionalChildConfirmationRequired(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const message = 'message' in error && typeof error.message === 'string' ? error.message : ''
  return message.includes(ADDITIONAL_CHILD_CONFIRMATION_REQUIRED)
}

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

export async function finalizePendingOnboarding(token: string): Promise<FinalizePendingOnboardingResult> {
  const cleanToken = cleanOnboardingToken(token)
  const { data, error } = await getSupabaseClient().rpc('finalize_pending_onboarding', { p_token: cleanToken })
  if (isAdditionalChildConfirmationRequired(error)) {
    return { status: 'additional_child_confirmation_required' }
  }
  if (error) throw error
  if (typeof data !== 'string' || !data.trim()) throw new Error('無法完成孩子設定，請稍後再試。')
  return { status: 'created', childId: data }
}

export async function confirmAdditionalChildOnboarding(token: string): Promise<string> {
  const cleanToken = cleanOnboardingToken(token)
  const { data, error } = await getSupabaseClient().rpc('confirm_additional_child_onboarding', { p_token: cleanToken })
  if (error) throw error
  if (typeof data !== 'string' || !data.trim()) throw new Error('無法新增孩子，請稍後再試。')
  return data
}

export async function discardPendingOnboarding(token: string): Promise<void> {
  const cleanToken = cleanOnboardingToken(token)
  const { error } = await getSupabaseClient().rpc('discard_pending_onboarding', { p_token: cleanToken })
  if (error) throw error
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
