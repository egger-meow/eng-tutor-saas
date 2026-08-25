import type { SupabaseClient } from '@supabase/supabase-js'

export {
  CURRENT_ENGINE_VERSION,
  CURRENT_SCHEMA_VERSION,
  CURRENT_PROMPT_VERSION,
  CURRENT_ERA_TAG,
  CURRENT_QUALITY_PROFILE_VERSION,
  CURRENT_ENGINE_MANIFEST,
  formatEngineEraLabel,
  formatEngineVersion,
} from '@paper-english/generator/engine-version'

import type { EraTag } from '@paper-english/generator/engine-version'
export type { EraTag }

export type TabId = 'overview' | 'subscriptions' | 'failures' | 'feedback' | 'product' | 'timeline' | 'waitlist' | 'export'

export interface HealthState {
  status: string
  connected: boolean
  timestamp: string
}

export interface DataSourceStatus {
  source: string
  status: 'healthy' | 'error' | 'empty'
  rowCount: number
  error?: string
  latencyMs: number
}

export type QualityEra = 'current' | 'historical' | 'all'

export interface QualityEraItem {
  schemaVersion?: string | null
  promptVersion?: string | null
  engineVersion?: string | null
  ruleVersion?: string | null
  failureEvidence?: any
  canonicalSource?: any
  errorCode?: string | null
  errorMessage?: string | null
  qualityProfile?: string | null
  modelQualityProfile?: any
  profileProvenance?: any
  resolvedQualityProfile?: string | null
  qualityEvidence?: any
  rawRow?: any
}

export function isCompleteProfileEvidence(evidence: string): boolean {
  return (
    evidence.includes('actualModel=') &&
    evidence.includes('resolvedQualityProfile=') &&
    evidence.includes('qualityProfileVersion=') &&
    evidence.includes('engineVersion=')
  )
}

export type ModelProfileProvenanceStatus = 'valid' | 'invalid' | 'missing'

export interface ModelProfileProvenanceAssessment {
  status: ModelProfileProvenanceStatus
  isValid: boolean
  hasCheck: boolean
  resolvedProfile?: string | null
  rule?: 'MODEL_QUALITY_PROFILE_PROVENANCE_MISSING' | 'MODEL_QUALITY_PROFILE_PROVENANCE_INVALID'
  message?: string
}

export function hasModelQualityProfileProvenance(item: QualityEraItem): boolean {
  return assessModelQualityProfileProvenance(item).isValid
}

export function assessModelQualityProfileProvenance(item: QualityEraItem): ModelProfileProvenanceAssessment {
  const checks = [
    ...(Array.isArray(item.canonicalSource?.qualityEvidence?.criticalChecks) ? item.canonicalSource.qualityEvidence.criticalChecks : []),
    ...(Array.isArray(item.qualityEvidence?.criticalChecks) ? item.qualityEvidence.criticalChecks : []),
    ...(Array.isArray(item.failureEvidence?.criticalChecks) ? item.failureEvidence.criticalChecks : []),
  ]
  const profileCheck = checks.find((c: any) => c && c.id === 'model-quality-profile')

  if (profileCheck) {
    const passed = profileCheck.passed === true
    const evidence = typeof profileCheck.evidence === 'string' ? profileCheck.evidence : ''
    const isComplete = isCompleteProfileEvidence(evidence)

    if (passed && isComplete) {
      const match = evidence.match(/resolvedQualityProfile=([^ |]+)/)
      return {
        status: 'valid',
        isValid: true,
        hasCheck: true,
        resolvedProfile: match ? match[1] : (item.resolvedQualityProfile ?? item.qualityProfile ?? null),
      }
    }

    return {
      status: 'invalid',
      isValid: false,
      hasCheck: true,
      resolvedProfile: null,
      rule: 'MODEL_QUALITY_PROFILE_PROVENANCE_INVALID',
      message: 'Current schema/prompt submission contains malformed or incomplete model-profile provenance.',
    }
  }

  // Metadata/profile objects may be displayed elsewhere, but MUST NEVER satisfy provenance validity for current submissions
  return {
    status: 'missing',
    isValid: false,
    hasCheck: false,
    resolvedProfile: item.resolvedQualityProfile || item.qualityProfile || item.modelQualityProfile?.resolvedQualityProfile || item.canonicalSource?.metadata?.modelQualityProfile?.resolvedQualityProfile || null,
    rule: 'MODEL_QUALITY_PROFILE_PROVENANCE_MISSING',
    message: 'Current schema/prompt submission is missing required model-profile provenance.',
  }
}

export function getEngineVersionFromItem(item: QualityEraItem): string | null {
  if (item.engineVersion) return item.engineVersion
  const meta = item.canonicalSource?.metadata
  if (meta?.engineVersion) return meta.engineVersion
  if (meta?.modelQualityProfile?.engineVersion) return meta.modelQualityProfile.engineVersion
  const fe = item.failureEvidence
  if (fe?.engineVersion) return fe.engineVersion
  if (fe?.modelQualityProfile?.engineVersion) return fe.modelQualityProfile.engineVersion
  if (item.rawRow?.engine_version) return item.rawRow.engine_version
  return null
}

export function classifyQualityEra(item: QualityEraItem): EraTag {
  const schema = item.schemaVersion || item.canonicalSource?.metadata?.schemaVersion || item.failureEvidence?.schemaVersion || null
  const prompt = item.promptVersion || item.canonicalSource?.metadata?.promptVersion || item.failureEvidence?.promptVersion || null

  const isSchema220 = Boolean(schema && (schema === '2.2.0' || schema.startsWith('2.2')))
  const isPrompt240 = Boolean(prompt && (prompt === '2.4.0' || prompt === '2.4.0-prod' || prompt.startsWith('2.4') || prompt === 'prompt/2.4.0'))

  // Era answers "which production contract authored this?". Provenance completeness is a
  // separate quality invariant. Missing or malformed profile provenance on a current submission must stay
  // visible in Current so Admin can report the violation instead of laundering it as Historical.
  if (isSchema220 && isPrompt240) {
    return 'engine_v1'
  }

  return 'historical'
}

export interface AdminConfig {
  supabaseUrl?: string
  supabaseSecretKey?: string
  client?: SupabaseClient
}

export interface OperationsOverview {
  systemHealth: 'healthy' | 'attention_needed' | 'degraded' | 'critical'
  selectedEra?: QualityEra
  dataSources: DataSourceStatus[]
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
    waitingCount?: number
    releasedCount?: number
    totalDemand: number
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
    totalSubmissions: number
    rejectionRatePercent: number
    eraBreakdown: {
      engineV1: {
        total: number
        completed: number
        qualityRejected: number
        technicalFailed: number
        rejectionRatePercent: number
      }
      historical: {
        total: number
        completed: number
        qualityRejected: number
        technicalFailed: number
        rejectionRatePercent: number
      }
    }
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
    maxAttempts?: number
    stuckReason: string
  }>
  anomalies: string[]
  pipeline: {
    readyToClaim: PipelineJobRow[]
    awaitingFinisher: PipelineJobRow[]
    finisherDone: PipelineJobRow[]
  }
  engineInspector: {
    expected: Record<string, string>
    aligned: boolean
    alignmentStatus: 'aligned' | 'version_drift' | 'unobservable'
    drift: Array<{
      source: string
      id: string
      component: string
      expected: string
      actual: string | null
      status: 'version_drift' | 'unobservable'
    }>
  }
}

export interface PipelineJobRow {
  jobId: string
  childId: string
  childPseudonym: string
  materialWeek: string
  attemptNumber: number
  maxAttempts: number
  retryState: 'first_attempt' | 'retry_waiting' | 'retry_in_progress' | 'exhausted' | 'delivered_first_try' | 'delivered_after_retry'
  feedbackStatus?: 'onboarding' | 'received' | 'waiting_feedback' | 'cutoff_passed'
  feedbackCutoffAt?: string | null
  createdAt: string
  updatedAt: string
  relevantTimestamp: string | null
  status: string
}

export interface FailureIntelligence {
  dataSources: DataSourceStatus[]
  selectedEra: QualityEra
  eraBreakdown: {
    currentEraName: string
    currentEngineVersion: string
    currentSchemaVersion: string
    currentPromptVersion: string
    currentTotalFailures: number
    historicalTotalFailures: number
    allTotalFailures: number
    currentJobsEvaluated: number
    historicalJobsEvaluated: number
    currentSubmissionsEvaluated: number
    historicalSubmissionsEvaluated: number
  }
  totalFailures: number
  failureRatePercent: number
  generationStats: {
    totalJobs: number
    terminalJobs: number
    completedJobs: number
    failedJobs: number
    pendingJobs: number
    claimedJobs: number
    failureRatePercent: number
  }
  finisherStats: {
    totalSubmissions: number
    completedSubmissions: number
    qualityRejectedSubmissions: number
    technicalFailedSubmissions: number
    rejectionRatePercent: number
  }
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
    era: EraTag
    engineVersion?: string | null
  }>
  qualityRuleViolations: Array<{
    rule: string
    category: 'lexical_ceiling' | 'forbidden_jargon' | 'prompt_clipped' | 'cap_deficit' | 'schema_mismatch' | 'other'
    count: number
    description: string
    sampleFinding: string
    era: EraTag
    engineVersion?: string | null
    affectedChildrenCount: number
    attempts: number[]
    recentExamples: Array<{
      jobId: string
      childPseudonym: string
      materialWeek: string
      attempt: number
      timestamp: string
      message: string
      evidence: Record<string, unknown>
    }>
  }>
  dailyTrend: Array<{
    date: string
    total: number
    qualityRejected: number
    technicalFailed: number
    currentCount: number
    historicalCount: number
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
    era: EraTag
    engineVersion: string | null
    schemaVersion: string | null
    promptVersion: string | null
    modelName: string | null
  }>
}

export interface ParentFeedbackIntelligence {
  dataSources: DataSourceStatus[]
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
  dataSources: DataSourceStatus[]
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
    trialingCount: number
    pastDueCount: number
    canceledCount: number
    cancelingAtPeriodEndCount: number
  }
  instrumentationStatus: {
    collectedSources: Array<{ name: string; status: 'active'; description: string }>
    futureInstrumentationNeeded: Array<{ name: string; status: 'pending'; reason: string }>
  }
  messages: Array<{
    id: string
    category: 'bug' | 'flow' | 'materials' | 'other'
    message: string
    createdAt: string
  }>
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
  dataSources: DataSourceStatus[]
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
  jobSummary?: {
    id: string
    status: string
    attemptCount: number
    maxAttempts: number
    isHumanReviewRequired: boolean
    claimedBy: string | null
    leaseExpiresAt: string | null
    errorCode: string | null
    errorMessage: string | null
  } | null
  events: LifecycleEvent[]
  availableChildren: Array<{
    id: string
    displayPseudonym: string
    grade: number
    subscriptionStatus: string
  }>
  testModeStatus?: GenerationTestModeStatus | null
  rawMetadata: {
    job: Record<string, unknown> | null
    submissions: Array<Record<string, unknown>>
    material: Record<string, unknown> | null
    feedback: Record<string, unknown> | null
    testModeStatus?: GenerationTestModeStatus | null
  }
}

export interface AiExportDataset {
  schemaVersion: string
  taxonomyVersion: string
  ruleVersions: string[]
  generatorVersions: string[]
  modelNames: string[]
  exportedAt: string
  timeWindow: {
    start: string | null
    end: string | null
  }
  provenance: {
    environment: string
    era: QualityEra
    currentEraName: string
    currentEngineVersion: string
    currentSchemaVersion: string
    currentPromptVersion: string
    totalEvidenceCount: number
    currentEvidenceCount: number
    historicalEvidenceCount: number
    activeChildren: number
    paidSubscriptions: number
    trialingSubscriptions: number
    totalFailures: number
    dominantFailureCode: string | null
  }
  generationFailureEvidence: Array<{
    jobId: string
    attempt: number
    stage: string
    errorCode: string
    errorMessage: string
    findings: Array<{ rule?: string; message?: string; description?: string }>
    timestamp: string
    era: EraTag
    schemaVersion: string | null
    promptVersion: string | null
    modelName: string | null
  }>
  parentFeedbackEvidence: Array<{
    week: string
    grade: number | null
    difficulty: string
    completionRate: number | null
    weakArea: string | null
    sanitizedFeedbackSnippet: string
    topicThemes: string[]
  }>
  qualityRuleViolationSummary: Array<{
    ruleName: string
    category: string
    violationCount: number
    sampleFinding: string
    era: EraTag
  }>
}

export interface GrantRetryResult {
  success: boolean
  jobId?: string
  previousMaxAttempts?: number
  newMaxAttempts?: number
  attemptCount?: number
  status?: string
  timestamp?: string
  error?: string
  message?: string
}

export interface GenerationTestModeStatus {
  success: boolean
  childId: string
  childPseudonym: string
  isEnabled: boolean
  targetWeek: number
  completedWeeksCount: number
  currentMaterialWeek: string | null
  nextJob: {
    id: string
    materialWeek: string
    status: string
    attemptCount: number
    maxAttempts: number
    ruleVersion: string
    scheduledFor: string
    generationDueAt: string
    releaseAt: string
    feedbackCutoffAt: string
    feedbackMissing: boolean
    isHumanReviewRequired: boolean
    leaseExpiresAt: string | null
    errorCode: string | null
    errorMessage: string | null
    isAlreadyAdvanced: boolean
  } | null
  latestMaterial: {
    id: string
    materialWeek: string
    revision: number
    ruleVersion: string
    modelName: string | null
    promptVersion: string | null
    studentPdfPath: string
    parentAnswerPdfPath: string
    observationsRecordedAt: string | null
    hasFeedback: boolean
  } | null
  latestFeedback: {
    id: string
    difficulty: number | null
    completionRate: number | null
    weakArea: string | null
    mistakesText: string | null
    childComments: string | null
    parentComments: string | null
    schoolProgressUpdate: string | null
    interestUpdate: string | null
    notes: string | null
    createdAt: string
  } | null
  advanceEligibility: {
    canAdvance: boolean
    blockingCode: string | null
    blockingReason: string | null
  }
  resetEligibility: {
    canReset: boolean
    blockingCode: string | null
    blockingReason: string | null
  }
  error?: string
  message?: string
}

export interface SetTestModeResult {
  success: boolean
  childId: string
  isEnabled: boolean
  targetWeek?: number
  error?: string
  message?: string
}

export interface AdvanceTestWeekResult {
  success: boolean
  childId?: string
  jobId?: string
  materialWeek?: string
  scheduledFor?: string
  feedbackCutoffAt?: string
  generationDueAt?: string
  releaseAt?: string
  completedWeeksCount?: number
  targetWeek?: number
  error?: string
  message?: string
}

export interface AdminTestFeedbackInput {
  childId: string
  materialId: string
  difficulty?: number | null
  completionRate?: number | null
  weakArea?: 'vocabulary' | 'grammar' | 'reading' | 'writing' | 'mixed' | null
  mistakesText?: string | null
  childComments?: string | null
  parentComments?: string | null
  schoolProgressUpdate?: string | null
  interestUpdate?: string | null
  notes?: string | null
  minutesSpent?: number | null
}

export interface RecordTestFeedbackResult {
  success: boolean
  feedbackId?: string
  childId?: string
  materialId?: string
  error?: string
  message?: string
}

export interface ResetTestChildResult {
  success: boolean
  childId?: string
  newJobId?: string
  materialWeek?: string
  deletedMaterialsCount?: number
  deletedJobsCount?: number
  deletedFeedbackCount?: number
  deletedObservationsCount?: number
  deletedSubmissionsCount?: number
  deletedProgressRecordsCount?: number
  storageCleanupWarning?: boolean
  unremovedPaths?: string[]
  error?: string
  message?: string
}

export interface TestPdfSignedUrlResult {
  success: boolean
  childId?: string
  materialId?: string
  pdfType?: 'student' | 'parent'
  signedUrl?: string
  path?: string
  error?: string
  message?: string
}

export type WaitlistStatus = 'waiting' | 'released' | 'converted' | 'canceled'
export type NotificationStatus = 'none' | 'pending' | 'sent' | 'failed' | 'manual'

export interface WaitlistEntry {
  id: string
  parentId: string
  childId: string
  email: string
  childName: string
  grade: number
  gradeStage: string
  status: WaitlistStatus
  createdAt: string
  releasedAt: string | null
  convertedAt: string | null
  notes: string | null
  notificationStatus: NotificationStatus
  notificationError: string | null
  notificationAttempts: number
  notifiedAt: string | null
}

export interface WaitlistData {
  capacity: number
  activeCount: number
  releasedCount: number
  waitingCount: number
  convertedCount: number
  pendingNotificationCount: number
  failedNotificationCount: number
  entries: WaitlistEntry[]
}

export interface RaiseCapacityAndReleaseResult {
  success: boolean
  newCapacity?: number
  activeCount?: number
  releasedCount?: number
  waitingCount?: number
  releasedInThisRun?: number
  emailsDispatched?: number
  notificationsFailed?: number
  error?: string
  message?: string
}

export interface ReleaseWaitlistResult {
  success: boolean
  releasedCount?: number
  emailsDispatched?: number
  notificationsFailed?: number
  error?: string
  message?: string
}

export interface UpdateCapacityResult {
  success: boolean
  capacity?: number
  error?: string
  message?: string
}

export interface RetryNotificationResult {
  success: boolean
  emailsDispatched?: number
  notificationsFailed?: number
  error?: string
  message?: string
}

export type SubscriptionLifecycleEventType = 'trial_started' | 'activated' | 'renewed' | 'cancel_scheduled' | 'resumed' | 'past_due' | 'paused' | 'canceled' | 'expired'

export interface SubscriptionLifecycleEventRow {
  id: string
  eventType: SubscriptionLifecycleEventType
  source: 'paddle_webhook' | 'internal_beta' | 'internal_billing_action'
  sourceEventId: string | null
  effectiveAt: string
  observedStatus: string
}

export interface SubscriptionRevenueData {
  rangeDays: number
  instrumentationStartedAt: string | null
  current: { trialing: number; activePaid: number; cancelScheduled: number; pastDue: number; paused: number; canceled: number }
  series: Array<{ date: string; activePaid: number; trials: number; newPaid: number; cancellations: number; netGrowth: number; conversionPercent: number }>
  funnels: {
    subscription: { observable: boolean; trialStarted: number; activatedAfterTrial: number }
    cancellation: { observable: boolean; cancelScheduled: number; canceled: number }
  }
  subscriptions: Array<{
    id: string; childId: string; childPseudonym: string; status: string; planCode: string | null
    billingInterval: string | null; priceTwd: number | null; startDate: string
    currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; events: SubscriptionLifecycleEventRow[]
  }>
}