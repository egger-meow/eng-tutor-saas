import { describe, expect, it } from 'vitest'
import { AdminService } from './admin-service.js'

function createMockSupabaseClient(tableData: Record<string, any[]>, tableErrors: Record<string, any> = {}, rpcHandlers: Record<string, any> = {}) {
  return {
    from: (tableName: string) => {
      const error = tableErrors[tableName] || null
      const rows = tableData[tableName] || []
      const builder: any = {
        select: () => builder,
        order: () => builder,
        limit: () => builder,
        or: () => builder,
        in: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({ data: error ? null : rows[0] || null, error }),
        then: (resolve: (res: { data: any[] | null; error: any }) => void) => {
          return Promise.resolve({ data: error ? null : rows, error }).then(resolve)
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
      const rows = tableData[fnName] || []
      return { data: rows, error: null }
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
        { job_id: 'job-1', authoring_attempt: 1, status: 'quality_rejected' },
        { job_id: 'job-1', authoring_attempt: 2, status: 'completed' },
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
      materials: [{ id: 'm-1', rule_version: '2.2.0', model_name: 'chatgpt-work-daily' }],
      enrollment_settings: [],
      curriculum_submissions: [],
      feedback: [],
      product_feedback: [],
    })

    const service = new AdminService({ client: mockClient })
    const dataset = await service.getAiExportDataset()

    expect(dataset.schemaVersion).toBe('1.0.0')
    expect(dataset.taxonomyVersion).toBe('cap-2.2.0')
    expect(dataset.ruleVersions).toContain('2.2.0')
    expect(dataset.generatorVersions).toContain('chatgpt-work-daily')
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
})
