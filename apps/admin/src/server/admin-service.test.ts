import { describe, expect, it } from 'vitest'
import { AdminService } from './admin-service.js'

function createMockSupabaseClient(tableData: Record<string, any[]>) {
  return {
    from: (tableName: string) => {
      const rows = tableData[tableName] || []
      const builder: any = {
        select: () => builder,
        order: () => builder,
        limit: () => builder,
        or: () => builder,
        in: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({ data: rows[0] || null, error: null }),
        then: (resolve: (res: { data: any[]; error: null }) => void) => {
          return Promise.resolve({ data: rows, error: null }).then(resolve)
        },
      }
      return builder
    },
  } as any
}

describe('AdminService', () => {
  it('throws an error if no Supabase connection is configured', async () => {
    const service = new AdminService({ supabaseUrl: '', supabaseSecretKey: '' })
    expect(service.getIsConnected()).toBe(false)
    await expect(service.getOperationsOverview()).rejects.toThrow('Supabase client is not configured')
  })

  it('aggregates real database rows for Operations Overview', async () => {
    const mockClient = createMockSupabaseClient({
      children: [
        { id: 'c-1', display_name: '林大豪', is_active: true },
        { id: 'c-2', display_name: '陳小安', is_active: false },
      ],
      subscriptions: [
        { id: 'sub-1', status: 'active', plan_code: 'standard_monthly', founding_status: 'none' },
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
        { active_count: 1, max_capacity: 100, capacity_status: 'open', founding_count: 5, founding_limit: 30 },
      ],
      curriculum_submissions: [
        { job_id: 'job-1', status: 'completed' },
      ],
    })

    const service = new AdminService({ client: mockClient })
    const overview = await service.getOperationsOverview()

    expect(overview.activeChildrenCount).toBe(1)
    expect(overview.totalChildrenCount).toBe(2)
    expect(overview.activeSubscriptionsCount).toBe(1)
    expect(overview.subscriptionBreakdown.paidActiveCount).toBe(1)
    expect(overview.subscriptionBreakdown.monthlyPaidCount).toBe(1)
    expect(overview.capacity.maxCapacity).toBe(100)
    expect(overview.queueStats.claimed).toBe(1)
    expect(overview.stuckJobs.length).toBe(1)
    expect(overview.stuckJobs[0].stuckReason).toContain('lease expired')
    expect(overview.recentDeliveries[0].childPseudonym).toBe('林*豪')
  })

  it('aggregates Failure Intelligence with stage breakdown, error code clusters, and quality rules', async () => {
    const mockClient = createMockSupabaseClient({
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
        {
          id: 'job-err-2',
          child_id: 'c-1',
          material_week: '2026-08-17',
          error_code: 'QUALITY_REJECTED',
          error_message: 'Quality rubric violation: Lexical Ceiling Guard',
          attempt_count: 1,
          created_at: '2026-08-17T02:00:00Z',
        },
      ],
      children: [{ id: 'c-1', display_name: '林大豪' }],
    })

    const service = new AdminService({ client: mockClient })
    const failures = await service.getFailureIntelligence()

    expect(failures.totalFailures).toBe(2)
    expect(failures.stageBreakdown.length).toBe(5)

    const clipped = failures.errorCodeClusters.find((c) => c.errorCode === 'CANONICAL_PROMPT_CLIPPED')
    expect(clipped).toBeDefined()
    expect(clipped?.stage).toBe('pdf_rendering')

    expect(failures.qualityRuleViolations.length).toBe(1)
    expect(failures.qualityRuleViolations[0].rule).toBe('Lexical Ceiling Guard')
    expect(failures.qualityRuleViolations[0].category).toBe('lexical_ceiling')
  })

  it('aggregates Parent Feedback Intelligence into distributions, topic clusters, and child voice', async () => {
    const mockClient = createMockSupabaseClient({
      feedback: [
        {
          id: 'fb-1',
          child_id: 'c-1',
          material_id: 'mat-1',
          difficulty: 4,
          completion_rate: 75,
          weak_area: 'grammar',
          child_comments: '閱讀文章太長了，寫到後面有點累',
          parent_comments: '孩子說篇幅偏多，但文法小卡有幫助',
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
    expect(feedback.completionRateDistribution.rate75).toBe(1)
    expect(feedback.weakAreaDistribution.find((w) => w.area === 'grammar')?.count).toBe(1)

    // Topic clustering
    const lengthCluster = feedback.topicClusters.find((t) => t.topic.includes('太長'))
    expect(lengthCluster).toBeDefined()
    expect(lengthCluster?.sentiment).toBe('friction')

    // Child voice
    expect(feedback.childVoiceQuotes.length).toBe(1)
    expect(feedback.childVoiceQuotes[0].quote).toContain('閱讀文章太長了')
    expect(feedback.childVoiceQuotes[0].childPseudonym).toBe('張*晴')
  })

  it('aggregates Product Feedback and distinguishes collected data from future instrumentation', async () => {
    const mockClient = createMockSupabaseClient({
      product_feedback: [
        { id: 'pf-1', category: 'materials', message: '希望能增加更多日常生活對話', created_at: '2026-08-17T00:00:00Z' },
      ],
      subscriptions: [
        { id: 'sub-1', status: 'canceled', cancel_at_period_end: false, cancellation_reason: '孩子課業太重' },
      ],
    })

    const service = new AdminService({ client: mockClient })
    const product = await service.getProductFeedbackIntelligence()

    expect(product.totalFeedbackCount).toBe(1)
    expect(product.categoryBreakdown.find((c) => c.category === 'materials')?.count).toBe(1)
    expect(product.subscriptionFriction.cancellationReasons[0].reason).toBe('孩子課業太重')
    expect(product.instrumentationStatus.collectedSources.length).toBe(4)
    expect(product.instrumentationStatus.futureInstrumentationNeeded.length).toBe(3)
  })

  it('constructs a unified Child / Week Lifecycle Timeline from database rows', async () => {
    const mockClient = createMockSupabaseClient({
      children: [{ id: 'c-1', display_name: '王小宇', grade: 8, delivery_weekday: 'Monday', timezone: 'Asia/Taipei', is_active: true }],
      subscriptions: [{ child_id: 'c-1', status: 'active', plan_code: 'standard_monthly' }],
      generation_jobs: [{ id: 'job-1', child_id: 'c-1', material_week: '2026-08-17', status: 'completed', material_id: 'mat-1' }],
      curriculum_submissions: [{ job_id: 'job-1', authoring_attempt: 1, status: 'completed' }],
      materials: [{ id: 'mat-1', child_id: 'c-1', material_week: '2026-08-17', revision: 1, student_pdf_path: 'path/student.pdf' }],
      feedback: [{ child_id: 'c-1', material_id: 'mat-1', difficulty: 3, completion_rate: 100 }],
      child_learning_state: [{ child_id: 'c-1', comprehension_accuracy: 0.85 }],
    })

    const service = new AdminService({ client: mockClient })
    const timeline = await service.getChildWeekTimeline('c-1', '2026-08-17')

    expect(timeline.childId).toBe('c-1')
    expect(timeline.childPseudonym).toBe('王*宇')
    expect(timeline.events.length).toBe(8)
    expect(timeline.events.every((e) => e.status === 'completed')).toBe(true)
  })

  it('produces structured, sanitized AI export dataset', async () => {
    const mockClient = createMockSupabaseClient({
      children: [{ id: 'c-1', display_name: '李小廷', is_active: true }],
      subscriptions: [{ id: 'sub-1', status: 'active' }],
      generation_jobs: [],
      materials: [],
      enrollment_settings: [],
      curriculum_submissions: [],
      feedback: [],
      product_feedback: [],
    })

    const service = new AdminService({ client: mockClient })
    const dataset = await service.getAiExportDataset()

    expect(dataset.schemaVersion).toBe('1.0.0')
    expect(dataset.exportedAt).toBeTruthy()
    expect(dataset.environment).toBe('production_database')
    expect(JSON.stringify(dataset)).not.toContain('secret')
  })
})
