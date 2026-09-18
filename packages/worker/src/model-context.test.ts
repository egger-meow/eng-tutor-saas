import { expect, it } from 'vitest'
import { serializeModelContext, restoreModelContext } from './model-context.js'
import { authoringPrompt, buildAuthoringPresentation, measurePromptInput } from './local-codex-authoring.js'
import { buildPacketPlanningPrompt } from './packet-planning.js'

// Synthetic evidence, not student data or verified public research.
const evidence = {
  grade: 8, age: null, weekly_minutes: 30, interests: ['IU', 'Chihiro from Spirited Away'],
  feedback: { observedAt: '2026-09-17', difficulty: 'too_easy', instruction: 'Review past tense using supported inference; shorten workload.' },
  targetLanguageDifficulty: 'A2_basic', targetCognitiveDepth: 'D3_multi_step_synthesis',
  precedentRefs: ['synthetic-cap-1'], noPrecedentReason: null,
  sources: [{ url: 'https://example.invalid/synthetic', publishedAt: '2026-09-01', eventDate: '2025-12-01', qualifier: 'Only the named mode supports this behavior; no evidence for other modes.' }],
  diversity: { responseFormats: ['table:organizer'], rationale: 'Repeat this format to compare clues; no format quota.' },
  unknownFutureField: { exposureIsNotWeakness: true, confidence: 'uncertain' },
}

it('round-trips all evidence, unique fields, nesting and escaped paths without mutating the input', () => {
  const context = { 'a/b~c': evidence, history: [evidence, { ...evidence, weekly_minutes: 45 }], retry: { original: evidence }, missing: undefined }
  const before = JSON.stringify(context)
  const result = serializeModelContext(context)
  expect(result.references.length).toBeGreaterThan(0)
  expect(result.references[0].target).toBe('/a~1b~0c')
  expect(restoreModelContext(result.json)).toEqual(JSON.parse(before))
  expect(JSON.stringify(context)).toBe(before)
  expect(result.after.chars).toBeLessThan(result.before.chars)
  expect(result.after.bytes).toBeLessThan(result.before.bytes)
  expect(result.json).toContain('"weekly_minutes":45')
})

it('keeps small values inline and falls back when the guide costs more than deduplication saves', () => {
  for (const context of [{ missing: null, empty: [], duplicates: ['same', 'same'] }, { a: { text: 'x'.repeat(128) }, b: { text: 'x'.repeat(128) } }]) {
    expect(serializeModelContext(context).text).toBe(JSON.stringify(context))
    expect(serializeModelContext(context).references).toEqual([])
  }
})

it('preserves unknown reserved keys literally instead of interpreting them as references', () => {
  const context = { a: evidence, b: evidence, future: { $contextRef: '/a' } }
  expect(serializeModelContext(context).text).toBe(JSON.stringify(context))
  expect(serializeModelContext(context).references).toEqual([])
})

it('round-trips varied synthetic histories, unicode and unknown fields with ordered arrays intact', () => {
  for (let count = 1; count <= 32; count++) {
    const history = Array.from({ length: count }, (_, index) => ({ ...evidence, feedback: { ...evidence.feedback, instruction: `保留時間與原文限定條件 ${index % 3}` } }))
    const context = { history, copy: history, nested: { nullable: null, zero: 0, falseValue: false, empty: [], unknown: { original: history[0] } } }
    const result = serializeModelContext(context)
    expect(result.references.length ? restoreModelContext(result.json) : JSON.parse(result.json)).toEqual(context)
    expect(result.after.chars).toBeLessThanOrEqual(result.before.chars)
    expect(result.after.bytes).toBeLessThanOrEqual(result.before.bytes)
  }
})

it('detects missing, forward and cyclic references instead of treating them as absent evidence', () => {
  for (const json of ['{"a":{"$contextRef":"/missing"}}', '{"a":{"$contextRef":"/b"},"b":{}}', '{"a":{"$contextRef":"/a"}}']) {
    expect(() => restoreModelContext(json)).toThrow('Unresolved context reference')
  }
})

it('retains different qualifiers and independently reconstructs repeated parent and child objects', () => {
  const context = { first: evidence, grouped: { left: evidence, right: evidence }, repeated: { left: evidence, right: evidence }, conflict: { ...evidence, sources: [{ qualifier: 'Unsupported in this mode.' }] } }
  const result = serializeModelContext(context)
  expect(result.references.length).toBeGreaterThan(0)
  expect(restoreModelContext(result.json)).toEqual(context)
})

it('preserves full grounding, findings and the newest candidate in real author and repair prompts', () => {
  const context = { profile: evidence, unknownCapsule: evidence, retryContext: { previousCanonicalPackage: { old: 'OLD_CANDIDATE' }, findings: ['keep this finding'] } }
  const original = JSON.stringify(context)
  for (const candidate of [undefined, '{"latest":"NEW_CANDIDATE"}']) {
    const result = buildAuthoringPresentation('ALL_RULES_AND_SCHEMA', context, 'EXACT_GROUNDING_WITH_QUALIFIERS', candidate, 'FULL_REPAIR_FINDINGS')
    expect(result.prompt).toBe(authoringPrompt('ALL_RULES_AND_SCHEMA', context, 'EXACT_GROUNDING_WITH_QUALIFIERS', candidate, 'FULL_REPAIR_FINDINGS'))
    expect(result.prompt).toContain('ALL_RULES_AND_SCHEMA')
    expect(result.prompt).toContain('EXACT_GROUNDING_WITH_QUALIFIERS')
    expect(result.prompt).toContain('keep this finding')
    expect(result.diagnostics.learner.references.length).toBeGreaterThan(0)
    if (candidate) {
      expect(result.prompt).not.toContain('OLD_CANDIDATE')
      expect(result.prompt.split(candidate)).toHaveLength(2)
      expect(result.prompt).toContain('FULL_REPAIR_FINDINGS')
    } else expect(result.prompt).toContain('OLD_CANDIDATE')
  }
  expect(JSON.stringify(context)).toBe(original)
})

it('uses the same codec for planning and distinguishes planning repair measurements', () => {
  const prompt = buildPacketPlanningPrompt({ learningState: evidence, learningMemory: evidence }, 'PUBLIC_GROUNDING', '{"invalid":true}', 'missing item IDs')
  const encoded = prompt.split('## 1. Learner Context & Pedagogical Constraints\n')[1].split('\n\n## 2.')[0]
  const json = encoded.slice(encoded.indexOf('\n') + 1)
  expect(encoded).toContain('Context encoding:')
  expect(restoreModelContext(json)).toMatchObject({ learningState: evidence, learningMemory: evidence })
  expect(prompt).toContain('PUBLIC_GROUNDING')
  expect(prompt).toContain('missing item IDs')
  expect(measurePromptInput(prompt).stage).toBe('packet-plan-repair')
})
