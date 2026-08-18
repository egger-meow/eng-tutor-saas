import { describe, expect, it } from 'vitest'
import {
  AdminService,
  classifyQualityEra,
  CURRENT_ENGINE_VERSION,
  CURRENT_SCHEMA_VERSION,
  CURRENT_PROMPT_VERSION,
  CURRENT_ERA_TAG,
  formatEngineEraLabel,
  formatEngineVersion,
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
          filters.push((r) => r[col] === val)
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
  it('throws an error if no Supabase connection is configured', async () => {
    const service = new AdminService({ supabaseUrl: '', supabaseSecretKey: '' })
    expect(service.getIsConnected()).toBe(false)
    await expect(service.getOperationsOverview()).rejects.toThrow('Supabase client is not configured')
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

    expect(dataset.schemaVersion).toBe('2.2.0')
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
      expect(CURRENT_ENGINE_VERSION).toBe('1.0.1')
      expect(CURRENT_SCHEMA_VERSION).toBe('2.2.0')
      expect(CURRENT_PROMPT_VERSION).toBe('2.4.0')
      expect(CURRENT_ERA_TAG).toBe('engine_v1')
      expect(formatEngineVersion()).toBe('Engine v1.0.1')
      expect(formatEngineVersion('1.0.0')).toBe('Engine v1.0.0')
      expect(formatEngineEraLabel('engine_v1')).toBe('Engine v1.0.1')
      expect(formatEngineEraLabel('engine_v1', '1.0.0')).toBe('Engine v1.0.0')
      expect(formatEngineEraLabel('engine_v1', '1.0.1')).toBe('Engine v1.0.1')
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

      expect(currentExport.schemaVersion).toBe('2.2.0')
      expect(currentExport.provenance.era).toBe('current')
      expect(currentExport.provenance.currentEraName).toBe('Engine v1.0.1')
      expect(currentExport.provenance.currentEngineVersion).toBe('1.0.1')
      expect(currentExport.provenance.currentSchemaVersion).toBe('2.2.0')
      expect(currentExport.provenance.currentPromptVersion).toBe('2.4.0')
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
          schema_version: '2.2.0',
          prompt_version: '2.4.0',
          model_name: 'gemini-3.7-flash',
          quality_profile: 'gemini-3.7-flash',
          engine_version: '1.0.1',
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
            schemaVersion: '2.2.0',
            promptVersion: '2.4.0',
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
          schema_version: '2.2.0',
          prompt_version: '2.4.0',
          model_name: 'gpt-5.6-sol',
          quality_profile: 'default', // display object only, does not satisfy validity
          engine_version: '1.0.1',
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
            schemaVersion: '2.2.0',
            promptVersion: '2.4.0',
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
          schema_version: '2.2.0',
          prompt_version: '2.4.0',
          model_name: 'gpt-5.6-sol',
          quality_profile: null,
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
      const failures = await service.getFailureIntelligence('current')

      // Assert all 3 are in current era
      expect(failures.recentFailures.length).toBe(2)
      expect(failures.recentFailures.some((f) => (f.failureEvidence as any)?.findings?.some((fd: any) => fd.rule === 'MODEL_QUALITY_PROFILE_PROVENANCE_MISSING'))).toBe(true)
      expect(failures.recentFailures.some((f) => (f.failureEvidence as any)?.findings?.some((fd: any) => fd.rule === 'MODEL_QUALITY_PROFILE_PROVENANCE_INVALID'))).toBe(true)
    })
  })
})
