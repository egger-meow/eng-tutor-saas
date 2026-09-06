import { expect, it } from 'vitest'
import { buildPacketPlanningPrompt, validatePacketPlan } from './packet-planning.js'
import { buildPrivatePlanningCapsule, measurePromptInput } from './local-codex-authoring.js'

const item = { itemId: 'q1', targetSkill: 'local_inference', targetLanguageDifficulty: 'A2_basic', targetCognitiveDepth: 'D3_multi_step_synthesis', learningFunction: 'infer a turning point from evidence', reasoningOperation: 'inference', responseFormat: 'table:organizer', formatRationale: 'connect clues to a justified inference', scaffoldLevel: 'supported' }
const plan = { selectedAngle: 'A named character decision', evidenceRationale: 'Supported by researched evidence', selectedLearningTargets: { vocabulary: ['choice'], grammar: ['past_simple'] }, assessmentPlans: [item] }
it('rejects missing decisions, duplicate IDs and non-string targets instead of inventing curriculum', () => {
  for (const field of ['itemId', 'targetSkill', 'targetLanguageDifficulty', 'targetCognitiveDepth', 'learningFunction', 'reasoningOperation', 'responseFormat', 'formatRationale', 'scaffoldLevel']) {
    const missing = { ...item, [field]: undefined }
    expect(() => validatePacketPlan({ ...plan, assessmentPlans: [missing] }, {})).toThrow('PACKET_PLAN_INVALID')
  }
  expect(() => validatePacketPlan({ ...plan, assessmentPlans: [item, item] }, {})).toThrow('duplicate itemId')
  expect(() => validatePacketPlan({ ...plan, selectedLearningTargets: { vocabulary: [{}], grammar: [] } }, {})).toThrow('non-empty strings')
  expect(validatePacketPlan(plan, {}).assessmentPlans[0].targetCognitiveDepth).toBe('D3_multi_step_synthesis')
})
it('preserves actual claim interests, feedback and delivery guidance without mutating the snapshot', () => {
  const context = { child: { grade: 8, preferences: { interests: ['keshi', 'Chihiro from Spirited Away'] } }, feedback: { difficulty: 'too_easy' }, learningState: { grammar_focus: 'past_simple' }, profile: { weekly_minutes: 45 }, recentDeliveryMemory: [{ materialWeek: 'Week 10', responseLayoutTypes: ['table'], pedagogicalFormats: ['table:grid'] }] }
  const before = JSON.stringify(context)
  expect(buildPrivatePlanningCapsule(context).topics).toEqual(['keshi', 'Chihiro from Spirited Away'])
  const prompt = buildPacketPlanningPrompt(context, 'Public source evidence')
  for (const value of ['Chihiro', 'too_easy', 'past_simple', 'table:grid']) expect(prompt).toContain(value)
  expect(JSON.stringify(context)).toBe(before)
})
it('measures UTF-8 inputs without recording private prompt content or claiming token usage', () => {
  const metric = measurePromptInput('中文 abc')
  expect(metric.chars).toBe(6)
  expect(metric.bytes).toBe(10)
  expect(metric.sha256).toHaveLength(64)
  expect(metric).not.toHaveProperty('input')
  expect(metric).not.toHaveProperty('tokens')
})
