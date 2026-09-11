import { getSupabaseClient } from './supabase'

const ONE_HOUR_MS = 60 * 60 * 1000
const userLastTouchMap = new Map<string, number>()

export async function touchParentActivity(): Promise<void> {
  try {
    const client = getSupabaseClient()
    const { data: { session } } = await client.auth.getSession()
    const userId = session?.user?.id
    if (!userId) {
      return
    }

    const now = Date.now()
    const lastTouch = userLastTouchMap.get(userId) ?? 0
    if (now - lastTouch < ONE_HOUR_MS) {
      return
    }

    const { error } = await client.rpc('touch_parent_activity')
    if (!error) {
      userLastTouchMap.set(userId, now)
    }
  } catch {
    // Non-blocking best-effort activity signal
  }
}

export function _resetTouchTimestampForTesting(): void {
  userLastTouchMap.clear()
}
