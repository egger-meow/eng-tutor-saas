import { getSupabaseClient } from './supabase'

const ONE_HOUR_MS = 60 * 60 * 1000
let lastTouchTimestamp = 0

export async function touchParentActivity(): Promise<void> {
  const now = Date.now()
  if (now - lastTouchTimestamp < ONE_HOUR_MS) {
    return
  }

  try {
    const client = getSupabaseClient()
    await client.rpc('touch_parent_activity')
    lastTouchTimestamp = now
  } catch {
    // Non-blocking best-effort activity signal
  }
}

export function _resetTouchTimestampForTesting(): void {
  lastTouchTimestamp = 0
}
