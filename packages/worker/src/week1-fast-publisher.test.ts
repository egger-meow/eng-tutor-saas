import { describe, expect, it, vi } from 'vitest'
import type { CurriculumPackage } from '@paper-english/generator'
import type { WorkerClient } from './pipeline.js'
import { processWeek1FastSubmissions } from './week1-fast-publisher.js'
import { fixture } from './test-support/release-fixture.js'

type RpcResponse = { data: unknown; error: { message: string } | null }
type CompletionBehavior = 'commit' | 'commit_then_lose_response' | 'reject_before_commit'

/**
 * In-memory model of the durable state touched by the Week 1 publisher. The fail RPC mirrors the SQL
 * guard (status = 'processing' AND processor_id = caller), which is what makes it a safe arbiter.
 */
function createWorld(options: {
  completion: CompletionBehavior
  arbiter?: 'normal' | 'throws'
  durableRead?: 'normal' | 'fails' | 'absent'
  committedPaths?: { student: string; parent: string }
  submissions?: number
}) {
  const { pkg, contract } = fixture('current')
  const childId = pkg.metadata.childId as string
  const jobIds = Array.from({ length: options.submissions ?? 1 }, (_, index) => index === 0 ? pkg.metadata.jobId as string : `${pkg.metadata.jobId}-${index}`)
  const packages = new Map<string, any>(jobIds.map((jobId) => {
    const copy = structuredClone(pkg)
    copy.metadata.jobId = jobId
    return [jobId, copy]
  }))
  const submissionStatus = new Map<string, string>(jobIds.map((jobId) => [jobId, 'processing']))
  const jobs = new Map<string, { status: string; material_id: string | null }>(jobIds.map((jobId) => [jobId, { status: 'claimed', material_id: null }]))
  const materials = new Map<string, { id: string; student_pdf_path: string; parent_answer_pdf_path: string }>()
  const objects = new Set<string>()
  const removals: string[][] = []
  const failCalls: Record<string, unknown>[] = []
  const observationCalls: Record<string, unknown>[] = []

  const rpc = vi.fn(async (name: string, args: Record<string, unknown> = {}): Promise<RpcResponse> => {
    if (name === 'worker_claim_week1_fast_submissions') {
      return {
        data: jobIds.map((jobId) => ({ job_id: jobId, authoring_attempt: 1, generation_worker_id: 'worker-test', canonical_source: packages.get(jobId) })),
        error: null,
      }
    }
    if (name === 'worker_generation_context') {
      const jobId = args.job_id as string
      return {
        data: { job: { id: jobId, childId, materialWeek: '2026-08-18', ruleVersion: 'weekly-material/2.0.0' }, targetReleaseId: contract.releaseId, activeAuthoringContract: contract },
        error: null,
      }
    }
    if (name === 'worker_quality_trends') return { data: [], error: null }
    if (name === 'worker_complete_week1_fast_submission') {
      const jobId = args.p_job_id as string
      if (options.completion === 'reject_before_commit') return { data: null, error: { message: 'active Week 1 fast publisher lease is missing' } }
      const materialId = `material-${jobId}`
      const committedPaths = options.committedPaths ?? { student: args.p_student_pdf_path as string, parent: args.p_parent_answer_pdf_path as string }
      materials.set(materialId, { id: materialId, student_pdf_path: committedPaths.student, parent_answer_pdf_path: committedPaths.parent })
      jobs.set(jobId, { status: 'completed', material_id: materialId })
      submissionStatus.set(jobId, 'completed')
      if (options.completion === 'commit_then_lose_response') throw new TypeError('fetch failed: socket hang up')
      return { data: materialId, error: null }
    }
    if (name === 'worker_fail_week1_fast_submission') {
      failCalls.push(args)
      if (options.arbiter === 'throws') throw new TypeError('fetch failed: network unreachable')
      const jobId = args.p_job_id as string
      if (submissionStatus.get(jobId) !== 'processing' || args.p_processor_id !== 'processor-test') return { data: false, error: null }
      submissionStatus.set(jobId, args.p_outcome as string)
      return { data: true, error: null }
    }
    if (name === 'worker_record_curriculum_observations') {
      observationCalls.push(args)
      return { data: true, error: null }
    }
    return { data: true, error: null }
  })

  const storage = {
    upload: vi.fn(async (path: string) => {
      if (objects.has(path)) return { data: null, error: { message: 'The resource already exists' } }
      objects.add(path)
      return { data: {}, error: null }
    }),
    download: vi.fn(async () => ({ data: null, error: { message: 'not found' } })),
    remove: vi.fn(async (paths: string[]) => {
      removals.push(paths)
      paths.forEach((path) => objects.delete(path))
      return { data: {}, error: null }
    }),
  }

  const from = (table: string) => ({
    select: () => ({
      eq: (_column: string, value: string) => ({
        maybeSingle: async () => {
          if (options.durableRead === 'fails') return { data: null, error: { message: 'connection refused' } }
          if (table === 'generation_jobs') return { data: jobs.get(value) ?? null, error: null }
          if (table === 'materials') return { data: materials.get(value) ?? null, error: null }
          return { data: null, error: { message: `unexpected table ${table}` } }
        },
      }),
    }),
  })

  const client = {
    rpc,
    storage: { from: () => storage },
    ...(options.durableRead === 'absent' ? {} : { from }),
  } as unknown as WorkerClient

  const render = vi.fn(async (_pkg: CurriculumPackage) => ({ student: new Uint8Array([1]), parentAnswer: new Uint8Array([2]) }))
  const inspect = async () => {
    const item = { pageCount: 1, pageTexts: ['ok'], text: 'ok', title: 'ok', layoutFingerprint: 'ok' }
    return { student: item, parentAnswer: item }
  }
  const paths = (jobId: string) => ({ student: `${childId}/${jobId}/student.pdf`, parent: `${childId}/${jobId}/parent-answer.pdf` })

  return { client, rpc, storage, render, inspect, removals, failCalls, observationCalls, objects, jobs, materials, submissionStatus, jobIds, paths }
}

async function publish(world: ReturnType<typeof createWorld>, limit = 1) {
  return processWeek1FastSubmissions(world.client, 'processor-test', limit, { render: world.render, inspect: world.inspect })
}

describe('Week 1 Fast Publisher completion boundary', () => {
  it('publishes normally and records observations once', async () => {
    const world = createWorld({ completion: 'commit' })
    const [result] = await publish(world)
    expect(result).toMatchObject({ status: 'completed', materialId: `material-${world.jobIds[0]}` })
    expect(result?.reconciled).toBeUndefined()
    expect(world.removals).toEqual([])
    expect(world.observationCalls).toHaveLength(1)
  })

  it('keeps committed PDFs and reports completion when the response is lost after commit', async () => {
    const world = createWorld({ completion: 'commit_then_lose_response' })
    const jobId = world.jobIds[0]!
    const [result] = await publish(world)

    expect(world.storage.remove).not.toHaveBeenCalled()
    expect(world.objects.has(world.paths(jobId).student)).toBe(true)
    expect(world.objects.has(world.paths(jobId).parent)).toBe(true)
    expect(result).toMatchObject({ status: 'completed', materialId: `material-${jobId}`, reconciled: true })
    // The arbiter could not overwrite the committed outcome.
    expect(world.submissionStatus.get(jobId)).toBe('completed')
    expect(world.jobs.get(jobId)).toEqual({ status: 'completed', material_id: `material-${jobId}` })
    expect(world.observationCalls).toHaveLength(1)
  })

  it('records a retryable technical failure without deleting artifacts when completion did not commit', async () => {
    const world = createWorld({ completion: 'reject_before_commit' })
    const jobId = world.jobIds[0]!
    const [result] = await publish(world)

    expect(world.storage.remove).not.toHaveBeenCalled()
    expect(result).toMatchObject({ status: 'technical_failed', errorCode: 'COMPLETION_RPC_FAILED', stage: 'db_completion' })
    expect(world.submissionStatus.get(jobId)).toBe('technical_failed')
    expect(world.failCalls).toHaveLength(1)
  })

  it('reports an unknown outcome without deleting or throwing when the arbiter is unreachable, and continues the batch', async () => {
    const world = createWorld({ completion: 'commit_then_lose_response', arbiter: 'throws', submissions: 2 })
    const results = await publish(world, 2)

    expect(world.storage.remove).not.toHaveBeenCalled()
    expect(results).toHaveLength(2)
    for (const result of results) {
      expect(result).toMatchObject({ status: 'technical_failed', errorCode: 'COMPLETION_OUTCOME_UNKNOWN', stage: 'db_completion' })
    }
  })

  it('reports an unknown outcome when durable read-back fails after the arbiter lost', async () => {
    const world = createWorld({ completion: 'commit_then_lose_response', durableRead: 'fails' })
    const [result] = await publish(world)
    expect(world.storage.remove).not.toHaveBeenCalled()
    expect(result).toMatchObject({ status: 'technical_failed', errorCode: 'COMPLETION_OUTCOME_UNKNOWN' })
  })

  it('reports an unknown outcome when the client cannot read durable state', async () => {
    const world = createWorld({ completion: 'commit_then_lose_response', durableRead: 'absent' })
    const [result] = await publish(world)
    expect(world.storage.remove).not.toHaveBeenCalled()
    expect(result).toMatchObject({ status: 'technical_failed', errorCode: 'COMPLETION_OUTCOME_UNKNOWN' })
  })

  it('reports a conflict when the committed material references different artifacts', async () => {
    const world = createWorld({
      completion: 'commit_then_lose_response',
      committedPaths: { student: 'other/student.pdf', parent: 'other/parent-answer.pdf' },
    })
    const [result] = await publish(world)
    expect(world.storage.remove).not.toHaveBeenCalled()
    expect(result).toMatchObject({ status: 'technical_failed', errorCode: 'COMPLETION_OUTCOME_CONFLICT' })
    expect(world.observationCalls).toHaveLength(0)
  })

  it('still removes only newly created artifacts when a failure happens before completion starts', async () => {
    const world = createWorld({ completion: 'commit' })
    const jobId = world.jobIds[0]!
    const [result] = await processWeek1FastSubmissions(world.client, 'processor-test', 1, {
      render: world.render,
      inspect: async () => { throw new Error('inspection crashed') },
    })
    expect(result).toMatchObject({ status: 'technical_failed', errorCode: 'PDF_INSPECTION_FAILED' })
    expect(world.storage.upload).not.toHaveBeenCalled()
    expect(world.removals).toEqual([])
    expect(world.rpc).not.toHaveBeenCalledWith('worker_complete_week1_fast_submission', expect.anything())
    expect(world.submissionStatus.get(jobId)).toBe('technical_failed')
  })

  it('removes artifacts it created when the second upload fails before completion', async () => {
    const world = createWorld({ completion: 'commit' })
    const jobId = world.jobIds[0]!
    world.storage.upload.mockImplementation(async (path: string) => {
      if (path.endsWith('parent-answer.pdf')) return { data: null, error: { message: 'storage unavailable' } }
      world.objects.add(path)
      return { data: {}, error: null }
    })
    const [result] = await publish(world)
    expect(result).toMatchObject({ status: 'technical_failed', errorCode: 'STORAGE_UPLOAD_FAILED' })
    expect(world.removals).toEqual([[world.paths(jobId).student]])
    expect(world.rpc).not.toHaveBeenCalledWith('worker_complete_week1_fast_submission', expect.anything())
  })
})
