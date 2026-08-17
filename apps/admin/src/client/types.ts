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
} from '../server/admin-service.js'

export type TabId = 'overview' | 'failures' | 'feedback' | 'product' | 'timeline' | 'export'

export interface HealthState {
  status: string
  connected: boolean
  timestamp: string
}
