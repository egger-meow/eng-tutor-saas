import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../../..')

async function source(path: string): Promise<string> {
  return readFile(resolve(root, path), 'utf8')
}

describe('Week 1 Fast Lane production contract', () => {
  it('defines private wake/publish outboxes and safe progress token storage', async () => {
    const migration = await source('supabase/migrations/20260905220000_week1_fast_lane.sql')
    expect(migration).toContain('private_generation.week1_wake_outbox')
    expect(migration).toContain('private_generation.week1_publish_outbox')
    expect(migration).toContain('private_generation.week1_progress_tokens')
    expect(migration).toContain('token_hash')
    expect(migration).toContain('expires_at')
    expect(migration).toContain('revoke all on table private_generation.week1_wake_outbox from public, anon, authenticated')
    expect(migration).toContain('revoke all on table private_generation.week1_publish_outbox from public, anon, authenticated')
    expect(migration).toContain('revoke all on table private_generation.week1_progress_tokens from public, anon, authenticated')
  })

  it('pins a dedicated Week 1-only authoring worker and recovery path', async () => {
    const migration = await source('supabase/migrations/20260905220000_week1_fast_lane.sql')
    const bridge = await source('supabase/functions/authoring-bridge/index.ts')

    expect(migration).toContain("worker_id <> 'chatgpt-week1-fast'")
    expect(migration).toContain('public.worker_start_week1_fast_batch')
    expect(migration).toContain('public.worker_recover_week1_fast_batch')
    expect(migration).toContain('source_material_id is null')
    expect(bridge).toContain("PINNED_WEEK1_FAST_WORKER_ID = 'chatgpt-week1-fast'")
    expect(bridge).toContain("path === '/week1/start'")
    expect(bridge).toContain("path === '/week1/batch'")
  })

  it('uses GitHub only as a payload-free doorbell', async () => {
    const dispatcher = await source('supabase/functions/week1-fast-dispatch/index.ts')
    expect(dispatcher).toContain("event_type: 'week1-fast-publish'")
    expect(dispatcher).toContain('client_payload: {}')
    expect(dispatcher).toContain('week1-wake:v1:')
    expect(dispatcher).not.toMatch(/client_payload:\s*\{[^}]*job/iu)
    expect(dispatcher).not.toMatch(/client_payload:\s*\{[^}]*child/iu)
    expect(dispatcher).not.toMatch(/client_payload:\s*\{[^}]*package/iu)
  })

  it('publishes Week 1 without the normal Finisher semantic audit', async () => {
    const publisher = await source('packages/worker/src/week1-fast-publisher.ts')
    const workflow = await source('.github/workflows/publish-week1-fast.yml')

    expect(publisher).not.toContain('auditCurriculumPackageForFinisher')
    expect(publisher).toContain('validateCurriculumPackageForFinisher')
    expect(publisher).toContain('renderCurriculumPackageBytes')
    expect(publisher).toContain('inspectCurriculumPdfPair')
    expect(publisher).toContain("rpc('worker_complete_week1_fast_submission'")
    expect(workflow).toContain('week1-fast-publish')
    expect(workflow).toContain('publish-week1-fast')
  })

  it('exposes only five parent-safe progress stages', async () => {
    const progress = await source('apps/web/src/lib/week1-progress.ts')
    const component = await source('apps/web/src/components/materials/Week1FastProgress.tsx')

    for (const stage of ['received', 'queued', 'authoring', 'publishing', 'ready']) {
      expect(progress).toContain(`'${stage}'`)
    }
    expect(component).toContain('資料已收到')
    expect(component).toContain('已排入教材製作')
    expect(component).toContain('正在製作內容')
    expect(component).toContain('品質檢查與排版')
    expect(component).toContain('教材可以下載')
    expect(component).not.toMatch(/\b\d{1,3}%\b/u)
  })

  it('removes the parent-facing next-day Week 1 promise', async () => {
    const landing = await source('apps/web/src/routes/LandingPage.tsx')
    expect(landing).toContain('完成孩子資料後會立即開始製作')
    expect(landing).not.toContain('第一份專屬教材預計於隔天開放下載')
  })
})
