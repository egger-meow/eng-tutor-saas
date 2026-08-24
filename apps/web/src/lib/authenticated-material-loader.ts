import type { Material } from './materials'
import { getSupabaseClient } from './supabase'

export type OwnedMaterial = Material & { child_name: string }
export type MaterialLoadState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'ready'; material: OwnedMaterial }

export async function loadAuthenticatedMaterial(materialId: string, userId: string): Promise<MaterialLoadState> {
  try {
    const { data, error } = await getSupabaseClient().rpc('get_owned_released_material', { p_material_id: materialId }).maybeSingle()
    if (error) {
      console.error('Failed to load authenticated material', {
        materialId,
        userId,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      return { status: 'error' }
    }
    return data ? { status: 'ready', material: data as OwnedMaterial } : { status: 'not-found' }
  } catch (error) {
    console.error('Authenticated material request failed', { materialId, userId, error })
    return { status: 'error' }
  }
}
