export type GenerationJob = {
  id: string
  childId: string
  materialWeek: string
  ruleVersion: string
  idempotencyKey: string
}

export type GenerationContext = {
  grade: 7 | 8 | 9
  preferences: ReadonlyArray<string>
  priorFeedback: ReadonlyArray<string>
}

export { WeeklyLessonSchema } from './lesson-schema.js'
export type { WeeklyLesson } from './lesson-schema.js'
export { parseWeeklyLesson, validateWeeklyLesson } from './validate-lesson.js'
export type { LessonValidationIssue, LessonValidationResult } from './validate-lesson.js'
export { syntheticWeekOne } from './fixtures/synthetic-week-1.js'
export {
  CurriculumPackageSchema,
  CurriculumPackageV21Schema,
  CurriculumPackageV20Schema,
  ReadingBlockSchema,
  ReadingGenreSchema,
  AdaptiveExtensionSchema,
  AdaptiveExtensionPurposeSchema,
  AdaptiveExtensionPlacementSchema,
} from './curriculum-package-schema.js'
export type {
  CurriculumPackage,
  CurriculumPackageV21,
  CurriculumPackageV20,
  CurriculumQuestion,
  ReadingBlock,
  ReadingGenre,
  AdaptiveExtension,
  AdaptiveExtensionPurpose,
  AdaptiveExtensionPlacement,
} from './curriculum-package-schema.js'
export { upgradeV20ToV21 } from './upgrade-v20-to-v21.js'
export { upgradeV21ToV22 } from './upgrade-v21-to-v22.js'
export {
  validateCurriculumPackage,
  findForbiddenPersonalizationJargon,
  FORBIDDEN_PERSONALIZATION_JARGON_PATTERNS,
} from './validate-curriculum-package.js'
export type { CurriculumValidationResult } from './validate-curriculum-package.js'
export { auditCurriculumPackage } from './audit-curriculum.js'
export type { CurriculumAuditFinding, CurriculumAuditReport, CurriculumAuditTier } from './audit-curriculum.js'
export { countWords, extractBlockTexts, cleanOptionPrefix, normalizeCurriculumPackage, stripTrailingTotalDuration } from './normalize-curriculum-package.js'

// CAP Curriculum Maps & Coverage Tracking
export {
  createEmptyStudentCurriculumStore,
  recordExposureFromTrackingDelta,
  recordLearnerAssessmentEvidence,
  mapToCanonicalVocabId,
  VALID_GRAMMAR_UNIT_IDS,
  VALID_COMMUNICATION_FUNCTION_IDS,
} from './curriculum-maps/student-curriculum-tracker.js'
export type {
  CurriculumEvidenceRecord,
  StudentCurriculumStore,
} from './curriculum-maps/student-curriculum-tracker.js'
export { buildCapCoverageCapsule } from './curriculum-maps/build-cap-coverage-capsule.js'
export type { CapCoverageCapsule, DomainCoverageMetric } from './curriculum-maps/build-cap-coverage-capsule.js'
export {
  communicationFamilies,
  getCommunicationFamily,
  findFamilyByOfficialFunctionId,
} from './curriculum-maps/derived/communication-families.js'
export type { CommunicationFamily } from './curriculum-maps/derived/communication-families.js'
export { grammarProgressionUnits, getGrammarUnit, getUnitsByGradeStage } from './curriculum-maps/derived/grammar-progression.js'
export type { GrammarProgressionUnit } from './curriculum-maps/derived/grammar-progression.js'
export { getSuggestedGradeForWord, getThemeForWord } from './curriculum-maps/derived/vocabulary-annotations.js'
export { buildDiversityCapsule, extractHistoricalPackageSummary } from './curriculum-maps/diversity-capsule.js'
export type { DiversityCapsule, HistoricalPackageSummary } from './curriculum-maps/diversity-capsule.js'

// Model-Specific Pre-Submit Quality Profiles & Critic Layer
export {
  DEFAULT_QUALITY_PROFILES_DIR,
  parseQualityProfileMarkdown,
  normalizeModelIdentifier,
  loadQualityProfileFromFile,
  resolveQualityProfile,
} from './quality-profile-loader.js'
export type {
  QualityProfile,
  QualityProfileRule,
  QualityProfileTargetArea,
} from './quality-profile-loader.js'
export { applyModelQualityProfile } from './model-quality-profile.js'
export type {
  ModelQualityProfileOptions,
  ProfileProvenance,
  PreSubmitResult,
} from './model-quality-profile.js'

// Canonical Central Engine Versioning
export {
  CURRENT_ENGINE_VERSION,
  CURRENT_SCHEMA_VERSION,
  CURRENT_PROMPT_VERSION,
  CURRENT_ERA_TAG,
  CURRENT_QUALITY_PROFILE_VERSION,
  formatEngineEraLabel,
  formatEngineVersion,
} from './engine-version.js'
export type { EraTag } from './engine-version.js'
