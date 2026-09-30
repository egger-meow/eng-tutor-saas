import { expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { buildPacketPlanningPrompt } from './packet-planning.js'
import { buildCurriculumPromptBundle } from './prompt-v2.js'
import { buildAuthoringPresentation, buildPrivatePlanningCapsule, validatePublicResearchBrief } from './local-codex-authoring.js'
import { compactAuthoringContext } from './authoring-context.js'

const performance = {
  projectionVersion: 'student-performance-v1',
  recentSubmissions: [{ materialId: 'synthetic-material', counts: { correct: 1, incorrect: 1, unanswered: 1, ungraded: 1 } }],
  items: [
    { questionId: 'wrong', status: 'incorrect', promptNote: 'Choose the location.', responseNote: 'beside the tower', canonicalAnswerNote: 'under the bridge', skillClassification: 'unknown' },
    { questionId: 'open', status: 'open_review', responseNote: 'PRIVATE_RESPONSE_独自作答', gradingBasis: 'ungraded' },
  ],
  unansweredMeaning: 'completion_only_not_incorrect', ungradedMeaning: 'not_assessed_not_incorrect',
  masteryInference: 'none',
}

it.each([false, true])('preserves bounded performance evidence across planning/author/manual/repair with feedback=%s', async (withFeedback) => {
  const context = {
    job: { id: 'synthetic-job', childId: 'synthetic-child', materialWeek: '2026-09-30', ruleVersion: 'curriculum/2.0.0' },
    child: { grade: 7, preferences: { interests: ['ocean currents'] } },
    learningMemory: { studentPerformanceEvidence: performance },
    ...(withFeedback ? { feedback: { difficulty: 5, parent_comments: 'needs a worked example' } } : {}),
  }
  const before = JSON.stringify(context)
  const bundle = await readFile(new URL('../../generator/bundles/production-authoring-bundle.md', import.meta.url), 'utf8')
  const presentations = [buildPacketPlanningPrompt(context, 'Public research'),
    (await buildCurriculumPromptBundle(context)),
    buildAuthoringPresentation(bundle, context, 'Public research').prompt,
    buildAuthoringPresentation(bundle, context, 'Public research', '{"synthetic":"prior candidate"}', 'Repair this item').prompt]
  for (const text of presentations) {
    expect(text).toContain('student-performance-v1')
    expect(text).toContain('PRIVATE_RESPONSE_独自作答')
    expect(text).toContain('completion_only_not_incorrect')
    expect(text).toContain('not_assessed_not_incorrect')
    if (withFeedback) expect(text).toContain('needs a worked example')
  }
  expect(compactAuthoringContext(context).learningMemory).toEqual(context.learningMemory)
  expect(JSON.stringify(context)).toBe(before)
  expect(JSON.stringify(buildPrivatePlanningCapsule(context))).not.toContain('PRIVATE_RESPONSE')
  expect(() => validatePublicResearchBrief({ queries: ['PRIVATE_RESPONSE_独自作答'], topicSummary: 'Ocean currents' }, context)).toThrow('PRIVATE_DATA')
  expect(() => validatePublicResearchBrief({ queries: ['under the bridge'], topicSummary: 'Ocean currents' }, context)).toThrow('PRIVATE_DATA')
})

it.each([{}, { feedback: { difficulty: 3, parent_comments: 'Historical paper only' } }])('supports no submissions and historical paper-only context', async (context) => {
  const prompt = buildPacketPlanningPrompt(context, 'Public research')
  expect(prompt).not.toContain('student-performance-v1')
  if ('feedback' in context) expect(prompt).toContain('Historical paper only')
})
