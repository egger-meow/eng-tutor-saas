import type { CurriculumPackageV21, CurriculumPackageV22 } from './curriculum-package-schema.js'

const LEGACY_GRAMMAR_MAP: Record<string, string> = {
  'grammar-do-does': 'g7-do-does-questions',
  'do-does': 'g7-do-does-questions',
  'be-verbs': 'g7-be-verbs-pronouns',
  'lang-be-verb': 'g7-be-verbs-pronouns',
  'present-simple': 'g7-present-simple-verbs',
  'lang-present-simple': 'g7-present-simple-verbs',
}

export function upgradeV21ToV22(pkgV21: CurriculumPackageV21 | any): CurriculumPackageV22 {
  const raw = typeof pkgV21 === 'object' && pkgV21 !== null ? JSON.parse(JSON.stringify(pkgV21)) : {}

  const trackingDeltaRaw = raw.trackingDelta || {}
  const rawGrammarIds =
    trackingDeltaRaw.exposedGrammarTargetIds || trackingDeltaRaw.grammarTargets || []
  const exposedGrammarTargetIds = rawGrammarIds.map((id: string) => LEGACY_GRAMMAR_MAP[id] || id)
  const exposedReadingTargetIds =
    trackingDeltaRaw.exposedReadingTargetIds || trackingDeltaRaw.readingTargets || []
  const exposedCommunicationFunctionIds =
    trackingDeltaRaw.exposedCommunicationFunctionIds || trackingDeltaRaw.communicationFunctions || []

  const upgradedTrackingDelta = {
    introducedVocabularyIds: trackingDeltaRaw.introducedVocabularyIds || [],
    reviewedVocabularyIds: trackingDeltaRaw.reviewedVocabularyIds || [],
    exposedGrammarTargetIds,
    exposedReadingTargetIds,
    exposedCommunicationFunctionIds,
    hypothesesToVerify: trackingDeltaRaw.hypothesesToVerify || ['Verify baseline understanding.'],
    nextReviewCandidates: trackingDeltaRaw.nextReviewCandidates || ['Review foundational targets.'],
  }

  return {
    ...raw,
    metadata: {
      ...raw.metadata,
      schemaVersion: '2.2.0',
    },
    trackingDelta: upgradedTrackingDelta,
  }
}
