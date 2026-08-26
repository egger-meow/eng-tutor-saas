import { getSupabaseClient } from './supabase'
import { legalConfig } from './config'

const PENDING_LEGAL_KEY = 'pe_pending_legal_acceptance'
const PENDING_EXPIRY_MS = 2 * 60 * 60 * 1000 // 2 hours TTL

export type PendingLegalAcceptance = {
  termsVersion: string
  privacyVersion: string
  expiresAt: number
}

let inMemoryPendingStore: string | null = null

function getSessionStorageSafe(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const storage = window.sessionStorage
      const testKey = '__test_session__'
      storage.setItem(testKey, '1')
      storage.removeItem(testKey)
      return storage
    }
  } catch {
    // In restricted environments, fallback to in-memory store
  }
  return null
}

/**
 * Persists a short-lived pending legal acceptance marker triggered by explicit user submit on AuthPanel.
 * Stored narrowly in sessionStorage with in-memory fallback, 2h TTL, and zero personal/child data.
 */
export function recordPendingLegalAcceptance(
  termsVersion: string = legalConfig.termsVersion,
  privacyVersion: string = legalConfig.privacyVersion
): void {
  const payload: PendingLegalAcceptance = {
    termsVersion,
    privacyVersion,
    expiresAt: Date.now() + PENDING_EXPIRY_MS,
  }
  const serialized = JSON.stringify(payload)
  inMemoryPendingStore = serialized

  const session = getSessionStorageSafe()
  if (session) {
    try {
      session.setItem(PENDING_LEGAL_KEY, serialized)
    } catch {}
  }
}

/**
 * Retrieves the pending legal acceptance marker if valid and not expired.
 */
export function getPendingLegalAcceptance(): PendingLegalAcceptance | null {
  const session = getSessionStorageSafe()
  const raw = (session && session.getItem(PENDING_LEGAL_KEY)) || inMemoryPendingStore
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as PendingLegalAcceptance
    if (
      typeof parsed?.termsVersion === 'string' &&
      typeof parsed?.privacyVersion === 'string' &&
      typeof parsed?.expiresAt === 'number'
    ) {
      if (Date.now() <= parsed.expiresAt) {
        return parsed
      }
    }
  } catch {
    // Malformed JSON
  }

  // Clear expired/invalid marker
  clearPendingLegalAcceptance()
  return null
}

/**
 * Clears pending legal acceptance marker from storage.
 */
export function clearPendingLegalAcceptance(): void {
  inMemoryPendingStore = null
  const session = getSessionStorageSafe()
  if (session) {
    try {
      session.removeItem(PENDING_LEGAL_KEY)
    } catch {}
  }
}

/**
 * Flushes pending legal acceptance only if a valid pending marker exists.
 * Does NOT call RPC on normal session reloads, token refreshes, or page loads without a pending marker.
 */
export async function flushPendingLegalAcceptance(): Promise<{
  attempted: boolean
  success: boolean
  error?: string
}> {
  const pending = getPendingLegalAcceptance()
  if (!pending) {
    return { attempted: false, success: true }
  }

  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.rpc('accept_legal_terms', {
      p_terms_version: pending.termsVersion,
      p_privacy_version: pending.privacyVersion,
    })

    if (error) {
      console.warn('Legal terms acceptance RPC failed; retaining pending marker for retry:', error.message)
      return { attempted: true, success: false, error: error.message }
    }

    clearPendingLegalAcceptance()
    return { attempted: true, success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.warn('Unexpected error while recording legal acceptance:', msg)
    return { attempted: true, success: false, error: msg }
  }
}

export async function acceptCurrentTermsVersion(): Promise<void> {
  const { error } = await getSupabaseClient().rpc('accept_current_terms', {
    p_terms_version: legalConfig.termsVersion,
  })
  if (error) throw error
}
