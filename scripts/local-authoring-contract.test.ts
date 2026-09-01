import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

describe('local production authoring operational contract', () => {
  it('uses a local mutex and Task Scheduler overlap protection', async () => {
    const launcher = await readFile(resolve(root, 'scripts/run-production-authoring.ps1'), 'utf8')
    const installer = await readFile(resolve(root, 'scripts/install-production-authoring-task.ps1'), 'utf8')
    expect(launcher).toContain("Local\\PaperEnglishProductionAuthoring")
    expect(launcher).toContain('WaitOne(0)')
    expect(installer).toContain('-MultipleInstances IgnoreNew')
    expect(installer).toContain('-WakeToRun')
    expect(installer).toContain('-StartWhenAvailable')
  })

  it('cuts over pg_cron before exposing narrow service-role bridges', async () => {
    const migration = await readFile(resolve(root, 'supabase/migrations/20260901050000_local_codex_authoring_bridge.sql'), 'utf8')
    expect(migration).toContain("cron.unschedule(existing_job.jobid)")
    expect(migration).not.toContain('cron.schedule(')
    expect(migration).toContain('worker_claim_local_authoring_batch')
    expect(migration).toContain('worker_submit_local_curriculum_package')
    expect(migration).toContain('worker_local_curriculum_submission_status')
    expect(migration).toContain('worker_release_local_unsubmitted_claim')
    expect(migration).toContain('grant execute on function public.worker_claim_local_authoring_batch(text) to service_role')
  })

  it('keeps private runtime data and logs out of Git', async () => {
    const ignore = await readFile(resolve(root, '.gitignore'), 'utf8')
    expect(ignore).toContain('.runtime/private-generation/')
    expect(ignore).toContain('.runtime/logs/')
  })
})
