import { CURRENT_PDF_RENDERER_VERSION, parseWeeklyLesson, type CurriculumPackage } from '@paper-english/generator'
import { inspectPdf, renderCurriculumPackageBytes, renderLessonPdfBytes } from '@paper-english/pdf'
import type { WorkerClient } from './pipeline.js'

type PdfClaim = { id: string; leaseToken: string; path: string; kind: 'student' | 'parent'; canonicalSource: unknown }

export async function renderMaterialPdf(source: unknown, kind: 'student' | 'parent'): Promise<Uint8Array> {
  // Read-only replay of already-published source; never rerun today's authoring quality gates against history.
  const isCurriculum = source !== null && typeof source === 'object' && 'studentLesson' in source
  const pair = isCurriculum
    ? await renderCurriculumPackageBytes(source as CurriculumPackage)
    : await renderLessonPdfBytes(parseWeeklyLesson(source))
  const bytes = kind === 'student' ? pair.student : pair.parentAnswer
  await inspectPdf(bytes, kind)
  return bytes
}

export async function processMaterialPdfs(client: WorkerClient, limit = 5,
  render = renderMaterialPdf): Promise<{ ready: number; failed: number }> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new Error('PDF limit must be an integer from 1 to 10')
  const result = { ready: 0, failed: 0 }
  for (let index = 0; index < limit; index += 1) {
    const claimed = await client.rpc('claim_material_pdf', { p_renderer: CURRENT_PDF_RENDERER_VERSION })
    if (claimed.error) throw new Error('PDF claim failed')
    const claim = claimed.data as PdfClaim | null
    if (!claim) break
    try {
      const started = performance.now()
      const bytes = await render(claim.canonicalSource, claim.kind)
      const uploaded = await client.storage.from('weekly-materials').upload(claim.path, bytes, { contentType: 'application/pdf', upsert: false })
      if (uploaded.error) throw new Error('PDF upload failed')
      const completed = await client.rpc('finish_material_pdf', {
        p_id: claim.id, p_lease: claim.leaseToken, p_path: claim.path,
        p_bytes: bytes.byteLength, p_render_ms: Math.round(performance.now() - started),
      })
      if (completed.error || completed.data !== true) throw new Error('PDF completion lease expired')
      result.ready += 1
    } catch {
      const failed = await client.rpc('fail_material_pdf', { p_id: claim.id, p_lease: claim.leaseToken })
      if (failed.error) throw new Error('PDF failure recording failed')
      result.failed += 1
    }
  }
  return result
}
