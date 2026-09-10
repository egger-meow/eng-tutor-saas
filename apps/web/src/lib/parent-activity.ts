import { getSupabaseClient } from './supabase'

export async function touchParentActivity(): Promise<void> {
  try {
    const client = getSupabaseClient()
    await client.rpc('touch_parent_activity')
  } catch {
    // Non-blocking best-effort activity signal
  }
}
