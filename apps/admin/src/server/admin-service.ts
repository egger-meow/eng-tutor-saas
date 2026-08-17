import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function loadRootEnv() {
  const possiblePaths = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
    resolve(process.cwd(), '../.env'),
    'C:\\IDEA\\eng-tutor-saas\\.env',
  ]
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, 'utf-8')
        for (const line of content.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue
          const eqIdx = trimmed.indexOf('=')
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim()
            const val = trimmed.slice(eqIdx + 1).trim()
            if (!process.env[key]) {
              process.env[key] = val
            }
          }
        }
        break
      } catch {}
    }
  }
}

export interface AdminConfig {
  supabaseUrl?: string
  supabaseSecretKey?: string
  client?: SupabaseClient
}

export interface OperationsOverview {
  systemHealth: 'healthy' | 'attention_needed' | 'critical'
  activeChildrenCount: number
  totalChildrenCount: number
  activeSubscriptionsCount: number
  subscriptionBreakdown: {
    paidActiveCount: number
    monthlyPaidCount: number
    annualPaidCount: number
    trialingCount: number
    pastDueCount: number
    canceledCount: number
    foundingRedeemedCount: number
    foundingEligibleCount: number
  }
  capacity: {
    activeCount: number
    maxCapacity: number
    status: 'open' | 'waitlist' | 'closed'
    foundingCount: number
    foundingLimit: number
  }
  queueStats: {
    pending: number
    claimed: number
    completed: number
    failed: number
    overdueOrStuck: number
  }
  finisherStats: {
    pending: number
    processing: number
    completed: number
    qualityRejected: number
    technicalFailed: number
  }
  recentDeliveries: Array<{
    id: string
    childId: string
    childPseudonym: string
    materialWeek: string
    revision: number
    ruleVersion: string
    modelName: string | null
    createdAt: string
    hasStudentPdf: boolean
    hasParentPdf: boolean
  }>
  stuckJobs: Array<{
    id: string
    childId: string
    childPseudonym: string
    materialWeek: string
    status: string
    claimedBy: string | null
    leaseExpiresAt: string | null
    generationDueAt: string | null
    attemptCount: number
    stuckReason: string
  }>
  anomalies: string[]
}

export interface FailureIntelligence {
  totalFailures: number
  failureRatePercent: number
  stageBreakdown: Array<{
    stage: 'worker_claim' | 'chatgpt_authoring' | 'finisher_audit' | 'pdf_rendering' | 'storage_upload' | 'unknown'
    label: string
    count: number
    percentage: number
  }>
  errorCodeClusters: Array<{
    errorCode: string
    stage: string
    count: number
    affectedChildrenCount: number
    firstSeen: string
    lastSeen: string
    sampleMessage: string
    suggestedRemedy: string
  }>
  qualityRuleViolations: Array<{
    rule: string
    category: 'lexical_ceiling' | 'forbidden_jargon' | 'prompt_clipped' | 'cap_deficit' | 'schema_mismatch' | 'other'
    count: number
    description: string
    sampleFinding: string
  }>
  dailyTrend: Array<{
    date: string
    total: number
    qualityRejected: number
    technicalFailed: number
  }>
  recentFailures: Array<{
    id: string
    jobId: string
    childPseudonym: string
    materialWeek: string
    stage: string
    errorCode: string
    errorMessage: string
    authoringAttempt: number
    timestamp: string
    failureEvidence: Record<string, unknown> | null
  }>
}

export interface ParentFeedbackIntelligence {
  totalSubmissions: number
  difficultyDistribution: {
    tooEasy: { count: number; percentage: number }
    good: { count: number; percentage: number }
    tooHard: { count: number; percentage: number }
  }
  completionRateDistribution: {
    rate0: number
    rate25: number
    rate5: number
    rate75: number
    rate100: number
  }
  weakAreaDistribution: Array<{
    area: 'vocabulary' | 'grammar' | 'reading' | 'writing' | 'mixed' | 'none'
    label: string
    count: number
    percentage: number
  }>
  topicClusters: Array<{
    topic: string
    category: 'difficulty' | 'vocabulary' | 'grammar' | 'reading' | 'school_exam' | 'positive' | 'interests' | 'quality_friction'
    frequency: number
    sentiment: 'positive' | 'neutral' | 'friction'
    sampleQuotes: string[]
  }>
  childVoiceQuotes: Array<{
    quote: string
    materialWeek: string
    childPseudonym: string
    difficulty: number | null
    weakArea: string | null
    createdAt: string
  }>
  recentFeedbackList: Array<{
    id: string
    childPseudonym: string
    materialWeek: string
    difficulty: string
    completionRate: number | null
    weakArea: string | null
    mistakesText: string | null
    childComments: string | null
    parentComments: string | null
    schoolProgressUpdate: string | null
    interestUpdate: string | null
    createdAt: string
  }>
}

export interface ProductFeedbackIntelligence {
  totalFeedbackCount: number
  categoryBreakdown: Array<{
    category: 'bug' | 'flow' | 'materials' | 'other'
    label: string
    count: number
    percentage: number
    recentMessages: string[]
  }>
  subscriptionFriction: {
    totalSubscriptions: number
    activeCount: number
    pastDueCount: number
    canceledCount: number
    cancelingAtPeriodEndCount: number
    cancellationReasons: Array<{
      reason: string
      count: number
    }>
  }
  instrumentationStatus: {
    collectedSources: Array<{ name: string; status: 'active'; description: string }>
    futureInstrumentationNeeded: Array<{ name: string; status: 'pending'; reason: string }>
  }
}

export interface LifecycleEvent {
  step: 'SCHEDULED' | 'FEEDBACK_CUTOFF' | 'JOB_CLAIMED' | 'SUBMISSION_AUTHORING' | 'FINISHER_AUDIT' | 'MATERIAL_STORED' | 'DELIVERY_RELEASED' | 'FEEDBACK_RECORDED'
  label: string
  status: 'completed' | 'processing' | 'failed' | 'warning' | 'skipped' | 'pending'
  timestamp: string | null
  details: Record<string, unknown>
  error?: string
}

export interface ChildWeekTimeline {
  childId: string
  childPseudonym: string
  grade: number
  textbookVersion: string | null
  isActive: boolean
  targetWeek: string
  subscriptionStatus: string
  planCode: string | null
  currentLearningSummary: {
    comprehensionAccuracy: number | null
    difficultyTrend: string | null
    recurringMistakesCount: number
  }
  events: LifecycleEvent[]
  availableChildren: Array<{
    id: string
    displayPseudonym: string
    grade: number
    subscriptionStatus: string
  }>
  rawMetadata: {
    job: Record<string, unknown> | null
    submissions: Array<Record<string, unknown>>
    material: Record<string, unknown> | null
    feedback: Record<string, unknown> | null
  }
}

export interface AiExportDataset {
  schemaVersion: string
  exportedAt: string
  environment: string
  summary: {
    activeChildren: number
    paidSubscriptions: number
    trialingSubscriptions: number
    totalFailures: number
    dominantFailureCode: string | null
    dominantParentFrictionTopic: string | null
    difficultyBalance: string
  }
  generationFailurePatterns: Array<{
    stage: string
    errorCode: string
    frequency: number
    sampleErrors: string[]
    remedyGuidance: string
  }>
  parentFeedbackThemes: Array<{
    theme: string
    category: string
    occurrenceCount: number
    representativeQuotes: string[]
    actionableHypothesis: string
  }>
  qualityRejectionRules: Array<{
    ruleName: string
    violationCount: number
    findingSummary: string
  }>
  subscriptionFrictionPatterns: Array<{
    issue: string
    count: number
  }>
}

export class AdminService {
  private client: SupabaseClient | null = null

  constructor(config?: AdminConfig) {
    if (config?.client) {
      this.client = config.client
      return
    }

    loadRootEnv()

    const url = config?.supabaseUrl !== undefined ? config.supabaseUrl : (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)
    const secretKey = config?.supabaseSecretKey !== undefined ? config.supabaseSecretKey : (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)

    if (url && secretKey && !secretKey.startsWith('sb_publishable_')) {
      this.client = createClient(url, secretKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    }
  }

  public getIsConnected(): boolean {
    return this.client !== null
  }

  private ensureClient(): SupabaseClient {
    if (!this.client) {
      throw new Error(
        'Supabase client is not configured. Please ensure SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env'
      )
    }
    return this.client
  }

  public async getOperationsOverview(): Promise<OperationsOverview> {
    const client = this.ensureClient()

    const [
      childrenRes,
      subsRes,
      jobsRes,
      materialsRes,
      enrollmentRes,
      submissionsRes,
    ] = await Promise.all([
      client.from('children').select('id, display_name, is_active'),
      client.from('subscriptions').select('id, child_id, status, plan_code, billing_interval, founding_status'),
      client.from('generation_jobs').select('*').order('created_at', { ascending: false }).limit(200),
      client.from('materials').select('id, child_id, material_week, revision, rule_version, model_name, student_pdf_path, parent_answer_pdf_path, created_at').order('created_at', { ascending: false }).limit(20),
      client.from('enrollment_settings').select('*').limit(1).maybeSingle(),
      client.from('generation_jobs').select('id, status').limit(200),
    ])

    const children = childrenRes.data || []
    const activeChildren = children.filter((c) => c.is_active)
    const subscriptions = subsRes.data || []

    let paidActiveCount = 0
    let monthlyPaidCount = 0
    let annualPaidCount = 0
    let trialingCount = 0
    let pastDueCount = 0
    let canceledCount = 0
    let foundingRedeemedCount = 0
    let foundingEligibleCount = 0

    for (const sub of subscriptions) {
      if (sub.status === 'active') {
        paidActiveCount++
        if (sub.billing_interval === 'year' || (sub.plan_code && sub.plan_code.includes('annual'))) {
          annualPaidCount++
        } else {
          monthlyPaidCount++
        }
      } else if (sub.status === 'trialing') {
        trialingCount++
      } else if (sub.status === 'past_due') {
        pastDueCount++
      } else if (sub.status === 'canceled') {
        canceledCount++
      }

      if (sub.founding_status === 'redeemed') {
        foundingRedeemedCount++
      } else if (sub.founding_status === 'eligible') {
        foundingEligibleCount++
      }
    }

    const jobs = jobsRes.data || []
    const materials = materialsRes.data || []

    const now = new Date().toISOString()
    const stuckJobs: OperationsOverview['stuckJobs'] = []
    const anomalies: string[] = []

    let pendingCount = 0
    let claimedCount = 0
    let completedCount = 0
    let failedCount = 0
    let overdueOrStuckCount = 0

    for (const job of jobs) {
      if (job.status === 'pending') pendingCount++
      else if (job.status === 'claimed') claimedCount++
      else if (job.status === 'completed') completedCount++
      else if (job.status === 'failed') failedCount++

      const isLeaseExpired = job.status === 'claimed' && job.lease_expires_at && job.lease_expires_at < now
      const isPastDue = job.status === 'pending' && job.generation_due_at && job.generation_due_at <= now
      const isExhausted = job.status === 'failed' && job.attempt_count >= (job.max_attempts || 3)

      if (isLeaseExpired || isPastDue || isExhausted) {
        overdueOrStuckCount++
        const child = children.find((c) => c.id === job.child_id)
        stuckJobs.push({
          id: job.id,
          childId: job.child_id,
          childPseudonym: this.maskName(child?.display_name, job.child_id),
          materialWeek: job.material_week,
          status: job.status,
          claimedBy: job.claimed_by,
          leaseExpiresAt: job.lease_expires_at,
          generationDueAt: job.generation_due_at,
          attemptCount: job.attempt_count,
          stuckReason: isLeaseExpired
            ? 'Claim lease expired without completion'
            : isPastDue
            ? 'Past generation deadline'
            : 'Max attempts exhausted',
        })
      }
    }

    // Finisher pipeline stats from generation_jobs / submissions
    let finisherPending = 0
    let finisherProcessing = 0
    let finisherCompleted = 0
    let finisherQualityRejected = 0
    let finisherTechnicalFailed = 0

    for (const job of jobs) {
      if (job.status === 'completed') finisherCompleted++
      else if (job.status === 'claimed') finisherProcessing++
      else if (job.status === 'pending') finisherPending++
      else if (job.error_code === 'QUALITY_REJECTED') finisherQualityRejected++
      else if (job.status === 'failed') finisherTechnicalFailed++
    }

    if (stuckJobs.length > 0) {
      anomalies.push(`檢測到 ${stuckJobs.length} 個逾期或租約逾時的生成任務需排查。`)
    }
    if (finisherQualityRejected > 3) {
      anomalies.push(`近期有 ${finisherQualityRejected} 次 Finisher 品質審核退回 (QUALITY_REJECTED)。`)
    }
    if (failedCount > 3) {
      anomalies.push(`生成佇列中存在 ${failedCount} 筆失敗任務。`)
    }

    const systemHealth: OperationsOverview['systemHealth'] =
      anomalies.length >= 2 || failedCount > 5 ? 'critical' : anomalies.length > 0 ? 'attention_needed' : 'healthy'

    const childMap = new Map(children.map((c) => [c.id, c.display_name]))
    const recentDeliveries = materials.map((m) => ({
      id: m.id,
      childId: m.child_id,
      childPseudonym: this.maskName(childMap.get(m.child_id), m.child_id),
      materialWeek: m.material_week,
      revision: m.revision,
      ruleVersion: m.rule_version,
      modelName: m.model_name,
      createdAt: m.created_at,
      hasStudentPdf: Boolean(m.student_pdf_path),
      hasParentPdf: Boolean(m.parent_answer_pdf_path),
    }))

    const enrollment = enrollmentRes.data
    const maxCapacity = enrollment?.capacity ?? enrollment?.max_capacity ?? 100
    const foundingLimit = enrollment?.founding_limit ?? 30
    const capacityStatus = enrollment?.status ?? enrollment?.capacity_status ?? (activeChildren.length >= maxCapacity ? 'closed' : 'open')

    const capacity: OperationsOverview['capacity'] = {
      activeCount: activeChildren.length,
      maxCapacity,
      status: capacityStatus as any,
      foundingCount: foundingRedeemedCount,
      foundingLimit,
    }

    return {
      systemHealth,
      activeChildrenCount: activeChildren.length,
      totalChildrenCount: children.length,
      activeSubscriptionsCount: paidActiveCount,
      subscriptionBreakdown: {
        paidActiveCount,
        monthlyPaidCount,
        annualPaidCount,
        trialingCount,
        pastDueCount,
        canceledCount,
        foundingRedeemedCount,
        foundingEligibleCount,
      },
      capacity,
      queueStats: {
        pending: pendingCount,
        claimed: claimedCount,
        completed: completedCount,
        failed: failedCount,
        overdueOrStuck: overdueOrStuckCount,
      },
      finisherStats: {
        pending: finisherPending,
        processing: finisherProcessing,
        completed: finisherCompleted,
        qualityRejected: finisherQualityRejected,
        technicalFailed: finisherTechnicalFailed,
      },
      recentDeliveries,
      stuckJobs: stuckJobs.slice(0, 10),
      anomalies,
    }
  }

  public async getFailureIntelligence(): Promise<FailureIntelligence> {
    const client = this.ensureClient()

    const [failedJobsRes, childrenRes] = await Promise.all([
      client.from('generation_jobs').select('*').or('status.eq.failed,error_code.not.is.null').order('created_at', { ascending: false }).limit(150),
      client.from('children').select('id, display_name'),
    ])

    const failedJobs = failedJobsRes.data || []
    const childMap = new Map((childrenRes.data || []).map((c) => [c.id, c.display_name]))

    return this.aggregateFailures(failedJobs, [], childMap)
  }

  public async getFeedbackIntelligence(): Promise<ParentFeedbackIntelligence> {
    const client = this.ensureClient()

    const [feedbackRes, childrenRes, materialsRes] = await Promise.all([
      client.from('feedback').select('*').order('created_at', { ascending: false }).limit(200),
      client.from('children').select('id, display_name'),
      client.from('materials').select('id, material_week'),
    ])

    const feedbackList = feedbackRes.data || []
    const childMap = new Map((childrenRes.data || []).map((c) => [c.id, c.display_name]))
    const materialMap = new Map((materialsRes.data || []).map((m) => [m.id, m.material_week]))

    return this.aggregateFeedback(feedbackList, childMap, materialMap)
  }

  public async getProductFeedbackIntelligence(): Promise<ProductFeedbackIntelligence> {
    const client = this.ensureClient()

    const [productFeedbackRes, subsRes] = await Promise.all([
      client.from('product_feedback').select('*').order('created_at', { ascending: false }).limit(200),
      client.from('subscriptions').select('id, status, cancel_at_period_end, cancellation_reason'),
    ])

    const feedbackItems = productFeedbackRes.data || []
    const subscriptions = subsRes.data || []

    const totalFeedbackCount = feedbackItems.length
    const categoryCounts: Record<string, { count: number; messages: string[] }> = {
      bug: { count: 0, messages: [] },
      flow: { count: 0, messages: [] },
      materials: { count: 0, messages: [] },
      other: { count: 0, messages: [] },
    }

    for (const item of feedbackItems) {
      const cat = item.category in categoryCounts ? item.category : 'other'
      categoryCounts[cat].count++
      if (categoryCounts[cat].messages.length < 5) {
        categoryCounts[cat].messages.push(item.message)
      }
    }

    const categoryLabels: Record<string, string> = {
      bug: '程式異常 / Bug',
      flow: '使用流程困惑',
      materials: '教材內容反饋',
      other: '其他建議',
    }

    const categoryBreakdown: ProductFeedbackIntelligence['categoryBreakdown'] = (['bug', 'flow', 'materials', 'other'] as const).map((cat) => ({
      category: cat,
      label: categoryLabels[cat],
      count: categoryCounts[cat].count,
      percentage: totalFeedbackCount > 0 ? Math.round((categoryCounts[cat].count / totalFeedbackCount) * 100) : 0,
      recentMessages: categoryCounts[cat].messages,
    }))

    let activeCount = 0
    let pastDueCount = 0
    let canceledCount = 0
    let cancelingAtPeriodEndCount = 0
    const reasonCounts: Record<string, number> = {}

    for (const sub of subscriptions) {
      if (sub.status === 'active' || sub.status === 'trialing') activeCount++
      else if (sub.status === 'past_due') pastDueCount++
      else if (sub.status === 'canceled') canceledCount++

      if (sub.cancel_at_period_end) cancelingAtPeriodEndCount++

      if (sub.cancellation_reason) {
        reasonCounts[sub.cancellation_reason] = (reasonCounts[sub.cancellation_reason] || 0) + 1
      }
    }

    return {
      totalFeedbackCount,
      categoryBreakdown,
      subscriptionFriction: {
        totalSubscriptions: subscriptions.length,
        activeCount,
        pastDueCount,
        canceledCount,
        cancelingAtPeriodEndCount,
        cancellationReasons: Object.entries(reasonCounts).map(([reason, count]) => ({ reason, count })),
      },
      instrumentationStatus: {
        collectedSources: [
          { name: 'Product Feedback Table', status: 'active', description: 'Parent bug/flow/materials direct submissions' },
          { name: 'Subscription State & Cancellation Reason', status: 'active', description: 'Paddle subscription transitions and churn reasons' },
          { name: 'Weekly Lesson Feedback', status: 'active', description: 'Structured difficulty, weak areas, and freeform child voice' },
          { name: 'Generation & Finisher Error Diagnostics', status: 'active', description: 'Deterministic audit findings and failure evidence' },
        ],
        futureInstrumentationNeeded: [
          { name: 'Landing Page & Funnel Telemetry', status: 'pending', reason: 'PostHog / Umami integration pending for public traffic conversion' },
          { name: 'PDF Signed URL Download Events', status: 'pending', reason: 'Track whether parents actually opened/printed the PDF' },
          { name: 'Onboarding Multi-Child Step Dropoff', status: 'pending', reason: 'Granular step-by-step form abandonment logging' },
        ],
      },
    }
  }

  public async getChildWeekTimeline(childId?: string, targetWeek?: string): Promise<ChildWeekTimeline> {
    const client = this.ensureClient()

    const [allChildrenRes, allSubsRes] = await Promise.all([
      client.from('children').select('id, display_name, grade, is_active').order('created_at', { ascending: false }),
      client.from('subscriptions').select('child_id, status'),
    ])

    const allChildrenData = allChildrenRes.data || []
    const subStatusMap = new Map((allSubsRes.data || []).map((s) => [s.child_id, s.status]))

    const availableChildren = allChildrenData.map((c) => ({
      id: c.id,
      displayPseudonym: this.maskName(c.display_name, c.id),
      grade: c.grade,
      subscriptionStatus: subStatusMap.get(c.id) || 'none',
    }))

    if (!childId) {
      if (availableChildren.length > 0) {
        childId = availableChildren[0].id
      } else {
        return this.buildEmptyTimeline(targetWeek || new Date().toISOString().slice(0, 10), 'none', availableChildren)
      }
    }

    const [childRes, subRes, jobRes, learningRes] = await Promise.all([
      client.from('children').select('*').eq('id', childId).maybeSingle(),
      client.from('subscriptions').select('*').eq('child_id', childId).maybeSingle(),
      client.from('generation_jobs').select('*').eq('child_id', childId).order('created_at', { ascending: false }).limit(10),
      client.from('child_learning_state').select('*').eq('child_id', childId).maybeSingle(),
    ])

    const child = childRes.data
    if (!child) {
      return this.buildEmptyTimeline(targetWeek || new Date().toISOString().slice(0, 10), childId, availableChildren)
    }

    const jobs = jobRes.data || []
    const selectedJob = (targetWeek ? jobs.find((j) => j.material_week === targetWeek) : jobs[0]) || jobs[0]
    const actualWeek = selectedJob?.material_week || targetWeek || new Date().toISOString().slice(0, 10)

    let submissions: any[] = []
    let material: any = null
    let feedback: any = null

    if (selectedJob) {
      const [matRes, fbRes] = await Promise.all([
        selectedJob.material_id ? client.from('materials').select('*').eq('id', selectedJob.material_id).maybeSingle() : Promise.resolve({ data: null }),
        client.from('feedback').select('*').eq('child_id', childId).order('created_at', { ascending: false }).limit(1),
      ])
      material = matRes.data
      feedback = fbRes.data?.[0] || null
    }

    return this.buildLifecycleTimeline({
      child,
      subscription: subRes.data,
      job: selectedJob,
      submissions,
      material,
      feedback,
      learningState: learningRes.data,
      targetWeek: actualWeek,
      availableChildren,
    })
  }

  public async getAiExportDataset(): Promise<AiExportDataset> {
    const [overview, failures, feedback, product] = await Promise.all([
      this.getOperationsOverview(),
      this.getFailureIntelligence(),
      this.getFeedbackIntelligence(),
      this.getProductFeedbackIntelligence(),
    ])

    const dominantFailure = failures.errorCodeClusters[0]?.errorCode || null
    const dominantFrictionTopic = feedback.topicClusters.find((t) => t.sentiment === 'friction')?.topic || null

    const totalDiff = feedback.difficultyDistribution.tooEasy.count + feedback.difficultyDistribution.good.count + feedback.difficultyDistribution.tooHard.count
    const difficultyBalance = totalDiff > 0
      ? `Good: ${feedback.difficultyDistribution.good.percentage}%, Too Hard: ${feedback.difficultyDistribution.tooHard.percentage}%, Too Easy: ${feedback.difficultyDistribution.tooEasy.percentage}%`
      : 'No Feedback'

    const generationFailurePatterns = failures.errorCodeClusters.map((cluster) => ({
      stage: cluster.stage,
      errorCode: cluster.errorCode,
      frequency: cluster.count,
      sampleErrors: [cluster.sampleMessage],
      remedyGuidance: cluster.suggestedRemedy,
    }))

    const parentFeedbackThemes = feedback.topicClusters.map((cluster) => ({
      theme: cluster.topic,
      category: cluster.category,
      occurrenceCount: cluster.frequency,
      representativeQuotes: cluster.sampleQuotes,
      actionableHypothesis: cluster.sentiment === 'friction'
        ? `Adjust generator curriculum rules to relieve friction in "${cluster.topic}".`
        : `Maintain positive engagement factors identified in "${cluster.topic}".`,
    }))

    const qualityRejectionRules = failures.qualityRuleViolations.map((rule) => ({
      ruleName: rule.rule,
      violationCount: rule.count,
      findingSummary: rule.sampleFinding,
    }))

    const subscriptionFrictionPatterns = product.subscriptionFriction.cancellationReasons.map((r) => ({
      issue: r.reason,
      count: r.count,
    }))

    return {
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      environment: 'production_database',
      summary: {
        activeChildren: overview.activeChildrenCount,
        paidSubscriptions: overview.subscriptionBreakdown.paidActiveCount,
        trialingSubscriptions: overview.subscriptionBreakdown.trialingCount,
        totalFailures: failures.totalFailures,
        dominantFailureCode: dominantFailure,
        dominantParentFrictionTopic: dominantFrictionTopic,
        difficultyBalance,
      },
      generationFailurePatterns,
      parentFeedbackThemes,
      qualityRejectionRules,
      subscriptionFrictionPatterns,
    }
  }

  // ==========================================
  // Data Aggregation & Sanitization Algorithms
  // ==========================================

  private maskName(name?: string | null, id?: string): string {
    if (!name || name.trim().length === 0) {
      return `Child #${(id || '0000').slice(0, 4)}`
    }
    const trimmed = name.trim()
    if (trimmed.length <= 1) return `${trimmed}*`
    return `${trimmed[0]}*${trimmed.slice(2)}`
  }

  private aggregateFailures(failedJobs: any[], failedSubmissions: any[], childMap: Map<string, string>): FailureIntelligence {
    const stageCounts: Record<string, number> = {
      worker_claim: 0,
      chatgpt_authoring: 0,
      finisher_audit: 0,
      pdf_rendering: 0,
      storage_upload: 0,
      unknown: 0,
    }

    const errorClusters: Record<string, {
      stage: string
      count: number
      affectedChildren: Set<string>
      firstSeen: string
      lastSeen: string
      sampleMessage: string
      suggestedRemedy: string
    }> = {}

    const qualityRules: Record<string, { count: number; category: string; description: string; sampleFinding: string }> = {}
    const dailyCounts: Record<string, { total: number; qualityRejected: number; technicalFailed: number }> = {}
    const recentFailuresList: FailureIntelligence['recentFailures'] = []

    for (const job of failedJobs) {
      const code = job.error_code || 'JOB_FAILED'
      const msg = job.error_message || 'Unknown generation job failure'
      const stage = this.classifyStage(code, msg)
      stageCounts[stage]++

      const dateStr = (job.created_at || new Date().toISOString()).slice(0, 10)
      if (!dailyCounts[dateStr]) dailyCounts[dateStr] = { total: 0, qualityRejected: 0, technicalFailed: 0 }
      dailyCounts[dateStr].total++
      dailyCounts[dateStr].technicalFailed++

      if (!errorClusters[code]) {
        errorClusters[code] = {
          stage,
          count: 0,
          affectedChildren: new Set(),
          firstSeen: job.created_at,
          lastSeen: job.created_at,
          sampleMessage: msg,
          suggestedRemedy: this.suggestRemedy(code),
        }
      }
      errorClusters[code].count++
      errorClusters[code].affectedChildren.add(job.child_id)
      if (job.created_at > errorClusters[code].lastSeen) {
        errorClusters[code].lastSeen = job.created_at
        errorClusters[code].sampleMessage = msg
      }

      if (code === 'QUALITY_REJECTED' || msg.includes('Quality rubric') || msg.includes('Ceiling') || msg.includes('Jargon') || msg.includes('Guard')) {
        const ruleName = msg.includes(':') ? msg.split(':')[1].trim() : (code === 'QUALITY_REJECTED' ? 'Quality Rubric Rule' : code)
        if (!qualityRules[ruleName]) {
          qualityRules[ruleName] = {
            count: 0,
            category: this.classifyQualityCategory(ruleName),
            description: msg,
            sampleFinding: msg,
          }
        }
        qualityRules[ruleName].count++
      }

      recentFailuresList.push({
        id: job.id,
        jobId: job.id,
        childPseudonym: this.maskName(childMap.get(job.child_id), job.child_id),
        materialWeek: job.material_week,
        stage,
        errorCode: code,
        errorMessage: msg,
        authoringAttempt: job.attempt_count,
        timestamp: job.created_at,
        failureEvidence: null,
      })
    }

    const total = stageCounts.worker_claim + stageCounts.chatgpt_authoring + stageCounts.finisher_audit + stageCounts.pdf_rendering + stageCounts.storage_upload + stageCounts.unknown
    const stageBreakdown: FailureIntelligence['stageBreakdown'] = [
      { stage: 'finisher_audit', label: 'Finisher 審核與品質驗證', count: stageCounts.finisher_audit, percentage: total > 0 ? Math.round((stageCounts.finisher_audit / total) * 100) : 0 },
      { stage: 'chatgpt_authoring', label: 'ChatGPT 教材生成結構', count: stageCounts.chatgpt_authoring, percentage: total > 0 ? Math.round((stageCounts.chatgpt_authoring / total) * 100) : 0 },
      { stage: 'pdf_rendering', label: 'PDF 排版與渲染', count: stageCounts.pdf_rendering, percentage: total > 0 ? Math.round((stageCounts.pdf_rendering / total) * 100) : 0 },
      { stage: 'worker_claim', label: '工作排程與租約鎖定', count: stageCounts.worker_claim, percentage: total > 0 ? Math.round((stageCounts.worker_claim / total) * 100) : 0 },
      { stage: 'storage_upload', label: '檔案儲存與私有 Bucket', count: stageCounts.storage_upload, percentage: total > 0 ? Math.round((stageCounts.storage_upload / total) * 100) : 0 },
    ]

    const errorCodeClusters: FailureIntelligence['errorCodeClusters'] = Object.entries(errorClusters).map(([code, data]) => ({
      errorCode: code,
      stage: data.stage,
      count: data.count,
      affectedChildrenCount: data.affectedChildren.size,
      firstSeen: data.firstSeen,
      lastSeen: data.lastSeen,
      sampleMessage: data.sampleMessage,
      suggestedRemedy: data.suggestedRemedy,
    })).sort((a, b) => b.count - a.count)

    const qualityRuleViolations: FailureIntelligence['qualityRuleViolations'] = Object.entries(qualityRules).map(([rule, data]) => ({
      rule,
      category: data.category as any,
      count: data.count,
      description: data.description,
      sampleFinding: data.sampleFinding,
    })).sort((a, b) => b.count - a.count)

    const dailyTrend: FailureIntelligence['dailyTrend'] = Object.entries(dailyCounts)
      .map(([date, d]) => ({ date, total: d.total, qualityRejected: d.qualityRejected, technicalFailed: d.technicalFailed }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)

    return {
      totalFailures: total,
      failureRatePercent: 0,
      stageBreakdown,
      errorCodeClusters,
      qualityRuleViolations,
      dailyTrend,
      recentFailures: recentFailuresList.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 20),
    }
  }

  private aggregateFeedback(feedbackList: any[], childMap: Map<string, string>, materialMap: Map<string, string>): ParentFeedbackIntelligence {
    let easyCount = 0
    let goodCount = 0
    let hardCount = 0

    let r0 = 0
    let r25 = 0
    let r50 = 0
    let r75 = 0
    let r100 = 0

    const weakCounts: Record<string, number> = {
      vocabulary: 0,
      grammar: 0,
      reading: 0,
      writing: 0,
      mixed: 0,
      none: 0,
    }

    const keywordBuckets: Record<string, { category: string; count: number; sentiment: 'positive' | 'neutral' | 'friction'; quotes: string[] }> = {
      '太長 / 篇幅偏多': { category: 'difficulty', count: 0, sentiment: 'friction', quotes: [] },
      '教材品質不滿 / 亂做 / 缺中文': { category: 'quality_friction', count: 0, sentiment: 'friction', quotes: [] },
      '單字難度過高': { category: 'vocabulary', count: 0, sentiment: 'friction', quotes: [] },
      '文法觀念混淆': { category: 'grammar', count: 0, sentiment: 'friction', quotes: [] },
      '閱讀很有趣 / 喜歡主題': { category: 'positive', count: 0, sentiment: 'positive', quotes: [] },
      '學校段考準備需求': { category: 'school_exam', count: 0, sentiment: 'neutral', quotes: [] },
      '主動完成 / 難度剛好': { category: 'positive', count: 0, sentiment: 'positive', quotes: [] },
      '科技 / 動漫興趣': { category: 'interests', count: 0, sentiment: 'neutral', quotes: [] },
    }

    const childVoiceQuotesList: ParentFeedbackIntelligence['childVoiceQuotes'] = []
    const recentList: ParentFeedbackIntelligence['recentFeedbackList'] = []

    for (const fb of feedbackList) {
      if (fb.difficulty === 1 || fb.difficulty === 2) easyCount++
      else if (fb.difficulty === 3) goodCount++
      else if (fb.difficulty === 4 || fb.difficulty === 5) hardCount++

      if (fb.completion_rate === 0) r0++
      else if (fb.completion_rate === 25) r25++
      else if (fb.completion_rate === 50) r50++
      else if (fb.completion_rate === 75) r75++
      else if (fb.completion_rate === 100) r100++

      if (fb.weak_area && fb.weak_area in weakCounts) {
        weakCounts[fb.weak_area]++
      } else {
        weakCounts.none++
      }

      const allText = [fb.child_comments, fb.parent_comments, fb.mistakes_text, fb.notes, fb.school_progress_update, fb.interest_update]
        .filter(Boolean)
        .join(' ')

      if (/太長|寫不完|耗時|篇幅/i.test(allText)) {
        keywordBuckets['太長 / 篇幅偏多'].count++
        if (keywordBuckets['太長 / 篇幅偏多'].quotes.length < 3 && fb.child_comments) keywordBuckets['太長 / 篇幅偏多'].quotes.push(fb.child_comments)
      }
      if (/亂做|超爛|中文|沒中文|法克|三小|很爛|糟糕/i.test(allText)) {
        keywordBuckets['教材品質不滿 / 亂做 / 缺中文'].count++
        if (keywordBuckets['教材品質不滿 / 亂做 / 缺中文'].quotes.length < 3 && fb.parent_comments) keywordBuckets['教材品質不滿 / 亂做 / 缺中文'].quotes.push(fb.parent_comments)
      }
      if (/單字|生字|背不起來|太難|看不太懂/i.test(allText)) {
        keywordBuckets['單字難度過高'].count++
        if (keywordBuckets['單字難度過高'].quotes.length < 3 && fb.parent_comments) keywordBuckets['單字難度過高'].quotes.push(fb.parent_comments)
      }
      if (/文法|時態|句型|被動|關係詞/i.test(allText)) {
        keywordBuckets['文法觀念混淆'].count++
        if (keywordBuckets['文法觀念混淆'].quotes.length < 3 && fb.mistakes_text) keywordBuckets['文法觀念混淆'].quotes.push(fb.mistakes_text)
      }
      if (/有趣|喜歡|好讀|精彩|進步/i.test(allText)) {
        keywordBuckets['閱讀很有趣 / 喜歡主題'].count++
        if (keywordBuckets['閱讀很有趣 / 喜歡主題'].quotes.length < 3 && fb.child_comments) keywordBuckets['閱讀很有趣 / 喜歡主題'].quotes.push(fb.child_comments)
      }
      if (/段考|月考|會考|模擬考|學校進度/i.test(allText)) {
        keywordBuckets['學校段考準備需求'].count++
        if (keywordBuckets['學校段考準備需求'].quotes.length < 3 && fb.school_progress_update) keywordBuckets['學校段考準備需求'].quotes.push(fb.school_progress_update)
      }
      if (/主動|自己寫完|剛剛好|順暢/i.test(allText)) {
        keywordBuckets['主動完成 / 難度剛好'].count++
        if (keywordBuckets['主動完成 / 難度剛好'].quotes.length < 3 && fb.parent_comments) keywordBuckets['主動完成 / 難度剛好'].quotes.push(fb.parent_comments)
      }
      if (/恐龍|籃球|動漫|AI|太空|電玩|遊戲/i.test(allText)) {
        keywordBuckets['科技 / 動漫興趣'].count++
        if (keywordBuckets['科技 / 動漫興趣'].quotes.length < 3 && fb.interest_update) keywordBuckets['科技 / 動漫興趣'].quotes.push(fb.interest_update)
      }

      const pseudonym = this.maskName(childMap.get(fb.child_id), fb.child_id)
      const week = materialMap.get(fb.material_id) || fb.created_at?.slice(0, 10) || '2026-08-17'

      if (fb.child_comments) {
        childVoiceQuotesList.push({
          quote: fb.child_comments,
          materialWeek: week,
          childPseudonym: pseudonym,
          difficulty: fb.difficulty,
          weakArea: fb.weak_area,
          createdAt: fb.created_at,
        })
      }

      recentList.push({
        id: fb.id,
        childPseudonym: pseudonym,
        materialWeek: week,
        difficulty: fb.difficulty === 1 || fb.difficulty === 2 ? 'too_easy' : fb.difficulty === 3 ? 'good' : 'too_hard',
        completionRate: fb.completion_rate,
        weakArea: fb.weak_area,
        mistakesText: fb.mistakes_text,
        childComments: fb.child_comments,
        parentComments: fb.parent_comments,
        schoolProgressUpdate: fb.school_progress_update,
        interestUpdate: fb.interest_update,
        createdAt: fb.created_at,
      })
    }

    const total = feedbackList.length
    const topicClusters: ParentFeedbackIntelligence['topicClusters'] = Object.entries(keywordBuckets).map(([topic, data]) => ({
      topic,
      category: data.category as any,
      frequency: data.count,
      sentiment: data.sentiment,
      sampleQuotes: data.quotes,
    })).filter((t) => t.frequency > 0).sort((a, b) => b.frequency - a.frequency)

    const weakLabels: Record<string, string> = {
      vocabulary: '單字理解與拼字',
      grammar: '文法與句型運用',
      reading: '篇章長文閱讀理解',
      writing: '手寫造句與表達',
      mixed: '綜合弱項',
      none: '無明顯卡點',
    }

    return {
      totalSubmissions: total,
      difficultyDistribution: {
        tooEasy: { count: easyCount, percentage: total > 0 ? Math.round((easyCount / total) * 100) : 0 },
        good: { count: goodCount, percentage: total > 0 ? Math.round((goodCount / total) * 100) : 0 },
        tooHard: { count: hardCount, percentage: total > 0 ? Math.round((hardCount / total) * 100) : 0 },
      },
      completionRateDistribution: {
        rate0: r0,
        rate25: r25,
        rate5: r50,
        rate75: r75,
        rate100: r100,
      },
      weakAreaDistribution: (['vocabulary', 'grammar', 'reading', 'writing', 'mixed', 'none'] as const).map((area) => ({
        area,
        label: weakLabels[area],
        count: weakCounts[area],
        percentage: total > 0 ? Math.round((weakCounts[area] / total) * 100) : 0,
      })),
      topicClusters,
      childVoiceQuotes: childVoiceQuotesList.slice(0, 15),
      recentFeedbackList: recentList.slice(0, 20),
    }
  }

  private buildEmptyTimeline(targetWeek: string, childId = 'none', availableChildren: ChildWeekTimeline['availableChildren'] = []): ChildWeekTimeline {
    return {
      childId,
      childPseudonym: '尚未選擇孩子',
      grade: 7,
      textbookVersion: null,
      isActive: false,
      targetWeek,
      subscriptionStatus: 'none',
      planCode: null,
      currentLearningSummary: {
        comprehensionAccuracy: null,
        difficultyTrend: null,
        recurringMistakesCount: 0,
      },
      events: [],
      availableChildren,
      rawMetadata: {
        job: null,
        submissions: [],
        material: null,
        feedback: null,
      },
    }
  }

  private buildLifecycleTimeline(data: {
    child: any
    subscription: any
    job: any
    submissions: any[]
    material: any
    feedback: any
    learningState: any
    targetWeek: string
    availableChildren: ChildWeekTimeline['availableChildren']
  }): ChildWeekTimeline {
    const { child, subscription, job, submissions, material, feedback, learningState, targetWeek, availableChildren } = data

    const events: LifecycleEvent[] = [
      {
        step: 'SCHEDULED',
        label: '每週發行排程確立',
        status: job ? 'completed' : 'pending',
        timestamp: job?.created_at || child.created_at,
        details: {
          deliveryWeekday: child.delivery_weekday,
          scheduledFor: job?.scheduled_for,
          generationDueAt: job?.generation_due_at,
          timezone: child.timezone,
        },
      },
      {
        step: 'FEEDBACK_CUTOFF',
        label: '家長反饋收件截止 (發行前 48h)',
        status: job?.feedback_missing === false || job?.status === 'completed' ? 'completed' : job?.feedback_cutoff_at ? 'warning' : 'pending',
        timestamp: job?.feedback_cutoff_at,
        details: {
          feedbackCutoffAt: job?.feedback_cutoff_at,
          feedbackMissing: job?.feedback_missing,
          sourceMaterialId: job?.source_material_id,
        },
      },
      {
        step: 'JOB_CLAIMED',
        label: 'ChatGPT Worker 認領任務',
        status: job?.status === 'claimed' || job?.status === 'completed' ? 'completed' : job?.status === 'failed' ? 'failed' : 'pending',
        timestamp: job?.updated_at,
        details: {
          claimedBy: job?.claimed_by,
          leaseExpiresAt: job?.lease_expires_at,
          attemptCount: job?.attempt_count,
          idempotencyKey: job?.idempotency_key,
        },
      },
      {
        step: 'SUBMISSION_AUTHORING',
        label: 'ChatGPT 生成 Canonical 封包',
        status: submissions.length > 0 || job?.status === 'completed' ? 'completed' : 'pending',
        timestamp: submissions[0]?.submitted_at || job?.updated_at,
        details: {
          attempts: submissions.map((s) => ({
            attempt: s.authoring_attempt,
            status: s.status,
            submittedAt: s.submitted_at,
          })),
        },
      },
      {
        step: 'FINISHER_AUDIT',
        label: 'GitHub Actions Finisher 審核與驗證',
        status: material ? 'completed' : submissions.some((s) => s.status === 'quality_rejected') ? 'failed' : 'pending',
        timestamp: submissions[submissions.length - 1]?.processed_at || material?.created_at,
        details: {
          lastOutcome: submissions[submissions.length - 1]?.status || (material ? 'completed' : 'pending'),
          failureEvidence: submissions[submissions.length - 1]?.failure_evidence || null,
        },
        error: submissions[submissions.length - 1]?.error_message || undefined,
      },
      {
        step: 'MATERIAL_STORED',
        label: 'PDF 渲染完成並寫入私有儲存',
        status: material ? 'completed' : 'pending',
        timestamp: material?.created_at,
        details: {
          materialId: material?.id,
          revision: material?.revision,
          studentPdfPath: material?.student_pdf_path,
          parentAnswerPdfPath: material?.parent_answer_pdf_path,
          promptVersion: material?.prompt_version,
          generatorVersion: material?.generator_version,
          modelName: material?.model_name,
        },
      },
      {
        step: 'DELIVERY_RELEASED',
        label: '家長端正式發行上線',
        status: material ? 'completed' : 'pending',
        timestamp: material?.created_at,
        details: {
          materialWeek: targetWeek,
          accessibleToParent: Boolean(material),
        },
      },
      {
        step: 'FEEDBACK_RECORDED',
        label: '家長每週學習反饋與記憶更新',
        status: feedback ? 'completed' : 'pending',
        timestamp: feedback?.created_at,
        details: {
          difficulty: feedback?.difficulty,
          completionRate: feedback?.completion_rate,
          weakArea: feedback?.weak_area,
          childVoice: feedback?.child_comments,
          learningStateUpdated: Boolean(learningState),
        },
      },
    ]

    return {
      childId: child.id,
      childPseudonym: this.maskName(child.display_name, child.id),
      grade: child.grade,
      textbookVersion: child.textbook_version,
      isActive: child.is_active,
      targetWeek,
      subscriptionStatus: subscription?.status || 'none',
      planCode: subscription?.plan_code || (subscription?.status === 'active' ? 'standard_monthly' : null),
      currentLearningSummary: {
        comprehensionAccuracy: learningState?.comprehension_accuracy ?? null,
        difficultyTrend: learningState?.difficulty_trend ?? null,
        recurringMistakesCount: Array.isArray(learningState?.recurring_mistakes) ? learningState.recurring_mistakes.length : 0,
      },
      events,
      availableChildren,
      rawMetadata: {
        job: job || null,
        submissions,
        material: material || null,
        feedback: feedback || null,
      },
    }
  }

  private classifyStage(code: string, msg: string): FailureIntelligence['stageBreakdown'][number]['stage'] {
    const upperCode = (code || '').toUpperCase()
    const upperMsg = (msg || '').toUpperCase()

    if (upperCode.includes('CLAIM') || upperCode.includes('LEASE') || upperCode.includes('LOCK')) return 'worker_claim'
    if (upperCode.includes('QUALITY') || upperCode.includes('AUDIT') || upperCode.includes('RUBRIC') || upperCode.includes('CEILING') || upperCode.includes('JARGON')) return 'finisher_audit'
    if (upperCode.includes('RENDER') || upperCode.includes('PDF') || upperCode.includes('PLAYWRIGHT') || upperCode.includes('CLIPPED')) return 'pdf_rendering'
    if (upperCode.includes('STORAGE') || upperCode.includes('UPLOAD') || upperCode.includes('BUCKET')) return 'storage_upload'
    if (upperCode.includes('SCHEMA') || upperCode.includes('JSON') || upperCode.includes('AUTHORING') || upperCode.includes('PROMPT')) return 'chatgpt_authoring'

    if (upperMsg.includes('PDF') || upperMsg.includes('RENDER')) return 'pdf_rendering'
    if (upperMsg.includes('SCHEMA') || upperMsg.includes('PARSE')) return 'chatgpt_authoring'
    if (upperMsg.includes('QUALITY') || upperMsg.includes('VOCABULARY')) return 'finisher_audit'

    return 'finisher_audit'
  }

  private suggestRemedy(code: string): string {
    switch (code) {
      case 'QUALITY_REJECTED':
        return '檢查 ChatGPT Prompt 中單字難度天花板與句型複雜度設定，確保符合該年級 CAP 範圍。'
      case 'CANONICAL_PROMPT_CLIPPED':
        return '題目題幹字數過長導致 PDF 區塊溢位截斷，調整題幹排版長度限制或行高。'
      case 'VOCABULARY_CEILING_EXCEEDED':
        return '生成的文章中出現超出國中 1200/2000 常用字庫之生僻單字，需加強 Lexical Ceiling 提示詞。'
      case 'FORBIDDEN_JARGON':
        return '生成的解說文字包含受限詞彙或成人術語，需更新過濾字庫清單。'
      case 'STORAGE_UPLOAD_FAILED':
        return 'Supabase Storage 網路逾時或權限不足，檢查 Service Role Key 與 Bucket 設定。'
      default:
        return '手動重啟 Worker: `pnpm worker` 進行修復或檢查詳細日誌。'
    }
  }

  private classifyQualityCategory(rule: string): 'lexical_ceiling' | 'forbidden_jargon' | 'prompt_clipped' | 'cap_deficit' | 'schema_mismatch' | 'other' {
    const r = (rule || '').toLowerCase()
    if (r.includes('ceiling') || r.includes('vocab')) return 'lexical_ceiling'
    if (r.includes('jargon') || r.includes('forbidden')) return 'forbidden_jargon'
    if (r.includes('clip') || r.includes('overflow')) return 'prompt_clipped'
    if (r.includes('cap') || r.includes('coverage')) return 'cap_deficit'
    if (r.includes('schema') || r.includes('version')) return 'schema_mismatch'
    return 'other'
  }
}

