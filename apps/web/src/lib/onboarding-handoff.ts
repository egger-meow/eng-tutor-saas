import { getSupabaseClient } from './supabase'

const MAX_HANDOFF_TOKEN_LENGTH = 256
const ADDITIONAL_CHILD_CONFIRMATION_REQUIRED = 'ADDITIONAL_CHILD_CONFIRMATION_REQUIRED'
const FINALIZE_ERROR = '孩子資料還在，帳號連結目前尚未完成。請重新整理再試一次。'
const CONFIRM_ADDITIONAL_CHILD_ERROR = '目前無法新增孩子，請稍後再試。'
const DISCARD_PENDING_ERROR = '目前無法返回原本孩子資料，請稍後再試。'

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

export async function finalizePendingOnboarding(token: string): Promise<FinalizePendingOnboardingResult> {
  const cleanToken = cleanOnboardingToken(token)
  const { data, error } = await getSupabaseClient().rpc('finalize_pending_onboarding', { p_token: cleanToken })
  if (isAdditionalChildConfirmationRequired(error)) {
    return { status: 'additional_child_confirmation_required' }
  }
  if (error) throw new Error(FINALIZE_ERROR)
  if (typeof data !== 'string' || !data.trim()) throw new Error(FINALIZE_ERROR)
  return { status: 'created', childId: data }
}

export async function confirmAdditionalChildOnboarding(token: string): Promise<string> {
  const cleanToken = cleanOnboardingToken(token)
  const { data, error } = await getSupabaseClient().rpc('confirm_additional_child_onboarding', { p_token: cleanToken })
  if (error) throw new Error(CONFIRM_ADDITIONAL_CHILD_ERROR)
  if (typeof data !== 'string' || !data.trim()) throw new Error(CONFIRM_ADDITIONAL_CHILD_ERROR)
  return data
}

export async function discardPendingOnboarding(token: string): Promise<void> {
  const cleanToken = cleanOnboardingToken(token)
  const { error } = await getSupabaseClient().rpc('discard_pending_onboarding', { p_token: cleanToken })
  if (error) throw new Error(DISCARD_PENDING_ERROR)
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
