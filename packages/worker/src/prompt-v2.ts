import { readFile } from 'node:fs/promises'
import type { GenerationContext } from './pipeline.js'
import { compactAuthoringContext } from './authoring-context.js'
import {
  assembleSelectiveAuthoringBundle,
  expandCapPrecedents,
  retrievePrecedentsForAssessmentPlans,
  filterAndRankCapPrecedents,
  adaptAssessmentIntent,
  type CapRetrievalIntent,
} from '@paper-english/generator'

/** All production entry points consume the same compiled policy and current schema. */
export async function buildCurriculumPromptBundle(context: GenerationContext): Promise<string> {
  const bundle = await readFile(new URL('../../generator/bundles/production-authoring-bundle.md', import.meta.url), 'utf8')
  const record = context as unknown as Record<string, unknown>
  let assembledBundle = bundle

  const plans = Array.isArray(record.assessmentPlans) ? (record.assessmentPlans as any[]) : undefined
  const primarySkill = typeof record.primarySkill === 'string' && record.primarySkill.trim().length > 0
    ? record.primarySkill.trim()
    : undefined

  const profile = (record.profile ?? {}) as Record<string, unknown>
  const preferences = (record.preferences ?? {}) as Record<string, unknown>

  if (plans && plans.length > 0) {
    const assessmentIntents: CapRetrievalIntent[] = plans.map((p) =>
      adaptAssessmentIntent(p, profile, preferences),
    )

    const multi = await retrievePrecedentsForAssessmentPlans(assessmentIntents, {
      limit: 3,
      preferences: {
        recentPrecedentRefs: Array.isArray(record.recentPrecedentRefs) ? (record.recentPrecedentRefs as string[]) : undefined,
      },
    })
    if (multi.expandedCards.length > 0) {
      assembledBundle = assembleSelectiveAuthoringBundle(bundle, multi.expandedCards)
    }
  } else if (primarySkill) {
    const intent = adaptAssessmentIntent(
      {
        primarySkill,
        targetCognitiveDepth: typeof record.cognitiveDepth === 'string' ? record.cognitiveDepth : undefined,
        genre: typeof record.genre === 'string' ? record.genre : undefined,
      },
      profile,
      preferences,
    )
    const result = filterAndRankCapPrecedents(intent, {
      limit: 5,
      preferences: {
        recentPrecedentRefs: Array.isArray(record.recentPrecedentRefs) ? (record.recentPrecedentRefs as string[]) : undefined,
      },
    })
    const candidateRefs = result.candidates.map((c) => c.ref)
    if (candidateRefs.length > 0) {
      const cards = await expandCapPrecedents(candidateRefs)
      assembledBundle = assembleSelectiveAuthoringBundle(bundle, cards)
    }
  }

  return [
    assembledBundle,
    '## Private claimed context',
    JSON.stringify(compactAuthoringContext(context as unknown as Record<string, unknown>)),
    'Complete research, planning, Author/Critic review, targeted repair, and full canonical validation before immutable submission through the reviewed authoring bridge. Follow docs/production-authoring.md for claim/submit/status; this prompt does not authorize legacy complete-v2 publication.',
  ].join('\n\n')
}
