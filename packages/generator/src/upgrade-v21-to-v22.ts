import type { CurriculumPackage, CurriculumPackageV21 } from './curriculum-package-schema.js'

export function upgradeV21ToV22(pkgV21: CurriculumPackageV21 | any): CurriculumPackage {
  const raw = typeof pkgV21 === 'object' && pkgV21 !== null ? JSON.parse(JSON.stringify(pkgV21)) : {}

  const trackingDeltaRaw = raw.trackingDelta || {}
  const exposedGrammarTargetIds =
    trackingDeltaRaw.exposedGrammarTargetIds || trackingDeltaRaw.grammarTargets || []
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
