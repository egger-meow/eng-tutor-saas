export type {
  DataSourceStatus,
  OperationsOverview,
  FailureIntelligence,
  ParentFeedbackIntelligence,
  ProductFeedbackIntelligence,
  ChildWeekTimeline,
  LifecycleEvent,
  AiExportDataset,
  GrantRetryResult,
  GenerationTestModeStatus,
  SetTestModeResult,
  AdvanceTestWeekResult,
  AdminTestFeedbackInput,
  RecordTestFeedbackResult,
  ResetTestChildResult,
  TestPdfSignedUrlResult,
  QualityEra,
  EraTag,
} from '../server/admin-service.js'

export {
  CURRENT_ENGINE_VERSION,
  CURRENT_SCHEMA_VERSION,
  CURRENT_PROMPT_VERSION,
  CURRENT_ERA_TAG,
  CURRENT_QUALITY_PROFILE_VERSION,
  formatEngineEraLabel,
  formatEngineVersion,
} from '../server/admin-service.js'

export type TabId = 'overview' | 'failures' | 'feedback' | 'product' | 'timeline' | 'export'

export interface HealthState {
  status: string
  connected: boolean
  timestamp: string
}
