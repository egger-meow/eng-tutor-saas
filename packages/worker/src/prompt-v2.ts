import { readFile } from 'node:fs/promises'
import type { GenerationContext } from './pipeline.js'
import { compactAuthoringContext } from './authoring-context.js'
import {
  assembleSelectiveAuthoringBundle,
  expandCapPrecedents,
  retrievePrecedentsForAssessmentPlans,
  filterAndRankCapPrecedents,
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

  if (plans && plans.length > 0) {
    const profile = (record.profile ?? {}) as Record<string, unknown>
    const preferences = (record.preferences ?? {}) as Record<string, unknown>
    const targetDifficulty = typeof profile.grade_level === 'string'
      ? (profile.grade_level.includes('A2') ? 'A2_basic' : profile.grade_level.includes('B1') ? 'B1_intermediate' : 'A1_elementary')
      : undefined

    const assessmentIntents: CapRetrievalIntent[] = plans.map((p) => {
      let depth = p.cognitiveDepth as any
      if (depth === 'literal') depth = 'D1_recall_locate'
      else if (depth === 'inferential') depth = 'D2_single_step_inference'
      else if (depth === 'evaluative') depth = 'D4_applied_evaluation'
      else if (depth === 'applied') depth = 'D4_applied_evaluation'

      let diff = (p.difficulty ?? targetDifficulty) as any
      if (diff === 'A1') diff = 'A1_elementary'
      else if (diff === 'A2') diff = 'A2_basic'
      else if (diff === 'B1') diff = 'B1_intermediate'
      else if (diff === 'B2') diff = 'B2_independent'

      return {
        primarySkill: (p.targetSkill ?? p.primarySkill ?? '').trim(),
        targetLanguageDifficulty: diff,
        targetCognitiveDepth: depth,
        genre: p.genre,
        keywords: p.keywords ?? (Array.isArray(preferences.topics) ? (preferences.topics as string[]) : undefined),
      }
    })

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
    const profile = (record.profile ?? {}) as Record<string, unknown>
    const preferences = (record.preferences ?? {}) as Record<string, unknown>
    const targetDifficulty = typeof profile.grade_level === 'string'
      ? (profile.grade_level.includes('A2') ? 'A2_basic' : profile.grade_level.includes('B1') ? 'B1_intermediate' : 'A1_elementary')
      : undefined
    const intent: CapRetrievalIntent = {
      primarySkill,
      targetLanguageDifficulty: targetDifficulty,
      targetCognitiveDepth: typeof record.cognitiveDepth === 'string' ? (record.cognitiveDepth as any) : undefined,
      genre: typeof record.genre === 'string' ? record.genre : undefined,
      keywords: Array.isArray(preferences.topics) ? (preferences.topics as string[]) : undefined,
    }
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
