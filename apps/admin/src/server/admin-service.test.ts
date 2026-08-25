import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AdminService,
  classifyQualityEra,
  CURRENT_RELEASE_ID,
  CURRENT_ENGINE_VERSION,
  CURRENT_SCHEMA_VERSION,
  CURRENT_PROMPT_VERSION,
  CURRENT_ERA_TAG,
  formatEngineEraLabel,
  formatEngineVersion,
  deriveOperationsPipeline,
  OPERATIONS_MATERIALS_SELECT,
} from './admin-service.js'

function createMockSupabaseClient(
  tableData: Record<string, any[]>,
  tableErrors: Record<string, any> = {},
  rpcHandlers: Record<string, any> = {},
  storageHandlers: Record<string, any> = {}
) {
  return {
    from: (tableName: string) => {
      const error = tableErrors[tableName] || null
      const rows = tableData[tableName] || []
      const filters: Array<(row: any) => boolean> = []

      const getFilteredRows = () => {
        let result = [...rows]
        for (const f of filters) {
          result = result.filter(f)
        }
        return result
      }

      const builder: any = {
        select: () => builder,
        order: () => builder,
        limit: () => builder,
        or: () => builder,
        in: (col: string, vals: any[]) => {
          filters.push((r) => Array.isArray(vals) && vals.includes(r[col]))
          return builder
        },
        eq: (col: string, val: any) => {
          filters.push((r) => {
            if (r[col] === val) return true
            if (col.includes('.')) {
              const parts = col.split('.')
              const nested = parts.reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), r)
              return nested === val
            }
            return false
          })
          return builder
        },
        neq: (col: string, val: any) => {
          filters.push((r) => r[col] !== val)
          return builder
        },
        gte: (col: string, val: any) => {
          filters.push((r) => r[col] >= val)
          return builder
        },
        lte: (col: string, val: any) => {
          filters.push((r) => r[col] <= val)
          return builder
        },
        gt: (col: string, val: any) => {
          filters.push((r) => r[col] > val)
          return builder
        },
        lt: (col: string, val: any) => {
          filters.push((r) => r[col] < val)
          return builder
        },
        upsert: (payload: any) => {
          const items = Array.isArray(payload) ? payload : [payload]
          for (const item of items) {
            const idx = rows.findIndex((r) => (r.child_id && r.child_id === item.child_id) || (r.id && r.id === item.id))
            if (idx >= 0) {
              rows[idx] = { ...rows[idx], ...item }
            } else {
              rows.push({ ...item })
            }
          }
          return {
            select: () => ({
              single: async () => ({ data: items[0], error: null }),
              maybeSingle: async () => ({ data: items[0], error: null }),
            }),
            then: (resolve: any) => Promise.resolve({ data: items, error: null }).then(resolve),
          }
        },
        insert: (payload: any) => {
          const items = Array.isArray(payload) ? payload : [payload]
          rows.push(...items)
          return {
            select: () => ({
              single: async () => ({ data: items[0], error: null }),
              maybeSingle: async () => ({ data: items[0], error: null }),
            }),
            then: (resolve: any) => Promise.resolve({ data: items, error: null }).then(resolve),
          }
        },
        update: (payload: any) => {
          return {
            eq: (col: string, val: any) => {
              const matched = rows.filter((r) => r[col] === val)
              for (const r of matched) {
                Object.assign(r, payload)
              }
              return Promise.resolve({ data: matched, error: null })
            },
          }
        },
        delete: () => {
          return {
            eq: (col: string, val: any) => {
              const remaining = rows.filter((r) => r[col] !== val)
              rows.length = 0
              rows.push(...remaining)
              return Promise.resolve({ data: null, error: null })
            },
          }
        },
        single: async () => {
          const filtered = getFilteredRows()
          return { data: error ? null : filtered[0] || null, error }
        },
        maybeSingle: async () => {
          const filtered = getFilteredRows()
          return { data: error ? null : filtered[0] || null, error }
        },
        then: (resolve: (res: { data: any[] | null; error: any }) => void) => {
          const filtered = getFilteredRows()
          return Promise.resolve({ data: error ? null : filtered, error }).then(resolve)
        },
      }
      return builder
    },
    rpc: async (fnName: string, params: any) => {
      if (rpcHandlers[fnName]) {
        return rpcHandlers[fnName](params)
      }
      if (fnName === 'admin_get_curriculum_submissions' && tableData.curriculum_submissions) {
        return { data: tableData.curriculum_submissions, error: null }
      }
      if (fnName === 'get_enrollment_state' && tableData.enrollment_settings) {
        return { data: tableData.enrollment_settings, error: null }
      }
      if (tableData[fnName]) {
        return { data: tableData[fnName], error: null }
      }
      return { data: null, error: { message: `RPC ${fnName} not available in mock` } }
    },
    storage: {
      from: (bucketName: string) => ({
        createSignedUrl: async (path: string, expiresIn: number) => {
          if (storageHandlers.createSignedUrl) {
            return storageHandlers.createSignedUrl(bucketName, path, expiresIn)
          }
          return {
            data: { signedUrl: `https://example.supabase.co/storage/v1/signed/${bucketName}/${path}?token=mock` },
            error: null,
          }
        },
        remove: async (paths: string[]) => {
          if (storageHandlers.remove) {
            return storageHandlers.remove(bucketName, paths)
          }
          return { data: paths.map((p) => ({ name: p })), error: null }
        },
      }),
    },
  } as any
}

describe('AdminService Authoritative Truth Layer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_FROM
    delete process.env.SITE_URL
  })
  it('throws an error if no Supabase connection is configured', async () => {
    const service = new AdminService({ supabaseUrl: '', supabaseSecretKey: '' })
    expect(service.getIsConnected()).toBe(false)
    await expect(service.getOperationsOverview()).rejects.toThrow('Supabase client is not configured')
  })

  it('uses only real production materials columns in the overview select contract', () => {
    expect(OPERATIONS_MATERIALS_SELECT.split(',').map((field) => field.trim())).toEqual([
      'id', 'child_id', 'material_week', 'revision', 'rule_version', 'prompt_version',
      'generator_version', 'model_name', 'student_pdf_path', 'parent_answer_pdf_path',
      'canonical_source', 'created_at',
    ])
    expect(OPERATIONS_MATERIALS_SELECT).not.toMatch(/(?:^|,\s*)(?:release_at|released_at)(?:\s*,|$)/)
  })

  it('classifies every active production pipeline state exhaustively from the current attempt', () => {
    const now = '2026-08-24T12:00:00.000Z'
    const base = {
      child_id: 'child-1', material_week: '2026-08-24', max_attempts: 5,
      created_at: '2026-08-24T00:00:00.000Z', updated_at: '2026-08-24T01:00:00.000Z',
    }
    const jobs = [
      { ...base, id: 'pending-new', status: 'pending', attempt_count: 0 },
      { ...base, id: 'pending-retry', status: 'pending', attempt_count: 2 },
      { ...base, id: 'claimed-unsubmitted', status: 'claimed', attempt_count: 2 },
      { ...base, id: 'finisher-pending', status: 'claimed', attempt_count: 1 },
      { ...base, id: 'finisher-processing', status: 'claimed', attempt_count: 1 },
      { ...base, id: 'finisher-technical', status: 'claimed', attempt_count: 1 },
      { ...base, id: 'completed-released', status: 'completed', attempt_count: 1, release_at: '2026-08-24T10:00:00.000Z' },
      { ...base, id: 'completed-unreleased', status: 'completed', attempt_count: 1, release_at: '2026-08-25T10:00:00.000Z' },
      { ...base, id: 'quality-exhausted', status: 'failed', attempt_count: 5 },
      { ...base, id: 'quality-override', status: 'completed', attempt_count: 5, release_at: '2026-08-25T10:00:00.000Z' },
      { ...base, id: 'generation-failed', status: 'failed', attempt_count: 2 },
      { ...base, id: 'canceled', status: 'canceled', attempt_count: 0 },
    ]
    const submissions = [
      { job_id: 'pending-retry', authoring_attempt: 1, status: 'quality_rejected' },
      { job_id: 'claimed-unsubmitted', authoring_attempt: 1, status: 'quality_rejected' },
      { job_id: 'finisher-pending', authoring_attempt: 1, status: 'pending' },
      { job_id: 'finisher-processing', authoring_attempt: 1, status: 'processing' },
      { job_id: 'finisher-technical', authoring_attempt: 1, status: 'technical_failed' },
      { job_id: 'completed-released', authoring_attempt: 1, status: 'completed' },
      { job_id: 'completed-unreleased', authoring_attempt: 1, status: 'completed' },
      { job_id: 'quality-exhausted', authoring_attempt: 5, status: 'quality_rejected' },
      { job_id: 'quality-override', authoring_attempt: 5, status: 'quality_rejected' },
    ]
    const pipeline = deriveOperationsPipeline({
      jobs,
      submissions,
      overrides: [{ job_id: 'quality-override' }],
      childNames: new Map([['child-1', 'Test Child']]),
      maskName: (name) => name || 'unknown',
      now,
    })
    const ready = new Map(pipeline.readyToClaim.map((row) => [row.jobId, row.status]))
    const awaiting = new Map(pipeline.awaitingFinisher.map((row) => [row.jobId, row.status]))
    const done = new Map(pipeline.finisherDone.map((row) => [row.jobId, row.status]))
    const doneRows = new Map(pipeline.finisherDone.map((row) => [row.jobId, row]))

    expect([...ready.keys()]).toEqual(['pending-new', 'pending-retry', 'claimed-unsubmitted', 'generation-failed'])
    expect(ready.get('pending-retry')).toBe('RETRY READY')
    expect(ready.get('claimed-unsubmitted')).toBe('AUTHORING CLAIMED — AWAITING SUBMISSION')
    expect([...awaiting.keys()]).toEqual(['finisher-pending', 'finisher-processing', 'finisher-technical'])
    expect(awaiting.get('finisher-technical')).toBe('TECHNICAL FAILURE — RETRYABLE')
    expect(done.get('completed-released')).toBe('RELEASED')
    expect(done.get('completed-unreleased')).toBe('AWAITING RELEASE')
    expect(done.get('quality-exhausted')).toBe('QUALITY REJECTED')
    expect(done.get('quality-override')).toBe('DELIVERED WITH QUALITY OVERRIDE')
    expect(done.has('finisher-technical')).toBe(false)
    expect(pipeline.readyToClaim.length + pipeline.awaitingFinisher.length + pipeline.finisherDone.length).toBe(11)

    // Completed jobs must never be labeled retry_in_progress
    expect(doneRows.get('completed-released')?.retryState).toBe('delivered_first_try')
    expect(doneRows.get('quality-override')?.retryState).toBe('delivered_after_retry')
  })

  it('never treats generator_version as schema provenance and labels missing components unobservable', async () => {
    const service = new AdminService({ client: createMockSupabaseClient({
      children: [{ id: 'child-1', display_name: 'Test Child', is_active: true, is_internal_test: false }],
      subscriptions: [],
      generation_jobs: [],
      materials: [{
        id: 'material-1', child_id: 'child-1', material_week: '2026-08-24', revision: 1,
        rule_version: 'rules/1', prompt_version: CURRENT_PROMPT_VERSION,
        generator_version: CURRENT_SCHEMA_VERSION, model_name: 'model',
        student_pdf_path: 'child/job/student.pdf', parent_answer_pdf_path: 'child/job/parent-answer.pdf',
        canonical_source: { metadata: {} }, created_at: '2026-08-24T00:00:00.000Z',
      }],
      enrollment_settings: [{ capacity: 100, status: 'open', active_count: 0, waiting_count: 0, released_count: 0, total_demand: 0 }],
      curriculum_submissions: [],
    }) })

    const overview = await service.getOperationsOverview()
    expect(overview.engineInspector.alignmentStatus).toBe('unobservable')
    expect(overview.engineInspector.drift).toContainEqual(expect.objectContaining({
      source: 'material', id: 'material-1', component: 'schema', actual: null, status: 'unobservable',
    }))
    expect(overview.engineInspector.drift).not.toContainEqual(expect.objectContaining({
      component: 'schema', actual: CURRENT_SCHEMA_VERSION, status: 'version_drift',
    }))
    expect(overview.engineInspector.drift).toContainEqual(expect.objectContaining({
      component: 'worker', actual: null, status: 'unobservable',
    }))
  })

  it('excludes immediately previous production release (Engine 1.2.0 / Schema 2.3.0 / Prompt 2.6.0) from drift against current 1.3.0 / 2.7.0 release', async () => {
    const service = new AdminService({ client: createMockSupabaseClient({
      children: [{ id: 'child-prev', display_name: 'Previous Release Child', is_active: true, is_internal_test: false }],
      subscriptions: [],
      generation_jobs: [],
      materials: [{
        id: 'material-prev-1',
        child_id: 'child-prev',
        material_week: '2026-08-20',
        revision: 1,
        rule_version: 'rules/1',
        prompt_version: '2.6.0', // immediately previous production prompt
        generator_version: '2.3.0',
        model_name: 'model-260',
        student_pdf_path: 'child/job/student.pdf',
        parent_answer_pdf_path: 'child/job/parent-answer.pdf',
        canonical_source: {
          metadata: {
            schemaVersion: '2.3.0',
            promptVersion: '2.6.0',
            engineVersion: '1.2.0', // immediately previous engine
            rendererVersion: '1.0.0',
            workerVersion: '1.2.0',
          },
        },
        created_at: '2026-08-20T00:00:00.000Z',
      }],
      enrollment_settings: [{ capacity: 100, status: 'open', active_count: 0, waiting_count: 0, released_count: 0, total_demand: 0 }],
      curriculum_submissions: [],
    }) })

    const overview = await service.getOperationsOverview()
    // Valid artifact from immediately previous production release is historical provenance and must NOT trigger drift
    expect(overview.engineInspector.drift.some((d) => d.status === 'version_drift')).toBe(false)
    expect(overview.engineInspector.alignmentStatus).toBe('unobservable')
  })

  it('correctly triggers VERSION DRIFT when a current-release artifact incorrectly records Engine 1.2 / Prompt 2.6', async () => {
    const service = new AdminService({ client: createMockSupabaseClient({
      children: [{ id: 'child-drift', display_name: 'Drift Child', is_active: true, is_internal_test: false }],
      subscriptions: [],
      generation_jobs: [],
      materials: [{
        id: 'material-drift-1',
        child_id: 'child-drift',
        material_week: '2026-08-25',
        revision: 1,
        rule_version: 'rules/1',
        prompt_version: '2.6.0', // Incorrectly recorded prompt on current release
        generator_version: '2.3.0',
        model_name: 'model-drift',
        student_pdf_path: 'child/job/student.pdf',
        parent_answer_pdf_path: 'child/job/parent-answer.pdf',
        canonical_source: {
          metadata: {
            releaseId: CURRENT_RELEASE_ID, // Current release identity!
            schemaVersion: '2.3.0',
            promptVersion: '2.6.0', // Drifted
            engineVersion: '1.2.0', // Drifted
            rendererVersion: '1.0.0',
            workerVersion: '1.3.0',
          },
        },
        created_at: '2026-08-25T12:00:00.000Z',
      }],
      enrollment_settings: [{ capacity: 100, status: 'open', active_count: 0, waiting_count: 0, released_count: 0, total_demand: 0 }],
      curriculum_submissions: [],
    }) })

    const overview = await service.getOperationsOverview()
    // Current release artifact with drifted engine/prompt MUST trigger version_drift
    expect(overview.engineInspector.alignmentStatus).toBe('version_drift')
    expect(overview.engineInspector.drift).toContainEqual(expect.objectContaining({
      source: 'material', id: 'material-drift-1', component: 'engine', expected: CURRENT_ENGINE_VERSION, actual: '1.2.0', status: 'version_drift',
    }))
    expect(overview.engineInspector.drift).toContainEqual(expect.objectContaining({
      source: 'material', id: 'material-drift-1', component: 'prompt', expected: CURRENT_PROMPT_VERSION, actual: '2.6.0', status: 'version_drift',
    }))
  })

  it('does not label missing submission-time renderer or worker provenance as unobservable for authoring submissions', async () => {
    const service = new AdminService({ client: createMockSupabaseClient({
      children: [{ id: 'child-active', display_name: 'Active Child', is_active: true, is_internal_test: false }],
      subscriptions: [],
      generation_jobs: [{ id: 'job-active-1', child_id: 'child-active', status: 'claimed', material_week: '2026-08-25', attempt_count: 1 }],
      materials: [],
      enrollment_settings: [{ capacity: 100, status: 'open', active_count: 0, waiting_count: 0, released_count: 0, total_demand: 0 }],
      curriculum_submissions: [{
        job_id: 'job-active-1',
        authoring_attempt: 1,
        status: 'pending',
        engine_version: CURRENT_ENGINE_VERSION,
        schema_version: CURRENT_SCHEMA_VERSION,
        prompt_version: CURRENT_PROMPT_VERSION,
        quality_profile_version: '1.1.0',
        renderer_version: null, // submission time has no renderer
        worker_version: null, // submission time has no finisher worker
      }],
    }) })

    const overview = await service.getOperationsOverview()
    // Missing submission-time renderer/worker must NOT be added to drift as unobservable
    expect(overview.engineInspector.drift).toEqual([])
    expect(overview.engineInspector.alignmentStatus).toBe('aligned')
  })

  it('proves a freshly completed Engine 1.3.0 / Prompt 2.7.0 material produces a fully ALIGNED inspector', async () => {
    const service = new AdminService({ client: createMockSupabaseClient({
      children: [{ id: 'child-fresh', display_name: 'Fresh Child', is_active: true, is_internal_test: false }],
      subscriptions: [],
      generation_jobs: [{ id: 'job-fresh-1', child_id: 'child-fresh', status: 'completed', material_week: '2026-08-25', attempt_count: 1 }],
      materials: [{
        id: 'material-fresh-1',
        child_id: 'child-fresh',
        material_week: '2026-08-25',
        revision: 1,
        rule_version: 'rules/1',
        prompt_version: CURRENT_PROMPT_VERSION,
        generator_version: CURRENT_SCHEMA_VERSION,
        model_name: 'model-fresh',
        student_pdf_path: 'child/job/student.pdf',
        parent_answer_pdf_path: 'child/job/parent-answer.pdf',
        canonical_source: {
          metadata: {
            schemaVersion: CURRENT_SCHEMA_VERSION,
            promptVersion: CURRENT_PROMPT_VERSION,
            engineVersion: CURRENT_ENGINE_VERSION,
            modelQualityProfile: { qualityProfileVersion: '1.1.0' },
            rendererVersion: '1.0.0',
            workerVersion: '1.3.0',
          },
        },
        created_at: '2026-08-25T12:00:00.000Z',
      }],
      enrollment_settings: [{ capacity: 100, status: 'open', active_count: 0, waiting_count: 0, released_count: 0, total_demand: 0 }],
      curriculum_submissions: [],
    }) })

    const overview = await service.getOperationsOverview()
    expect(overview.engineInspector.alignmentStatus).toBe('aligned')
    expect(overview.engineInspector.drift).toEqual([])
  })

  it('aggregates real database rows for Operations Overview with separated Generation and Finisher queues', async () => {
    const mockClient = createMockSupabaseClient({
      children: [
        { id: 'c-1', display_name: '林大豪', is_active: true },
        { id: 'c-2', display_name: '陳小安', is_active: true },
        { id: 'c-3', display_name: '張晴晴', is_active: false },
      ],
      subscriptions: [
        { id: 'sub-1', child_id: 'c-1', status: 'active', billing_interval: 'month', plan_code: 'standard_monthly', founding_status: 'redeemed' },
        { id: 'sub-2', child_id: 'c-2', status: 'active', billing_interval: 'year', plan_code: 'standard_annual', founding_status: 'eligible' },
        { id: 'sub-3', child_id: 'c-3', status: 'trialing', billing_interval: null, plan_code: null, founding_status: 'eligible' },
      ],
      generation_jobs: [
        {
          id: 'job-1',
          child_id: 'c-1',
          material_week: '2026-08-17',
          status: 'claimed',
          claimed_by: 'worker-1',
          lease_expires_at: '2020-01-01T00:00:00Z',
          generation_due_at: '2026-08-17T00:00:00Z',
          attempt_count: 1,
        },
      ],
      materials: [
        {
          id: 'mat-1',
          child_id: 'c-1',
          material_week: '2026-08-17',
          revision: 1,
          rule_version: '2.2.0',
          model_name: 'chatgpt-work',
          student_pdf_path: 'c-1/2026-08-17_student.pdf',
          parent_answer_pdf_path: 'c-1/2026-08-17_parent.pdf',
          created_at: '2026-08-17T02:00:00Z',
        },
      ],
      enrollment_settings: [
        { capacity: 100, status: 'open', founding_limit: 30 },
      ],
      curriculum_submissions: [
        { job_id: 'job-1', authoring_attempt: 1, status: 'quality_rejected', schema_version: '2.2.0', prompt_version: '2.4.0', quality_profile: 'gemini-3.7-flash' },
        { job_id: 'job-1', authoring_attempt: 2, status: 'completed', schema_version: '2.2.0', prompt_version: '2.4.0', quality_profile: 'gemini-3.7-flash' },
      ],
    })

    const service = new AdminService({ client: mockClient })
    const overview = await service.getOperationsOverview()

    expect(overview.activeChildrenCount).toBe(2)
    expect(overview.totalChildrenCount).toBe(3)
    // Subscription Breakdown
    expect(overview.activeSubscriptionsCount).toBe(2)
    expect(overview.subscriptionBreakdown.paidActiveCount).toBe(2)
    expect(overview.subscriptionBreakdown.monthlyPaidCount).toBe(1)
    expect(overview.subscriptionBreakdown.annualPaidCount).toBe(1)
    expect(overview.subscriptionBreakdown.trialingCount).toBe(1)
    expect(overview.subscriptionBreakdown.foundingRedeemedCount).toBe(1)
    expect(overview.subscriptionBreakdown.foundingEligibleCount).toBe(2)

    // Generation Queue vs Finisher Queue
    expect(overview.queueStats.claimed).toBe(1)
    expect(overview.finisherStats.qualityRejected).toBe(1)
    expect(overview.finisherStats.completed).toBe(1)
    expect(overview.finisherStats.totalSubmissions).toBe(2)

    // Data Source Health
    expect(overview.dataSources.length).toBeGreaterThanOrEqual(5)
    expect(overview.dataSources.every((ds) => ds.status === 'healthy' || ds.status === 'empty')).toBe(true)
    expect(overview.systemHealth).toBe('critical') // due to concurrent stuck job and quality rejection anomalies
  })

  it('captures database query errors into dataSources and marks systemHealth as degraded', async () => {
    const mockClient = createMockSupabaseClient(
      {
        children: [{ id: 'c-1', display_name: '測試生', is_active: true }],
      },
      {
        subscriptions: { message: 'column cancellation_reason does not exist' },
      }
    )

    const service = new AdminService({ client: mockClient })
    const overview = await service.getOperationsOverview()

    expect(overview.systemHealth).toBe('degraded')
    const failedSource = overview.dataSources.find((ds) => ds.source === 'subscriptions')
    expect(failedSource).toBeDefined()
    expect(failedSource?.status).toBe('error')
    expect(failedSource?.error).toContain('column cancellation_reason does not exist')
  })

  it('aggregates Failure Intelligence including curriculum_submissions rejections, evidence findings, and failure rate', async () => {
    const mockClient = createMockSupabaseClient(
      {
        generation_jobs: [
          {
            id: 'job-err-1',
            child_id: 'c-1',
            material_week: '2026-08-17',
            error_code: 'CANONICAL_PROMPT_CLIPPED',
            error_message: 'Prompt height exceeded 64px bounding box',
            attempt_count: 2,
            schema_version: '2.2.0',
            prompt_version: '2.4.0',
            quality_profile: 'gemini-3.7-flash',
            created_at: '2026-08-17T01:00:00Z',
          },
        ],
        children: [{ id: 'c-1', display_name: '林大豪' }],
      },
      {},
      {
        admin_get_curriculum_submissions: async () => ({
          data: [
            {
              job_id: 'job-err-2',
              authoring_attempt: 1,
              status: 'quality_rejected',
              error_code: 'QUALITY_REJECTED',
              error_message: 'Quality rubric violation',
              schema_version: '2.2.0',
              prompt_version: '2.4.0',
              quality_profile: 'gemini-3.7-flash',
              failure_evidence: {
                findings: [
                  { rule: 'Lexical Ceiling Guard', message: 'Exceeded CEFR B1 limit: meticulous' },
                ],
              },
              submitted_at: '2026-08-17T02:00:00Z',
            },
            {
              job_id: 'job-err-3',
              authoring_attempt: 1,
              status: 'completed',
              schema_version: '2.2.0',
              prompt_version: '2.4.0',
              quality_profile: 'gemini-3.7-flash',
              submitted_at: '2026-08-17T03:00:00Z',
            },
          ],
          error: null,
        }),
      }
    )

    const service = new AdminService({ client: mockClient })
    const failures = await service.getFailureIntelligence()

    expect(failures.totalFailures).toBe(2) // 1 job error + 1 submission rejection
    expect(failures.generationStats.failureRatePercent).toBe(100) // 1 failed / 1 job = 100%
    expect(failures.generationStats.terminalJobs).toBe(1)
    expect(failures.finisherStats.rejectionRatePercent).toBe(50) // 1 rejected / 2 submissions = 50%
    expect(failures.stageBreakdown.length).toBe(5)

    const clipped = failures.errorCodeClusters.find((c) => c.errorCode === 'CANONICAL_PROMPT_CLIPPED')
    expect(clipped).toBeDefined()
    expect(clipped?.stage).toBe('pdf_rendering')

    expect(failures.qualityRuleViolations.length).toBe(1)
    expect(failures.qualityRuleViolations[0].rule).toBe('Lexical Ceiling Guard')
    expect(failures.qualityRuleViolations[0].category).toBe('lexical_ceiling')
    expect(failures.qualityRuleViolations[0].sampleFinding).toContain('meticulous')
  })

  it('aggregates Parent Feedback Intelligence with deterministic keyword clustering and PII masking', async () => {
    const mockClient = createMockSupabaseClient({
      feedback: [
        {
          id: 'fb-1',
          child_id: 'c-1',
          material_id: 'mat-1',
          difficulty: 4,
          completion_rate: 50,
          weak_area: 'grammar',
          child_comments: '光武國中的進度太快，這週閱讀文章太長了，寫到後面很累',
          parent_comments: '孩子說篇幅偏多，有中文翻譯會更好，請聯絡媽媽 0912-345-678',
          mistakes_text: '過去完成式時態搞不清楚',
          created_at: '2026-08-17T05:00:00Z',
        },
      ],
      children: [{ id: 'c-1', display_name: '張晴晴' }],
      materials: [{ id: 'mat-1', material_week: '2026-08-17' }],
    })

    const service = new AdminService({ client: mockClient })
    const feedback = await service.getFeedbackIntelligence()

    expect(feedback.totalSubmissions).toBe(1)
    expect(feedback.difficultyDistribution.tooHard.count).toBe(1)
    expect(feedback.completionRateDistribution.rate5).toBe(1)

    // Topic clustering
    const lengthCluster = feedback.topicClusters.find((t) => t.topic.includes('太長'))
    expect(lengthCluster).toBeDefined()
    expect(lengthCluster?.sentiment).toBe('friction')

    // Child voice sanitization
    expect(feedback.childVoiceQuotes.length).toBe(1)
    expect(feedback.childVoiceQuotes[0].quote).not.toContain('光武國中')
    expect(feedback.childVoiceQuotes[0].quote).toContain('[SCHOOL_REDACTED]')
    expect(feedback.childVoiceQuotes[0].childPseudonym).toBe('張*晴')

    // Parent comment sanitization
    const recent = feedback.recentFeedbackList[0]
    expect(recent.parentComments).not.toContain('0912-345-678')
    expect(recent.parentComments).toContain('[PHONE_REDACTED]')
  })

  it('constructs a unified Child / Week Lifecycle Timeline and correctly handles newest-first descending RPC ordering', async () => {
    const mockClient = createMockSupabaseClient(
      {
        children: [{ id: 'c-1', display_name: '王小宇', grade: 8, delivery_weekday: 'Monday', timezone: 'Asia/Taipei', is_active: true }],
        subscriptions: [{ child_id: 'c-1', status: 'active', plan_code: 'standard_monthly' }],
        generation_jobs: [{ id: 'job-1', child_id: 'c-1', material_week: '2026-08-17', status: 'completed', material_id: 'mat-1', release_at: '2026-08-17T00:00:00Z' }],
        materials: [{ id: 'mat-1', child_id: 'c-1', material_week: '2026-08-17', revision: 1, student_pdf_path: 'path/student.pdf' }],
        feedback: [{ child_id: 'c-1', material_id: 'mat-1', difficulty: 3, completion_rate: 100 }],
        child_learning_state: [{ child_id: 'c-1', comprehension_accuracy: 0.85 }],
      },
      {},
      {
        admin_get_curriculum_submissions: async () => ({
          // Production RPC returns descending: newest (Attempt 2) first, oldest (Attempt 1) last
          data: [
            {
              job_id: 'job-1',
              authoring_attempt: 2,
              status: 'completed',
              submitted_at: '2026-08-17T02:00:00Z',
            },
            {
              job_id: 'job-1',
              authoring_attempt: 1,
              status: 'quality_rejected',
              error_message: 'Lexical ceiling exceeded',
              failure_evidence: { findings: [{ rule: 'Ceiling Guard', message: 'hard word' }] },
              submitted_at: '2026-08-17T01:00:00Z',
            },
          ],
          error: null,
        }),
      }
    )

    const service = new AdminService({ client: mockClient })
    const timeline = await service.getChildWeekTimeline('c-1', '2026-08-17')

    expect(timeline.childId).toBe('c-1')
    expect(timeline.childPseudonym).toBe('王*宇')
    expect(timeline.events.length).toBe(8)

    // Authoring step details (canonical sorting orders Attempt 1 first, Attempt 2 second)
    const authoringEvent = timeline.events.find((e) => e.step === 'SUBMISSION_AUTHORING')
    expect(authoringEvent).toBeDefined()
    expect((authoringEvent?.details as any).totalAuthoringAttempts).toBe(2)
    expect((authoringEvent?.details as any).attempts[0].attempt).toBe(1)
    expect((authoringEvent?.details as any).attempts[1].attempt).toBe(2)

    // Finisher step details: latest attempt (Attempt 2) is completed, so event status is completed, NOT failed!
    const finisherEvent = timeline.events.find((e) => e.step === 'FINISHER_AUDIT')
    expect(finisherEvent).toBeDefined()
    expect(finisherEvent?.status).toBe('completed')
    expect((finisherEvent?.details as any).lastOutcome).toBe('completed')
    expect((finisherEvent?.details as any).rejectionCount).toBe(1)

    // Delivery release step uses authoritative release_at
    const releaseEvent = timeline.events.find((e) => e.step === 'DELIVERY_RELEASED')
    expect(releaseEvent).toBeDefined()
    expect((releaseEvent?.details as any).releaseAt).toBe('2026-08-17T00:00:00Z')
  })

  it('produces structured, sanitized AI export dataset with provenance headers and zero subjective opinions', async () => {
    const mockClient = createMockSupabaseClient({
      children: [{ id: 'c-1', display_name: '李小廷', is_active: true }],
      subscriptions: [{ id: 'sub-1', status: 'active' }],
      generation_jobs: [],
      materials: [{ id: 'm-1', rule_version: 'curriculum-rules/1.0.0', generator_version: 'pdf-page-break-fix', model_name: 'gpt-5.6-sol' }],
      enrollment_settings: [],
      curriculum_submissions: [],
      feedback: [],
      product_feedback: [],
    })

    const service = new AdminService({ client: mockClient })
    const dataset = await service.getAiExportDataset()

    expect(dataset.schemaVersion).toBe('2.3.0')
    expect(dataset.taxonomyVersion).toBe('cap-2.2.0')
    expect(dataset.ruleVersions).toContain('curriculum-rules/1.0.0')
    expect(dataset.generatorVersions).toContain('pdf-page-break-fix')
    expect(dataset.modelNames).toContain('gpt-5.6-sol')
    expect(dataset.exportedAt).toBeTruthy()
    expect(dataset.provenance.environment).toBe('production_database')
    expect(dataset.provenance.activeChildren).toBe(1)
    expect((dataset as any).actionableHypothesis).toBeUndefined()
  })

  it('deterministic PII sanitizer scrubs phones, emails, schools, teacher names, and registered student names', () => {
    const service = new AdminService({ supabaseUrl: '', supabaseSecretKey: '' })
    const knownNames = ['林大豪', 'Kobe', 'Mina']
    const raw = '我是光武國中的家長，小孩 Kobe 和林大豪在看 Teacher Amy 的教材，有問題請寄到 parent@example.com 或打 0912-345-678 找王老師。'
    const scrubbed = service.sanitizePiiText(raw, knownNames)

    expect(scrubbed).not.toContain('光武國中')
    expect(scrubbed).toContain('[SCHOOL_REDACTED]')
    expect(scrubbed).not.toContain('Teacher Amy')
    expect(scrubbed).toContain('[TEACHER_REDACTED]')
    expect(scrubbed).not.toContain('parent@example.com')
    expect(scrubbed).toContain('[EMAIL_REDACTED]')
    expect(scrubbed).not.toContain('0912-345-678')
    expect(scrubbed).toContain('[PHONE_REDACTED]')
    expect(scrubbed).not.toContain('王老師')
    expect(scrubbed).not.toContain('Kobe')
    expect(scrubbed).not.toContain('林大豪')
    expect(scrubbed).toContain('[NAME_REDACTED]')
  })

  describe('Grant 1 Retry (允許再重試 1 次) Operational Control', () => {
    it('safely grants 1 additional attempt to a job with max attempts exhausted (3/3 -> 3/4) preserving attempt history and requeueing to pending', async () => {
      const targetJob = {
        id: 'job-stuck-3',
        child_id: 'c-1',
        material_week: '2026-08-17',
        status: 'failed',
        attempt_count: 3,
        max_attempts: 3,
        error_code: 'HUMAN_REVIEW_REQUIRED',
        error_message: 'Max retry attempts exhausted',
        claimed_by: 'worker-old',
        lease_expires_at: '2020-01-01T00:00:00Z',
      }

      const mockClient = createMockSupabaseClient({
        generation_jobs: [targetJob],
      })

      const service = new AdminService({ client: mockClient })
      const result = await service.grantJobRetry('job-stuck-3')

      expect(result.success).toBe(true)
      expect(result.jobId).toBe('job-stuck-3')
      expect(result.previousMaxAttempts).toBe(3)
      expect(result.newMaxAttempts).toBe(4)
      expect(result.attemptCount).toBe(3)
      expect(result.status).toBe('pending')

      // Invariant: attempt_count is NEVER decremented, max_attempts is incremented by 1, and job is requeued
      expect(targetJob.attempt_count).toBe(3)
      expect(targetJob.max_attempts).toBe(4)
      expect(targetJob.status).toBe('pending')
      expect(targetJob.claimed_by).toBeNull()
      expect(targetJob.lease_expires_at).toBeNull()
    })

    it('rejects granting retry if the target job is already completed', async () => {
      const completedJob = {
        id: 'job-completed',
        child_id: 'c-1',
        material_week: '2026-08-17',
        status: 'completed',
        attempt_count: 2,
        max_attempts: 3,
      }

      const mockClient = createMockSupabaseClient({
        generation_jobs: [completedJob],
      })

      const service = new AdminService({ client: mockClient })
      const result = await service.grantJobRetry('job-completed')

      expect(result.success).toBe(false)
      expect(result.error).toBe('JOB_ALREADY_COMPLETED')
      expect(completedJob.max_attempts).toBe(3)
    })

    it('rejects granting retry if the target job has an active in-progress processing lease', async () => {
      const activeLeaseJob = {
        id: 'job-active-lease',
        child_id: 'c-1',
        material_week: '2026-08-17',
        status: 'claimed',
        attempt_count: 1,
        max_attempts: 3,
        claimed_by: 'chatgpt-worker-live',
        lease_expires_at: new Date(Date.now() + 600000).toISOString(),
      }

      const mockClient = createMockSupabaseClient({
        generation_jobs: [activeLeaseJob],
      })

      const service = new AdminService({ client: mockClient })
      const result = await service.grantJobRetry('job-active-lease')

      expect(result.success).toBe(false)
      expect(result.error).toBe('ACTIVE_LEASE_IN_PROGRESS')
      expect(activeLeaseJob.max_attempts).toBe(3)
      expect(activeLeaseJob.status).toBe('claimed')
    })

    it('rejects invalid or non-existent job IDs fail-closed', async () => {
      const mockClient = createMockSupabaseClient({
        generation_jobs: [],
      })

      const service = new AdminService({ client: mockClient })

      const invalidResult = await service.grantJobRetry('')
      expect(invalidResult.success).toBe(false)
      expect(invalidResult.error).toBe('INVALID_JOB_ID')

      const notFoundResult = await service.grantJobRetry('00000000-0000-0000-0000-000000000000')
      expect(notFoundResult.success).toBe(false)
      expect(notFoundResult.error).toBe('JOB_NOT_FOUND')
    })
  })

  describe('Longitudinal Generation Test Mode Operations', () => {
    const testChildId = '11111111-1111-4111-8111-111111111111'
    const normalChildId = '22222222-2222-4222-8222-222222222222'

    it('returns fail-closed disabled status for ordinary non-test children', async () => {
      const mockClient = createMockSupabaseClient({
        children: [{ id: normalChildId, display_name: '一般學員', is_active: true }],
        generation_test_mode_sessions: [],
        generation_jobs: [{ id: 'job-norm-1', child_id: normalChildId, material_week: '2026-08-17', status: 'pending', attempt_count: 0, max_attempts: 3 }],
        materials: [],
      })

      const service = new AdminService({ client: mockClient })
      const status = await service.getTestModeStatus(normalChildId)

      expect(status.success).toBe(true)
      expect(status.isEnabled).toBe(false)
      expect(status.advanceEligibility.canAdvance).toBe(false)
      expect(status.advanceEligibility.blockingCode).toBe('TEST_MODE_NOT_ENABLED')
      expect(status.resetEligibility.canReset).toBe(false)
    })

    it('enables test mode with designated target week and returns active status', async () => {
      const testSessions: any[] = []
      const mockClient = createMockSupabaseClient({
        children: [{ id: testChildId, display_name: '測試學員 A', is_active: true }],
        generation_test_mode_sessions: testSessions,
        generation_jobs: [
          {
            id: 'job-test-1',
            child_id: testChildId,
            material_week: '2026-08-17',
            status: 'pending',
            attempt_count: 0,
            max_attempts: 3,
            scheduled_for: '2026-08-20T00:00:00Z',
            feedback_cutoff_at: '2026-08-22T00:00:00Z',
            generation_due_at: '2026-08-23T00:00:00Z',
            release_at: '2026-08-24T00:00:00Z',
          },
        ],
        materials: [],
      })

      const service = new AdminService({ client: mockClient })

      const enableRes = await service.setTestMode(testChildId, true, 8)
      expect(enableRes.success).toBe(true)
      expect(enableRes.targetWeek).toBe(8)
      expect(testSessions.length).toBe(1)
      expect(testSessions[0].is_enabled).toBe(true)
      expect(testSessions[0].target_week).toBe(8)

      const status = await service.getTestModeStatus(testChildId)
      expect(status.isEnabled).toBe(true)
      expect(status.targetWeek).toBe(8)
      expect(status.completedWeeksCount).toBe(0)
      expect(status.nextJob?.id).toBe('job-test-1')
      expect(status.advanceEligibility.canAdvance).toBe(true)
    })

    it('prevents disabling test mode without reset if test materials already exist (unless force=true)', async () => {
      const testSessions = [{ child_id: testChildId, is_enabled: true, target_week: 9 }]
      const mockClient = createMockSupabaseClient({
        children: [{ id: testChildId, display_name: '測試學員 A', is_active: true }],
        generation_test_mode_sessions: testSessions,
        materials: [{ id: 'mat-test-1', child_id: testChildId, material_week: '2026-08-17' }],
      })

      const service = new AdminService({ client: mockClient })

      // Attempt normal disable -> should warn reset required
      const disableAttempt = await service.setTestMode(testChildId, false, undefined, false)
      expect(disableAttempt.success).toBe(false)
      expect(disableAttempt.error).toBe('RESET_REQUIRED_BEFORE_END_TEST_MODE')

      // Force disable -> succeeds
      const forceDisable = await service.setTestMode(testChildId, false, undefined, true)
      expect(forceDisable.success).toBe(true)
      expect(testSessions[0].is_enabled).toBe(false)
    })

    it('blocks advance when previous material observations are not yet recorded', async () => {
      const testSessions = [{ child_id: testChildId, is_enabled: true, target_week: 9 }]
      const mockClient = createMockSupabaseClient({
        children: [{ id: testChildId, display_name: '測試學員 A', is_active: true }],
        generation_test_mode_sessions: testSessions,
        materials: [
          {
            id: 'mat-test-1',
            child_id: testChildId,
            material_week: '2026-08-17',
            revision: 1,
            observations_recorded_at: null, // Observations not yet written back by Finisher
          },
        ],
        generation_jobs: [
          { id: 'job-test-2', child_id: testChildId, material_week: '2026-08-24', status: 'pending', attempt_count: 0, max_attempts: 3, scheduled_for: '2026-08-27T00:00:00Z', feedback_cutoff_at: '2026-08-29T00:00:00Z', generation_due_at: '2026-08-30T00:00:00Z', release_at: '2026-08-31T00:00:00Z' },
        ],
        curriculum_quality_observations: [],
      })

      const service = new AdminService({ client: mockClient })
      const status = await service.getTestModeStatus(testChildId)

      expect(status.advanceEligibility.canAdvance).toBe(false)
      expect(status.advanceEligibility.blockingCode).toBe('OBSERVATIONS_NOT_RECORDED')

      const advanceRes = await service.advanceTestWeek(testChildId)
      expect(advanceRes.success).toBe(false)
      expect(advanceRes.error).toBe('OBSERVATIONS_NOT_RECORDED')
    })

    it('accelerates the pending generation job on advanceTestWeek preserving schema & DB schedule invariants', async () => {
      const testSessions = [{ child_id: testChildId, is_enabled: true, target_week: 9 }]
      const pendingJob = {
        id: 'job-test-2',
        child_id: testChildId,
        material_week: '2026-08-24',
        status: 'pending',
        attempt_count: 0,
        max_attempts: 3,
        source_material_id: 'mat-test-1',
        scheduled_for: '2026-08-27T00:00:00Z',
        feedback_cutoff_at: '2026-08-29T00:00:00Z',
        generation_due_at: '2026-08-30T00:00:00Z',
        release_at: '2026-08-31T00:00:00Z',
      }
      const materials = [
        {
          id: 'mat-test-1',
          child_id: testChildId,
          material_week: '2026-08-17',
          revision: 1,
          observations_recorded_at: '2026-08-18T00:00:00Z',
        },
      ]

      const mockClient = createMockSupabaseClient({
        children: [{ id: testChildId, display_name: '測試學員 A', is_active: true }],
        generation_test_mode_sessions: testSessions,
        materials,
        generation_jobs: [pendingJob],
        curriculum_quality_observations: [{ material_id: 'mat-test-1', child_id: testChildId }],
      })

      const service = new AdminService({ client: mockClient })
      const advanceRes = await service.advanceTestWeek(testChildId)

      expect(advanceRes.success).toBe(true)
      expect(advanceRes.jobId).toBe('job-test-2')
      expect(advanceRes.materialWeek).toBe('2026-08-24')

      // Verify that job timings satisfy DB schedule constraints
      const sched = new Date(pendingJob.scheduled_for).getTime()
      const cutoff = new Date(pendingJob.feedback_cutoff_at).getTime()
      const due = new Date(pendingJob.generation_due_at).getTime()
      const rel = new Date(pendingJob.release_at).getTime()

      expect(cutoff).toBeLessThanOrEqual(sched + 1000)
      expect(due - cutoff).toBe(24 * 60 * 60 * 1000)
      expect(rel - cutoff).toBe(48 * 60 * 60 * 1000)
      expect(rel - due).toBe(24 * 60 * 60 * 1000)
      expect(pendingJob.source_material_id).toBe('mat-test-1')
    })

    it('records test feedback with production schema compatibility', async () => {
      const feedbackRows: any[] = []
      const mockClient = createMockSupabaseClient({
        children: [{ id: testChildId, display_name: '測試學員 A', is_active: true }],
        generation_test_mode_sessions: [{ child_id: testChildId, is_enabled: true, target_week: 9 }],
        materials: [{ id: 'mat-test-1', child_id: testChildId, material_week: '2026-08-17' }],
        feedback: feedbackRows,
      }, {}, {
        admin_record_test_feedback: (params: any) => {
          feedbackRows.push({
            id: 'fb-1',
            child_id: params.p_child_id,
            material_id: params.p_material_id,
            difficulty: params.p_difficulty,
            completion_rate: params.p_completion_rate,
            weak_area: params.p_weak_area,
          })
          return { data: { success: true, feedback_id: 'fb-1' }, error: null }
        },
      })

      const service = new AdminService({ client: mockClient })
      const res = await service.recordTestFeedback({
        childId: testChildId,
        materialId: 'mat-test-1',
        difficulty: 4,
        completionRate: 75,
        weakArea: 'vocabulary',
        mistakesText: 'Irregular verbs past tense confusion',
        childComments: 'Enjoyed the article topic',
      })

      expect(res.success).toBe(true)
      expect(res.feedbackId).toBe('fb-1')
      expect(feedbackRows.length).toBe(1)
      expect(feedbackRows[0].difficulty).toBe(4)
      expect(feedbackRows[0].completion_rate).toBe(75)
    })

    it('resets test child to onboarding state while calling Storage API and preserving profile/subscription', async () => {
      let storageRemoveCalled = false
      let removedPaths: string[] = []

      const testJobs = [
        { id: 'job-old-1', child_id: testChildId, material_week: '2026-08-17', status: 'completed' },
        { id: 'job-old-2', child_id: testChildId, material_week: '2026-08-24', status: 'pending' },
      ]
      const testMaterials = [
        {
          id: 'mat-1',
          child_id: testChildId,
          material_week: '2026-08-17',
          student_pdf_path: `${testChildId}/2026-08-17_student.pdf`,
          parent_answer_pdf_path: `${testChildId}/2026-08-17_parent.pdf`,
        },
      ]

      const mockClient = createMockSupabaseClient(
        {
          children: [{ id: testChildId, display_name: '測試學員 A', is_active: true, grade: 7 }],
          generation_test_mode_sessions: [{ child_id: testChildId, is_enabled: true, target_week: 9 }],
          materials: testMaterials,
          generation_jobs: testJobs,
        },
        {},
        {
          admin_reset_test_child_to_onboarding: (params: any) => {
            return {
              data: {
                success: true,
                child_id: params.p_child_id,
                new_job_id: 'job-fresh-week-1',
                material_week: '2026-08-17',
                deleted_materials_count: 1,
                deleted_jobs_count: 2,
                deleted_feedback_count: 1,
                deleted_observations_count: 1,
                deleted_submissions_count: 1,
                deleted_progress_records_count: 3,
                pdf_paths_to_delete: [
                  `${testChildId}/2026-08-17_student.pdf`,
                  `${testChildId}/2026-08-17_parent.pdf`,
                ],
              },
              error: null,
            }
          },
        },
        {
          remove: (_bucket: string, paths: string[]) => {
            storageRemoveCalled = true
            removedPaths = paths
            return { data: paths.map((p) => ({ name: p })), error: null }
          },
        }
      )

      const service = new AdminService({ client: mockClient })
      const resetRes = await service.resetTestChildToOnboarding(testChildId)

      expect(resetRes.success).toBe(true)
      expect(resetRes.newJobId).toBe('job-fresh-week-1')
      expect(resetRes.deletedMaterialsCount).toBe(1)
      expect(storageRemoveCalled).toBe(true)
      expect(removedPaths).toEqual([
        `${testChildId}/2026-08-17_student.pdf`,
        `${testChildId}/2026-08-17_parent.pdf`,
      ])
      expect(resetRes.storageCleanupWarning).toBe(false)
    })

    it('returns signed PDF preview URL for test child via service role Storage API', async () => {
      const mockClient = createMockSupabaseClient(
        {
          children: [{ id: testChildId, display_name: '測試學員 A', is_active: true }],
          generation_test_mode_sessions: [{ child_id: testChildId, is_enabled: true, target_week: 9 }],
          materials: [
            {
              id: 'mat-1',
              child_id: testChildId,
              material_week: '2026-08-17',
              student_pdf_path: `${testChildId}/2026-08-17_student.pdf`,
              parent_answer_pdf_path: `${testChildId}/2026-08-17_parent.pdf`,
            },
          ],
        },
        {},
        {},
        {
          createSignedUrl: (bucket: string, path: string, _expiry: number) => {
            return {
              data: { signedUrl: `https://mock.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=signed_token_123` },
              error: null,
            }
          },
        }
      )

      const service = new AdminService({ client: mockClient })

      const studentPdfRes = await service.getTestPdfSignedUrl(testChildId, 'mat-1', 'student')
      expect(studentPdfRes.success).toBe(true)
      expect(studentPdfRes.signedUrl).toContain(`${testChildId}/2026-08-17_student.pdf`)

      const parentPdfRes = await service.getTestPdfSignedUrl(testChildId, 'mat-1', 'parent')
      expect(parentPdfRes.success).toBe(true)
      expect(parentPdfRes.signedUrl).toContain(`${testChildId}/2026-08-17_parent.pdf`)
    })
  })

  describe('Quality Eras Refactor & Version-Aware Evidence Segmentation', () => {
    it('correctly classifies items into Engine v1 vs Historical era based on Schema 2.2.0 + Prompt 2.4.0 + model-quality-profile provenance', () => {
      // 1. Current Tightened Engine v1 submissions (Schema 2.2.0 + Prompt 2.4.0 + model-quality-profile provenance)
      expect(classifyQualityEra({
        schemaVersion: '2.2.0',
        promptVersion: '2.4.0',
        qualityProfile: 'gemini-3.7-flash',
      })).toBe('engine_v1')

      expect(classifyQualityEra({
        schemaVersion: '2.2.0',
        promptVersion: '2.4.0-prod',
        modelQualityProfile: { actualModel: 'gpt-5', resolvedQualityProfile: 'gpt-5', qualityProfileVersion: '1.0.0' },
      })).toBe('engine_v1')

      expect(classifyQualityEra({
        schemaVersion: '2.2.0',
        promptVersion: 'prompt/2.4.0',
        resolvedQualityProfile: 'gemini-3.7-flash',
      })).toBe('engine_v1')

      expect(classifyQualityEra({
        failureEvidence: {
          schemaVersion: '2.2.0',
          promptVersion: '2.4.0',
          qualityProfile: 'gpt-5.6-sol',
          findings: [{ rule: 'Lexical Ceiling Guard', message: 'Exceeded limit' }],
        },
      })).toBe('engine_v1')

      expect(classifyQualityEra({
        canonicalSource: {
          metadata: {
            schemaVersion: '2.2.0',
            promptVersion: '2.4.0',
            modelQualityProfile: { actualModel: 'gemini-3.7-flash', resolvedQualityProfile: 'gemini-3.7-flash', qualityProfileVersion: '1.0.0', engineVersion: '1.0.1' },
          },
          qualityEvidence: {
            criticalChecks: [{ id: 'model-quality-profile', passed: true, evidence: 'actualModel=gemini-3.7-flash | resolvedQualityProfile=gemini-3.7-flash | qualityProfileVersion=1.0.0 | engineVersion=1.0.1' }],
          },
        },
      })).toBe('engine_v1')

      // 2. Current Engine v1 with missing/metadata-only provenance stays in engine_v1 so violations are surfaced
      expect(classifyQualityEra({
        schemaVersion: '2.2.0',
        promptVersion: '2.4.0',
      })).toBe('engine_v1')

      expect(classifyQualityEra({
        schemaVersion: '2.2.0',
        promptVersion: '2.4.0',
        modelQualityProfile: { actualModel: 'gpt-5' },
      })).toBe('engine_v1')

      expect(classifyQualityEra({
        failureEvidence: {
          schemaVersion: '2.2.0',
          promptVersion: '2.4.0',
        },
      })).toBe('engine_v1')

      // 3. Real Legacy Production Shapes (Schema < 2.2.0, Prompt < 2.4.0)
      expect(classifyQualityEra({ schemaVersion: '1.0.0', promptVersion: '1.0.0' })).toBe('historical')
      expect(classifyQualityEra({ schemaVersion: '2.0.0', promptVersion: '2.0.0' })).toBe('historical')
      expect(classifyQualityEra({ schemaVersion: '2.1.0', promptVersion: '2.3.0' })).toBe('historical')
      expect(classifyQualityEra({ schemaVersion: '1.0.0', qualityProfile: 'legacy' })).toBe('historical') // old schema with profile still historical
      expect(classifyQualityEra({ failureEvidence: { schemaVersion: '1.0.0' } })).toBe('historical')
      expect(classifyQualityEra({ ruleVersion: 'curriculum-rules/1.0.0' })).toBe('historical')
      expect(classifyQualityEra({})).toBe('historical')

      // 4. Central Engine Versioning & Dynamic Label Formatting
      expect(CURRENT_ENGINE_VERSION).toBe('1.3.0')
      expect(CURRENT_SCHEMA_VERSION).toBe('2.3.0')
      expect(CURRENT_PROMPT_VERSION).toBe('2.7.0')
      expect(CURRENT_ERA_TAG).toBe('engine_v1')
      expect(formatEngineVersion()).toBe('Engine v1.3.0')
      expect(formatEngineVersion('1.0.0')).toBe('Engine v1.0.0')
      expect(formatEngineEraLabel('engine_v1')).toBe('Engine v1.3.0')
      expect(formatEngineEraLabel('engine_v1', '1.0.0')).toBe('Engine v1.0.0')
      expect(formatEngineEraLabel('engine_v1', '1.1.0')).toBe('Engine v1.1.0')
      expect(formatEngineEraLabel('historical')).toBe('Historical')
      expect(formatEngineEraLabel('historical', '0.9.0')).toBe('Historical (v0.9.0)')
    })

    it('defaults Failure Intelligence to Engine v1 metrics while preserving legacy and pre-profile records under Historical', async () => {
      const legacySubmissions = [
        {
          job_id: 'job-legacy-1',
          child_id: 'c1',
          authoring_attempt: 1,
          status: 'quality_rejected',
          error_code: 'QUALITY_REJECTED',
          error_message: 'Legacy schema mismatch on commonMistakes',
          schema_version: '1.0.0',
          prompt_version: '1.0.0',
          submitted_at: '2026-08-14T00:00:00Z',
          failure_evidence: { schemaVersion: '1.0.0', findings: [{ rule: 'LEGACY_FORMAT', message: 'Wrong schema' }] },
        },
        {
          job_id: 'job-legacy-2',
          child_id: 'c1',
          authoring_attempt: 2,
          status: 'quality_rejected',
          error_code: 'QUALITY_REJECTED',
          error_message: 'Legacy prompt ceiling violation',
          schema_version: '2.0.0',
          prompt_version: '2.1.0',
          submitted_at: '2026-08-14T01:00:00Z',
          failure_evidence: { schemaVersion: '2.0.0', findings: [{ rule: 'CEILING_EXCEEDED', message: 'Too hard' }] },
        },
      ]

      const preProfileSubmissions = [
        {
          job_id: 'job-preprofile-1',
          child_id: 'c1',
          authoring_attempt: 3,
          status: 'quality_rejected',
          error_code: 'QUALITY_REJECTED',
          error_message: 'Pre-profile Engine v1 quality rejection',
          schema_version: '2.2.0',
          prompt_version: '2.4.0',
          // No modelQualityProfile provenance attached!
          submitted_at: '2026-08-16T00:00:00Z',
          failure_evidence: { schemaVersion: '2.2.0', promptVersion: '2.4.0', findings: [{ rule: 'FORMAT_CHECK', message: 'Pre-profile issue' }] },
        },
      ]

      const tightenedEngineV1Submissions = [
        {
          job_id: 'job-enginev1-1',
          child_id: 'c1',
          authoring_attempt: 1,
          status: 'completed',
          error_code: null,
          error_message: null,
          schema_version: '2.2.0',
          prompt_version: '2.4.0',
          quality_profile: 'gemini-3.7-flash',
          submitted_at: '2026-08-17T00:00:00Z',
        },
        {
          job_id: 'job-enginev1-2',
          child_id: 'c2',
          authoring_attempt: 1,
          status: 'completed',
          error_code: null,
          error_message: null,
          schema_version: '2.2.0',
          prompt_version: '2.4.0',
          quality_profile: 'gpt-5',
          submitted_at: '2026-08-17T01:00:00Z',
        },
      ]

      const allSubmissions = [...legacySubmissions, ...preProfileSubmissions, ...tightenedEngineV1Submissions]

      const mockClient = createMockSupabaseClient(
        {
          generation_jobs: [
            { id: 'job-legacy-1', child_id: 'c1', status: 'completed', rule_version: 'curriculum-rules/1.0.0', schema_version: '1.0.0', prompt_version: '1.0.0' },
            { id: 'job-legacy-2', child_id: 'c1', status: 'completed', rule_version: 'curriculum-rules/1.0.0', schema_version: '2.0.0', prompt_version: '2.1.0' },
            { id: 'job-preprofile-1', child_id: 'c1', status: 'completed', rule_version: '2.2.0', schema_version: '2.2.0', prompt_version: '2.4.0' },
            { id: 'job-enginev1-1', child_id: 'c1', status: 'completed', rule_version: '2.2.0', schema_version: '2.2.0', prompt_version: '2.4.0', quality_profile: 'gemini-3.7-flash' },
            { id: 'job-enginev1-2', child_id: 'c2', status: 'completed', rule_version: '2.2.0', schema_version: '2.2.0', prompt_version: '2.4.0', quality_profile: 'gpt-5' },
          ],
          children: [
            { id: 'c1', display_name: '學員 A' },
            { id: 'c2', display_name: '學員 B' },
          ],
        },
        {},
        {
          admin_get_curriculum_submissions: () => {
            return { data: allSubmissions, error: null }
          },
        }
      )

      const service = new AdminService({ client: mockClient })

      // 1. Default Era (Current Engine v1)
      const currentFailures = await service.getFailureIntelligence()
      expect(currentFailures.selectedEra).toBe('current')
      expect(currentFailures.totalFailures).toBe(1)
      expect(currentFailures.recentFailures.length).toBe(1)
      expect(currentFailures.recentFailures[0].era).toBe('engine_v1')
      expect(currentFailures.eraBreakdown.currentTotalFailures).toBe(1)
      // Historical includes 2 legacy failures
      expect(currentFailures.eraBreakdown.historicalTotalFailures).toBe(2)
      expect(currentFailures.eraBreakdown.allTotalFailures).toBe(3)

      // 2. Historical Era (Includes legacy submissions)
      const historicalFailures = await service.getFailureIntelligence('historical')
      expect(historicalFailures.selectedEra).toBe('historical')
      expect(historicalFailures.totalFailures).toBe(2)
      expect(historicalFailures.finisherStats.qualityRejectedSubmissions).toBe(2)
      expect(historicalFailures.recentFailures.length).toBe(2)
      expect(historicalFailures.recentFailures.every((f) => f.era === 'historical')).toBe(true)

      // 3. All Eras
      const allFailures = await service.getFailureIntelligence('all')
      expect(allFailures.selectedEra).toBe('all')
      expect(allFailures.totalFailures).toBe(3)
      expect(allFailures.recentFailures.length).toBe(3)
    })

    it('provides clear Quality Era provenance and tags in AI Dataset Export', async () => {
      const allSubmissions = [
        {
          job_id: 'job-legacy-1',
          child_id: 'c1',
          authoring_attempt: 1,
          status: 'quality_rejected',
          error_code: 'QUALITY_REJECTED',
          error_message: 'Legacy failure',
          rule_version: 'curriculum-rules/1.0.0',
          schema_version: '1.0.0',
          prompt_version: '1.0.0',
          submitted_at: '2026-08-14T00:00:00Z',
          failure_evidence: { schemaVersion: '1.0.0', findings: [{ rule: 'LEGACY_RULE', message: 'Legacy error' }] },
        },
        {
          job_id: 'job-enginev1-1',
          child_id: 'c1',
          authoring_attempt: 1,
          status: 'completed',
          error_code: null,
          error_message: null,
          schema_version: '2.2.0',
          prompt_version: '2.4.0',
          quality_profile: 'gemini-3.7-flash',
          submitted_at: '2026-08-17T00:00:00Z',
        },
      ]

      const mockClient = createMockSupabaseClient(
        {
          materials: [
            { id: 'm1', rule_version: 'curriculum-rules/1.0.0', generator_version: 'curriculum/1.0.0', model_name: 'gpt-5.6-luna', prompt_version: '1.0.0' },
            { id: 'm2', rule_version: '2.2.0', generator_version: 'curriculum/2.2.0', model_name: 'gemini-3.7-flash', prompt_version: '2.4.0' },
          ],
          children: [{ id: 'c1', display_name: '學員 A' }],
          subscriptions: [],
          generation_jobs: [
            { id: 'job-legacy-1', child_id: 'c1', status: 'completed', rule_version: 'curriculum-rules/1.0.0', schema_version: '1.0.0', prompt_version: '1.0.0' },
            { id: 'job-enginev1-1', child_id: 'c1', status: 'completed', rule_version: '2.2.0', schema_version: '2.2.0', prompt_version: '2.4.0', quality_profile: 'gemini-3.7-flash' },
          ],
          feedback: [],
          product_feedback: [],
          enrollment_settings: [],
        },
        {},
        {
          admin_get_curriculum_submissions: () => {
            return { data: allSubmissions, error: null }
          },
        }
      )

      const service = new AdminService({ client: mockClient })
      const currentExport = await service.getAiExportDataset('current')

      expect(currentExport.schemaVersion).toBe('2.3.0')
      expect(currentExport.provenance.era).toBe('current')
      expect(currentExport.provenance.currentEraName).toBe('Engine v1.3.0')
      expect(currentExport.provenance.currentEngineVersion).toBe('1.3.0')
      expect(currentExport.provenance.currentSchemaVersion).toBe('2.3.0')
      expect(currentExport.provenance.currentPromptVersion).toBe('2.7.0')
    })
  })

  describe('Admin Curriculum Submissions Telemetry & Production Schema Invariants', () => {
    it('relies strictly on authoritative admin_get_curriculum_submissions RPC without public table fallback', async () => {
      // Mock client where admin RPC fails
      const mockClient = createMockSupabaseClient(
        {},
        {},
        {
          admin_get_curriculum_submissions: async () => {
            throw new Error('RPC admin_get_curriculum_submissions failed')
          },
        }
      )

      const service = new AdminService({ client: mockClient })
      const overview = await service.getOperationsOverview('current')

      // Assert curriculum_submissions RPC source is captured with error status
      const rpcSource = overview.dataSources.find((ds) => ds.source === 'curriculum_submissions (RPC)')
      expect(rpcSource).toBeDefined()
      expect(rpcSource?.status).toBe('error')
      expect(rpcSource?.error).toContain('RPC admin_get_curriculum_submissions failed')
    })

    it('reports 6/6 healthy data sources when admin RPC succeeds on production schema shape', async () => {
      const mockSubmissions = [
        {
          job_id: 'job-prod-1',
          child_id: 'child-prod-1',
          material_week: '2026-08-18',
          authoring_attempt: 1,
          generation_worker_id: 'chatgpt-work-daily',
          processor_id: 'github-actions-finisher',
          status: 'completed',
          error_code: null,
          error_message: null,
          failure_evidence: null,
          submitted_at: '2026-08-18T10:00:00Z',
          processed_at: '2026-08-18T10:05:00Z',
          attempt_count: 1,
          schema_version: '2.2.0',
          prompt_version: '2.4.0',
          model_name: 'gemini-3.7-flash',
          quality_profile: 'gemini-3.7-flash',
          engine_version: '1.0.1',
        },
      ]

      const mockClient = createMockSupabaseClient(
        {
          subscriptions: [{ id: 'sub-1', status: 'active', user_id: 'user-1' }],
          generation_jobs: [{ id: 'job-1', status: 'completed', attempts: 1, target_week: 1 }],
          materials: [{ id: 'mat-1', title: 'Week 1', week_number: 1, child_id: 'child-1' }],
          enrollment_settings: [{ key: 'capacity', value: 100 }],
          children: [{ id: 'child-1', name: 'Child 1', parent_id: 'user-1' }],
        },
        {},
        {
          admin_get_curriculum_submissions: async () => {
            return { data: mockSubmissions, error: null }
          },
        }
      )

      const service = new AdminService({ client: mockClient })
      const overview = await service.getOperationsOverview('current')

      // Assert all 6 data sources are present and healthy
      expect(overview.dataSources.length).toBe(6)
      const healthySources = overview.dataSources.filter((ds) => ds.status === 'healthy')
      expect(healthySources.length).toBe(6)

      const rpcSource = overview.dataSources.find((ds) => ds.source === 'curriculum_submissions (RPC)')
      expect(rpcSource?.status).toBe('healthy')
      expect(rpcSource?.rowCount).toBe(1)
    })

    it('processes RPC submissions and accurately distinguishes valid, metadata-only (MISSING), and malformed (INVALID) provenance', async () => {
      const mockSubmissions = [
        // 1. Valid passing check with complete 4 evidence tokens
        {
          job_id: 'job-valid',
          child_id: 'child-1',
          material_week: '2026-08-18',
          authoring_attempt: 1,
          generation_worker_id: 'chatgpt-work-daily',
          processor_id: 'github-actions-finisher',
          status: 'completed',
          error_code: null,
          error_message: null,
          failure_evidence: null,
          submitted_at: '2026-08-18T10:00:00Z',
          processed_at: '2026-08-18T10:05:00Z',
          attempt_count: 1,
          schema_version: CURRENT_SCHEMA_VERSION,
          prompt_version: CURRENT_PROMPT_VERSION,
          model_name: 'gemini-3.7-flash',
          quality_profile: 'gemini-3.7-flash',
          engine_version: CURRENT_ENGINE_VERSION,
          quality_profile_version: '1.1.0',
          release_id: CURRENT_RELEASE_ID,
        },
        // 2. Metadata-only current submission: missing valid check, flagged as MISSING by RPC
        {
          job_id: 'job-meta-only',
          child_id: 'child-2',
          material_week: '2026-08-18',
          authoring_attempt: 1,
          generation_worker_id: 'chatgpt-work-daily',
          processor_id: 'github-actions-finisher',
          status: 'quality_rejected',
          error_code: 'QUALITY_REJECTED',
          error_message: 'Curriculum quality rejected',
          failure_evidence: {
            schemaVersion: CURRENT_SCHEMA_VERSION,
            promptVersion: CURRENT_PROMPT_VERSION,
            findings: [
              {
                source: 'provenance',
                rule: 'MODEL_QUALITY_PROFILE_PROVENANCE_MISSING',
                message: 'Current schema/prompt submission is missing required model-profile provenance.',
              },
            ],
          },
          submitted_at: '2026-08-18T11:00:00Z',
          processed_at: '2026-08-18T11:05:00Z',
          attempt_count: 1,
          schema_version: CURRENT_SCHEMA_VERSION,
          prompt_version: CURRENT_PROMPT_VERSION,
          model_name: 'gpt-5.6-sol',
          quality_profile: 'default', // display object only, does not satisfy validity
          engine_version: CURRENT_ENGINE_VERSION,
          quality_profile_version: null,
          release_id: CURRENT_RELEASE_ID,
        },
        // 3. Malformed check current submission: passed=false or incomplete evidence, flagged as INVALID by RPC
        {
          job_id: 'job-malformed',
          child_id: 'child-3',
          material_week: '2026-08-18',
          authoring_attempt: 1,
          generation_worker_id: 'chatgpt-work-daily',
          processor_id: 'github-actions-finisher',
          status: 'quality_rejected',
          error_code: 'QUALITY_REJECTED',
          error_message: 'Curriculum quality rejected',
          failure_evidence: {
            schemaVersion: CURRENT_SCHEMA_VERSION,
            promptVersion: CURRENT_PROMPT_VERSION,
            findings: [
              {
                source: 'provenance',
                rule: 'MODEL_QUALITY_PROFILE_PROVENANCE_INVALID',
                message: 'Current schema/prompt submission contains malformed or incomplete model-profile provenance.',
              },
            ],
          },
          submitted_at: '2026-08-18T12:00:00Z',
          processed_at: '2026-08-18T12:05:00Z',
          attempt_count: 1,
          schema_version: CURRENT_SCHEMA_VERSION,
          prompt_version: CURRENT_PROMPT_VERSION,
          model_name: 'gpt-5.6-sol',
          quality_profile: null,
          engine_version: CURRENT_ENGINE_VERSION,
          quality_profile_version: null,
          release_id: CURRENT_RELEASE_ID,
        },
      ]

      const mockClient = createMockSupabaseClient(
        {
          subscriptions: [{ id: 'sub-1', status: 'active', user_id: 'user-1' }],
          generation_jobs: [{ id: 'job-1', status: 'completed', attempts: 1, target_week: 1 }],
          materials: [{ id: 'mat-1', title: 'Week 1', week_number: 1, child_id: 'child-1' }],
          enrollment_settings: [{ key: 'capacity', value: 100 }],
          children: [{ id: 'child-1', name: 'Child 1', parent_id: 'user-1' }],
        },
        {},
        {
          admin_get_curriculum_submissions: async () => {
            return { data: mockSubmissions, error: null }
          },
        }
      )

      const service = new AdminService({ client: mockClient })
      const failures = await service.getFailureIntelligence('current')

      // Assert all 3 are in current era
      expect(failures.recentFailures.length).toBe(2)
      expect(failures.recentFailures.some((f) => (f.failureEvidence as any)?.findings?.some((fd: any) => fd.rule === 'MODEL_QUALITY_PROFILE_PROVENANCE_MISSING'))).toBe(true)
      expect(failures.recentFailures.some((f) => (f.failureEvidence as any)?.findings?.some((fd: any) => fd.rule === 'MODEL_QUALITY_PROFILE_PROVENANCE_INVALID'))).toBe(true)
    })
  })

  describe('Requeue Curriculum Submission for Finisher Reprocessing', () => {
    it('successfully calls admin_requeue_curriculum_submission RPC preserving attempt_count and max_attempts', async () => {
      let rpcCalledWith: any = null
      const mockClient = createMockSupabaseClient(
        {
          generation_jobs: [{ id: 'job-rejected-1', status: 'failed', attempt_count: 3, max_attempts: 3 }],
        },
        {},
        {
          admin_requeue_curriculum_submission: async (params: any) => {
            rpcCalledWith = params
            return {
              data: {
                success: true,
                jobId: params.p_job_id,
                authoringAttempt: params.p_authoring_attempt ?? 3,
                submissionStatus: 'pending',
                jobStatus: 'claimed',
                attemptCount: 3,
                maxAttempts: 3,
                timestamp: '2026-08-19T01:30:00Z',
              },
              error: null,
            }
          },
        }
      )

      const service = new AdminService({ client: mockClient })
      const result = await service.requeueCurriculumSubmission('job-rejected-1', 3)

      expect(result.success).toBe(true)
      expect(rpcCalledWith).toEqual({ p_job_id: 'job-rejected-1', p_authoring_attempt: 3 })
      expect(result.jobStatus).toBe('claimed')
      expect(result.submissionStatus).toBe('pending')
      expect(result.attemptCount).toBe(3)
      expect(result.maxAttempts).toBe(3)
    })

    it('rejects requeuing when jobId is empty or invalid', async () => {
      const mockClient = createMockSupabaseClient({}, {}, {})
      const service = new AdminService({ client: mockClient })
      const result = await service.requeueCurriculumSubmission('')
      expect(result.success).toBe(false)
      expect(result.error).toBe('INVALID_JOB_ID')
    })
  })

  describe('Waitlist & Scaling Gate Management', () => {
    it('retrieves waitlist entries and calculated cohort breakdown', async () => {
      const mockWaitlistRows = [
        {
          id: 'w-1',
          parent_id: 'p-1',
          child_id: 'c-1',
          email: 'parent1@test.com',
          child_name: 'Child One',
          grade: 7,
          grade_stage: 'grade_7',
          status: 'waiting',
          created_at: '2026-08-20T00:00:00Z',
          released_at: null,
          converted_at: null,
          notes: null,
        },
        {
          id: 'w-2',
          parent_id: 'p-2',
          child_id: 'c-2',
          email: 'parent2@test.com',
          child_name: 'Child Two',
          grade: 8,
          grade_stage: 'grade_8',
          status: 'released',
          created_at: '2026-08-19T00:00:00Z',
          released_at: '2026-08-20T01:00:00Z',
          converted_at: null,
          notes: null,
        },
      ]

      const mockClient = createMockSupabaseClient(
        {
          enrollment_settings: [{ capacity: 100, founding_limit: 30, status: 'open' }],
          subscriptions: [
            { child_id: 'c-active-1', status: 'active', children: { is_active: true } },
          ],
        },
        {},
        {
          admin_get_waitlist: async () => ({
            data: mockWaitlistRows,
            error: null,
          }),
        }
      )

      const service = new AdminService({ client: mockClient })
      const data = await service.getWaitlistData()

      expect(data.capacity).toBe(100)
      expect(data.activeCount).toBe(1)
      expect(data.waitingCount).toBe(1)
      expect(data.releasedCount).toBe(1)
      expect(data.convertedCount).toBe(0)
      expect(data.entries).toHaveLength(2)
      expect(data.entries[0].childName).toBe('Child One')
      expect(data.entries[0].status).toBe('waiting')
      expect(data.entries[1].childName).toBe('Child Two')
      expect(data.entries[1].status).toBe('released')
    })

    it('raises capacity and releases all waiting candidates with audit and email count', async () => {
      let rpcCalledWith: any = null
      const mockClient = createMockSupabaseClient(
        {},
        {},
        {
          admin_raise_capacity_and_release: async (params: any) => {
            rpcCalledWith = params
            return {
              data: {
                new_capacity: params.p_new_capacity,
                active_count: 100,
                released_count: 20,
                waiting_count: 0,
                released_in_this_run: 20,
              },
              error: null,
            }
          },
          admin_get_waitlist: async () => ({
            data: Array.from({ length: 20 }, (_, i) => ({
              id: `w-${i}`,
              status: 'released',
              released_at: '2026-08-20T01:00:00Z',
            })),
            error: null,
          }),
        }
      )

      const service = new AdminService({ client: mockClient })
      vi.spyOn(service, 'dispatchPendingReleaseNotifications').mockResolvedValue({ sent: 20, failed: 0, manual: 0 })
      const result = await service.raiseCapacityAndRelease(200, true)

      expect(result.success).toBe(true)
      expect(rpcCalledWith).toEqual({ p_new_capacity: 200, p_release_all: true })
      expect(result.newCapacity).toBe(200)
      expect(result.releasedInThisRun).toBe(20)
      expect(result.emailsDispatched).toBe(20)
    })

    it('releases selected waitlist children by ID', async () => {
      let rpcCalledWith: any = null
      const mockClient = createMockSupabaseClient(
        {},
        {},
        {
          admin_release_waitlist_children: async (params: any) => {
            rpcCalledWith = params
            return {
              data: { released_count: 2 },
              error: null,
            }
          },
        }
      )

      const service = new AdminService({ client: mockClient })
      vi.spyOn(service, 'dispatchPendingReleaseNotifications').mockResolvedValue({ sent: 2, failed: 0, manual: 0 })
      const result = await service.releaseWaitlistChildren(['c-1', 'c-2'])

      expect(result.success).toBe(true)
      expect(rpcCalledWith).toEqual({ p_child_ids: ['c-1', 'c-2'] })
      expect(result.releasedCount).toBe(2)
      expect(result.emailsDispatched).toBe(2)
    })

    it('dispatches release email through generateLink and Resend, then tracks success', async () => {
      const rows = [{ id: 'w-1', email: 'parent@test.com', notification_status: 'pending', notification_attempts: 1, notification_error: 'old failure', notified_at: null }]
      const updates: any[] = []
      const mockClient: any = {
        auth: {
          admin: {
            generateLink: vi.fn().mockResolvedValue({
              data: { properties: { action_link: 'https://auth.test/magic-link' } },
              error: null,
            }),
          },
        },
        from: () => ({
          select: () => ({
            eq: async () => ({ data: rows, error: null }),
          }),
          update: (payload: any) => ({
            eq: async () => {
              updates.push(payload)
              Object.assign(rows[0], payload)
              return { data: rows, error: null }
            },
          }),
        }),
      }
      process.env.RESEND_API_KEY = 'resend-test-key'
      process.env.EMAIL_FROM = '紙屬英文 <notify@example.com>'
      process.env.SITE_URL = 'https://paperbond.jjmowlab.com'
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' })
      vi.stubGlobal('fetch', fetchMock)

      const service = new AdminService({ client: mockClient })
      const result = await service.dispatchPendingReleaseNotifications()

      expect(result).toEqual({ sent: 1, failed: 0, manual: 0 })
      expect(mockClient.auth.admin.generateLink).toHaveBeenCalledWith({
        type: 'magiclink',
        email: 'parent@test.com',
        options: { redirectTo: 'https://paperbond.jjmowlab.com/billing' },
      })
      expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({ method: 'POST' }))
      expect(updates).toContainEqual(expect.objectContaining({
        notification_status: 'sent',
        notification_error: null,
        notification_attempts: 2,
      }))
    })

    it('tracks a failed Resend delivery with its error and incremented attempt count', async () => {
      const rows = [{ id: 'w-2', email: 'fail@test.com', notification_status: 'pending', notification_attempts: 0 }]
      const updates: any[] = []
      const mockClient: any = {
        auth: { admin: { generateLink: vi.fn().mockResolvedValue({ data: { properties: { action_link: 'https://auth.test/link' } }, error: null }) } },
        from: () => ({
          select: () => ({ eq: async () => ({ data: rows, error: null }) }),
          update: (payload: any) => ({ eq: async () => { updates.push(payload); return { data: rows, error: null } } }),
        }),
      }
      process.env.RESEND_API_KEY = 'resend-test-key'
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, text: async () => 'provider unavailable' }))

      const result = await new AdminService({ client: mockClient }).dispatchPendingReleaseNotifications()

      expect(result).toEqual({ sent: 0, failed: 1, manual: 0 })
      expect(updates).toContainEqual(expect.objectContaining({
        notification_status: 'failed',
        notification_attempts: 1,
        notification_error: expect.stringContaining('Resend 503'),
      }))
    })

    it('resets failed notifications and dispatches them again', async () => {
      const failedRows = [{ id: 'w-3' }]
      const mockClient: any = {
        from: () => ({
          update: () => ({
            eq: () => ({ select: async () => ({ data: failedRows, error: null }) }),
          }),
        }),
      }
      const service = new AdminService({ client: mockClient })
      vi.spyOn(service, 'dispatchPendingReleaseNotifications').mockResolvedValue({ sent: 1, failed: 0, manual: 0 })

      const result = await service.retryFailedNotifications()

      expect(result).toEqual({ success: true, emailsDispatched: 1, notificationsFailed: 0 })
      expect(service.dispatchPendingReleaseNotifications).toHaveBeenCalledOnce()
    })

    it('updates capacity without releasing all', async () => {
      let rpcCalledWith: any = null
      const mockClient = createMockSupabaseClient(
        {},
        {},
        {
          admin_raise_capacity_and_release: async (params: any) => {
            rpcCalledWith = params
            return {
              data: {
                new_capacity: params.p_new_capacity,
                active_count: 50,
                released_count: 0,
                waiting_count: 0,
                released_in_this_run: 0,
              },
              error: null,
            }
          },
        }
      )

      const service = new AdminService({ client: mockClient })
      const result = await service.updateCapacity(150)

      expect(result.success).toBe(true)
      expect(rpcCalledWith).toEqual({ p_new_capacity: 150, p_release_all: false })
      expect(result.capacity).toBe(150)
    })
  })

  describe('subscription lifecycle revenue truth', () => {
    it('uses recorded events for history and excludes internal-test children from every paid metric', async () => {
      const now = new Date().toISOString()
      const mockClient = createMockSupabaseClient({
        children: [
          { id: 'paid-child', display_name: 'Paid Child', is_internal_test: false },
          { id: 'test-child', display_name: 'Operator Test', is_internal_test: true },
        ],
        subscriptions: [
          { id: 'paid-sub', child_id: 'paid-child', provider: 'paddle', status: 'active', plan_code: 'standard_monthly', billing_interval: 'month', price_twd: 499, current_period_start: now, current_period_end: now, cancel_at_period_end: false, created_at: now, updated_at: now },
          { id: 'test-sub', child_id: 'test-child', provider: 'paddle', status: 'active', plan_code: 'standard_monthly', billing_interval: 'month', price_twd: 499, current_period_start: now, current_period_end: now, cancel_at_period_end: false, created_at: now, updated_at: now },
        ],
        subscription_lifecycle_events: [
          { id: 'event-trial', subscription_id: 'paid-sub', child_id: 'paid-child', event_type: 'trial_started', source: 'internal_beta', source_event_id: 'trial-paid', effective_at: now, observed_status: 'trialing' },
          { id: 'event-active', subscription_id: 'paid-sub', child_id: 'paid-child', event_type: 'activated', source: 'paddle_webhook', source_event_id: 'evt-paid', effective_at: now, observed_status: 'active' },
          { id: 'event-test', subscription_id: 'test-sub', child_id: 'test-child', event_type: 'activated', source: 'paddle_webhook', source_event_id: 'evt-test', effective_at: now, observed_status: 'active' },
        ],
      })
      const data = await new AdminService({ client: mockClient }).getSubscriptionRevenueData(30)
      expect(data.current.activePaid).toBe(1)
      expect(data.subscriptions).toHaveLength(1)
      expect(data.funnels.subscription).toMatchObject({ observable: true, trialStarted: 1, activatedAfterTrial: 1 })
      expect(data.series.at(-1)).toMatchObject({ newPaid: 1, activePaid: 1 })
    })

    it('does not fabricate history when lifecycle instrumentation has no events', async () => {
      const now = new Date().toISOString()
      const mockClient = createMockSupabaseClient({
        children: [{ id: 'legacy-child', display_name: 'Legacy', is_internal_test: false }],
        subscriptions: [{ id: 'legacy-sub', child_id: 'legacy-child', provider: 'paddle', status: 'active', plan_code: 'standard_monthly', billing_interval: 'month', price_twd: 499, current_period_start: now, current_period_end: now, cancel_at_period_end: false, created_at: now, updated_at: now }],
        subscription_lifecycle_events: [],
      })
      const data = await new AdminService({ client: mockClient }).getSubscriptionRevenueData(30)
      expect(data.current.activePaid).toBe(1)
      expect(data.instrumentationStartedAt).toBeNull()
      expect(data.funnels.subscription.observable).toBe(false)
      expect(data.series.every((point) => point.activePaid === 0 && point.newPaid === 0)).toBe(true)
    })
  })})


