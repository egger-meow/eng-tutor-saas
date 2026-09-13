import type { Material } from './materials'
import { getSupabaseClient } from './supabase'

export type OwnedMaterial = Material & { child_name: string }
export type MaterialLoadState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'ready'; material: OwnedMaterial; studentPdfUrl: string | null; previewError?: boolean }

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
    if (!data) return { status: 'not-found' }

    const material = data as OwnedMaterial
    let studentPdfUrl: string | null = null
    let previewError = false

    try {
      const storageClient = getSupabaseClient().storage
      if (storageClient?.from) {
        const { data: signedData, error: signedError } = await storageClient
          .from('weekly-materials')
          .createSignedUrl(material.student_pdf_path, 1800)
        if (signedError || !signedData?.signedUrl) {
          console.error('Failed to create student PDF preview signed URL', signedError)
          previewError = true
        } else {
          studentPdfUrl = signedData.signedUrl
        }
      }
    } catch (storageErr) {
      console.error('Error creating student PDF preview signed URL', storageErr)
      previewError = true
    }

    return {
      status: 'ready',
      material,
      studentPdfUrl,
      previewError,
    }
  } catch (error) {
    console.error('Authenticated material request failed', { materialId, userId, error })
    return { status: 'error' }
  }
}
