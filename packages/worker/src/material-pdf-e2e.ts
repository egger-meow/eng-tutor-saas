import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { syntheticWeekOne } from '@paper-english/generator'
import { processMaterialPdfs } from './material-pdf.js'
import type { WorkerClient } from './pipeline.js'

const url = process.env.SUPABASE_URL!
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url)) throw new Error('PDF E2E requires local Supabase')
const service = createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })
const browser = createClient(url, process.env.SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } })
const userIds: string[] = []
const paths: string[] = []
function value<R extends { data: unknown; error: { message: string } | null }>(result: R): NonNullable<R['data']> {
  if (result.error) throw new Error(result.error.message)
  if (result.data === null) throw new Error('Synthetic fixture returned no data')
  return result.data as NonNullable<R['data']>
}
try {
  const email = `pdf-e2e-${crypto.randomUUID()}@example.invalid`
  const password = `Synthetic-${crypto.randomUUID()}-9!`
  const user = value(await service.auth.admin.createUser({ email, password, email_confirm: true })).user!
  userIds.push(user.id)
  const child = value(await service.from('children').insert({ parent_id: user.id, display_name: 'Synthetic PDF E2E', grade: 7 }).select('id').single())
  const material = value(await service.from('materials').insert({ child_id: child.id,
    material_week: new Date().toISOString().slice(0, 10), revision: 1, rule_version: 'synthetic-pdf-e2e',
    input_snapshot: {}, canonical_source: syntheticWeekOne, generation_summary: {},
    student_pdf_path: `${child.id}/synthetic-missing-student.pdf`, parent_answer_pdf_path: `${child.id}/synthetic-missing-parent.pdf`,
  }).select('id').single())
  const release = Date.now() - 60_000
  value(await service.from('generation_jobs').insert({ child_id: child.id, material_id: material.id,
    material_week: new Date().toISOString().slice(0, 10), rule_version: 'synthetic-pdf-e2e',
    idempotency_key: `synthetic-pdf-${crypto.randomUUID()}`, status: 'completed', completed_at: new Date().toISOString(),
    scheduled_for: new Date(release - 72 * 3600_000).toISOString(), release_at: new Date(release).toISOString(),
    feedback_cutoff_at: new Date(release - 48 * 3600_000).toISOString(), generation_due_at: new Date(release - 24 * 3600_000).toISOString(),
  }).select('id').single())
  value(await browser.auth.signInWithPassword({ email, password }))
  const firstRequest = await browser.functions.invoke('material-pdf', { body: { materialId: material.id, kind: 'student' } })
  if (firstRequest.error) {
    const context = (firstRequest.error as { context?: Response }).context
    throw new Error(`Synthetic PDF request failed: ${context?.status} ${context ? await context.text() : firstRequest.error.message}`)
  }
  const pending = firstRequest.data
  assert.equal(pending.state, 'queued')
  const repeated = value(await browser.functions.invoke('material-pdf', { body: { materialId: material.id, kind: 'student' } }))
  assert.equal(repeated.state, 'queued')
  const artifacts = value(await service.from('material_pdf_artifacts').select('id').eq('material_id', material.id))
  assert.equal(artifacts.length, 1)
  const otherWork = value(await service.from('material_pdf_artifacts').select('id').neq('material_id', material.id).in('state', ['queued', 'rendering']))
  assert.equal(otherWork.length, 0, 'Isolated local queue is required')
  assert.deepEqual(await processMaterialPdfs(service as unknown as WorkerClient), { ready: 1, failed: 0 })
  const artifact = value(await service.from('material_pdf_artifacts').select('storage_path,byte_size,render_ms').eq('id', artifacts[0]!.id).single())
  paths.push(artifact.storage_path)
  const ready = value(await browser.functions.invoke('material-pdf', { body: { materialId: material.id, kind: 'student' } }))
  assert.equal(ready.state, 'ready')
  const downloadUrl = new URL(ready.url)
  // Local Edge runtime signs against Docker's internal Kong origin; use its host gateway for download.
  if (downloadUrl.hostname === 'kong') {
    const gateway = new URL(url)
    downloadUrl.protocol = gateway.protocol
    downloadUrl.host = gateway.host
  }
  const response = await fetch(downloadUrl)
  assert.equal(response.status, 200)
  assert.equal((await response.arrayBuffer()).byteLength, artifact.byte_size)
  const deniedAnswer = await browser.functions.invoke('material-pdf', { body: { materialId: material.id, kind: 'parent' } })
  assert.ok(deniedAnswer.error)
  const unchanged = value(await service.from('materials').select('canonical_source').eq('id', material.id).single())
  assert.deepEqual(unchanged.canonical_source, syntheticWeekOne)
  console.log(JSON.stringify({ synthetic: true, missingRecovery: true, signedDownload: true,
    idempotent: true, answerLocked: true, bytes: artifact.byte_size, renderMs: artifact.render_ms }))
} finally {
  if (paths.length) value(await service.storage.from('weekly-materials').remove(paths))
  for (const id of userIds) value(await service.auth.admin.deleteUser(id))
}
