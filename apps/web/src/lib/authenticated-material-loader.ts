import type { Material } from './materials'
import type { StudentMaterialProjection } from '../types/student-material'
import { getSupabaseClient } from './supabase'

export type OwnedMaterial = Material & { child_name: string }
export type MaterialLoadState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error' }
  | {
      status: 'ready'
      material: OwnedMaterial
      studentPdfUrl: string | null
      previewError?: boolean
      projection?: StudentMaterialProjection | null
    }

export async function loadAuthenticatedMaterial(materialId: string, userId: string): Promise<MaterialLoadState> {
  try {
    const { data, error } = await getSupabaseClient()
      .rpc('get_owned_released_material', { p_material_id: materialId })
      .maybeSingle()

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
          const recovered = await getSupabaseClient().functions.invoke('material-pdf', {
            body: { materialId, kind: 'student' },
          })
          if (!recovered.error && recovered.data?.state === 'ready' && typeof recovered.data.url === 'string') {
            studentPdfUrl = recovered.data.url
          } else {
            previewError = true
          }
        } else {
          studentPdfUrl = signedData.signedUrl
        }
      }
    } catch (storageErr) {
      console.error('Error creating student PDF preview signed URL', storageErr)
      previewError = true
    }

    let projection: StudentMaterialProjection | null = null
    try {
      const { data: projData, error: projError } = await getSupabaseClient()
        .rpc('get_student_material_projection', { p_material_id: materialId })
        .maybeSingle()

      if (!projError && projData && typeof projData === 'object' && 'student_lesson' in projData && projData.student_lesson) {
        projection = projData as StudentMaterialProjection
      }
    } catch {
      // Graceful degradation when projection RPC is unavailable
    }

    return {
      status: 'ready',
      material,
      studentPdfUrl,
      previewError,
      projection,
    }
  } catch (error) {
    console.error('Authenticated material request failed', { materialId, userId, error })
    return { status: 'error' }
  }
}
