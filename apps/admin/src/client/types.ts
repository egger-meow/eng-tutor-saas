import type { SupabaseClient } from '@supabase/supabase-js'

export {
  CURRENT_ENGINE_VERSION,
  CURRENT_SCHEMA_VERSION,
  CURRENT_PROMPT_VERSION,
  CURRENT_ERA_TAG,
  CURRENT_QUALITY_PROFILE_VERSION,
  formatEngineEraLabel,
  formatEngineVersion,
} from '@paper-english/generator/engine-version'

import type { EraTag } from '@paper-english/generator/engine-version'
export type { EraTag }

export type TabId = 'overview' | 'failures' | 'feedback' | 'product' | 'timeline' | 'export'

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

export function hasModelQualityProfileProvenance(item: QualityEraItem): boolean {
  if (item.resolvedQualityProfile || item.qualityProfile) return true
  if (item.modelQualityProfile && (typeof item.modelQualityProfile === 'string' || (typeof item.modelQualityProfile === 'object' && Object.keys(item.modelQualityProfile).length > 0))) {
    return true
  }
  if (item.profileProvenance && (typeof item.profileProvenance === 'string' || (typeof item.profileProvenance === 'object' && Object.keys(item.profileProvenance).length > 0))) {
    return true
  }

  const csMeta = item.canonicalSource?.metadata
  if (csMeta) {
    if (csMeta.modelQualityProfile || csMeta.qualityProfile || csMeta.resolvedQualityProfile || csMeta.profileProvenance) {
      return true
    }
  }
  const csChecks = item.canonicalSource?.qualityEvidence?.criticalChecks
  if (Array.isArray(csChecks) && csChecks.some((c: any) => c.id === 'model-quality-profile' || (typeof c.evidence === 'string' && c.evidence.includes('resolvedQualityProfile=')))) {
    return true
  }

  const qeChecks = item.qualityEvidence?.criticalChecks
  if (Array.isArray(qeChecks) && qeChecks.some((c: any) => c.id === 'model-quality-profile' || (typeof c.evidence === 'string' && c.evidence.includes('resolvedQualityProfile=')))) {
    return true
  }

  const fe = item.failureEvidence
  if (fe) {
    if (fe.modelQualityProfile || fe.qualityProfile || fe.resolvedQualityProfile || fe.profileProvenance || fe.provenance?.resolvedQualityProfile || fe.provenance?.profileName) {
      return true
    }
    if (Array.isArray(fe.criticalChecks) && fe.criticalChecks.some((c: any) => c.id === 'model-quality-profile' || (typeof c.evidence === 'string' && c.evidence.includes('resolvedQualityProfile=')))) {
      return true
    }
    if (typeof fe.qualityProfile === 'string' || typeof fe.resolvedQualityProfile === 'string') {
      return true
    }
    if (Array.isArray(fe.findings) && fe.findings.some((f: any) => f.rule === 'model-quality-profile' || (typeof f.message === 'string' && f.message.includes('quality profile')))) {
      return true
    }
  }

  if (item.rawRow?.quality_profile || item.rawRow?.model_quality_profile) {
    return true
  }

  return false
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
  // separate quality invariant. Missing profile provenance on a current submission must stay
  // visible in Current so Admin can report the violation instead of laundering it as Historical.
  const hasProfile = hasModelQualityProfileProvenance(item)
  const hasEngineVersion = Boolean(getEngineVersionFromItem(item))

  // Profile provenance normally identifies current evidence. If that provenance itself is broken,
  // the admin RPC's authoritative engine_version keeps the current submission visible in Current.
  if (isSchema220 && isPrompt240 && (hasProfile || hasEngineVersion)) {
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
  rawMetadata: {
    job: Record<string, unknown> | null
    submissions: Array<Record<string, unknown>>
    material: Record<string, unknown> | null
    feedback: Record<string, unknown> | null
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
