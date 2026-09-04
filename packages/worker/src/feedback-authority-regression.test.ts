import { describe, expect, it } from 'vitest'
import { type CurriculumPackage } from '@paper-english/generator'
import { curriculumSample } from '../../pdf/src/generate-curriculum-sample.js'
import { forwardProgressionIssues, type GenerationContext } from './pipeline.js'

describe('feedback authority over progression scheduling', () => {
  it('does not hard-reject a previously exposed review word selected from explicit source-material feedback', () => {
    const pkg = structuredClone(curriculumSample) as CurriculumPackage
    const item = pkg.studentLesson.vocabulary[0]!
    item.id = 'v-tension'
    item.word = 'tension'
    item.status = 'review'
    pkg.trackingDelta.reviewedVocabularyIds = Array.from(new Set([
      ...pkg.trackingDelta.reviewedVocabularyIds,
      'v-tension',
    ]))

    const context: GenerationContext = {
      job: { id: 'job-2', childId: 'child-1', materialWeek: '2026-W36', ruleVersion: 'weekly-material/2.0.0' },
      vocabularyCapsule: {
        dueForReview: [],
        weakRecent: [],
        uncertain: ['v-tension'],
        recentlyMastered: [],
        historicalCount: 1,
      },
      feedback: {
        mistakes_text: 'tension 和 thickness 容易搞混，comparison 不太熟。',
        parent_comments: '單字比較需要複習。',
      },
    }

    const issues = forwardProgressionIssues(pkg, context)
    expect(issues.filter((issue) => issue.path === 'studentLesson.vocabulary.v-tension')).toEqual([])
  })

  it('still hard-rejects a vocabulary card labeled review when the word was never previously exposed', () => {
    const pkg = structuredClone(curriculumSample) as CurriculumPackage
    const item = pkg.studentLesson.vocabulary[0]!
    item.id = 'v-never-seen'
    item.word = 'never-seen'
    item.status = 'review'
    pkg.trackingDelta.reviewedVocabularyIds = Array.from(new Set([
      ...pkg.trackingDelta.reviewedVocabularyIds,
      'v-never-seen',
    ]))

    const context: GenerationContext = {
      job: { id: 'job-2', childId: 'child-1', materialWeek: '2026-W36', ruleVersion: 'weekly-material/2.0.0' },
      vocabularyCapsule: {
        dueForReview: [],
        weakRecent: [],
        uncertain: ['v-known-word'],
        recentlyMastered: [],
        historicalCount: 1,
      },
    }

    const issues = forwardProgressionIssues(pkg, context)
    expect(issues.some((issue) => issue.path === 'studentLesson.vocabulary.v-never-seen')).toBe(true)
  })

  it('does not hard-reject primary grammar selection merely because deterministic heuristics cannot prove the pedagogical reason', () => {
    const pkg = structuredClone(curriculumSample) as CurriculumPackage
    const primaryGrammar = pkg.trackingDelta.exposedGrammarTargetIds[0]!
    expect(primaryGrammar).toBeTruthy()

    const context: GenerationContext = {
      job: { id: 'job-3', childId: 'child-1', materialWeek: '2026-W37', ruleVersion: 'weekly-material/2.0.0' },
      grammarCapsule: {
        dueForReview: [],
        weakRecent: [],
        uncertain: [],
        recentlyMastered: [primaryGrammar],
        historicalCount: 1,
      },
      capCoverageCapsule: {
        dueReviewVocabulary: [],
        dueReviewGrammar: [],
        dueReviewCommunication: [],
        recommendedVocabulary: [],
        recommendedGrammar: [],
        recommendedCommunicationFunctions: [],
        coverage: {},
      },
    }

    const issues = forwardProgressionIssues(pkg, context)
    expect(issues.filter((issue) => issue.path === 'trackingDelta.exposedGrammarTargetIds.0')).toEqual([])
  })
})
