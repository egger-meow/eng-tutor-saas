import { readFile, writeFile } from 'node:fs/promises'
import { buildAuthoringPresentation } from '../src/local-codex-authoring.js'
import { buildPacketPlanningPrompt } from '../src/packet-planning.js'
import { measureContextText, restoreModelContext } from '../src/model-context.js'

// Deliberately synthetic: these observations and sources are NOT production or verified research.
const evidence = {
  grade: 8, age: null, weekly_minutes: 30, interests: ['IU', 'Chihiro from Spirited Away'],
  observedAt: '2026-09-17', feedback: 'Review past tense with supported inference and less workload. Exposure does not establish weakness.',
  targetLanguageDifficulty: 'A2_basic', targetCognitiveDepth: 'D3_multi_step_synthesis',
  source: { url: 'https://example.invalid/synthetic', eventDate: '2025-12-01', publishedAt: '2026-09-01', qualifier: 'Only this mode; other modes are unverified.' },
  responseFormat: 'table:organizer', rationale: 'Reuse for comparing evidence; diversity is not a quota.',
}
const bundle = await readFile(new URL('../../generator/bundles/production-authoring-bundle.md', import.meta.url), 'utf8')
const grounding = 'SYNTHETIC ONLY: source s1 -> fact f1 -> claim c1. Retain dates, exact mode, qualifier and uncertainty. Not verified research.'
const scenarios = [
  { id: 'no-duplicates', context: { profile: { grade: 8, weekly_minutes: 30 }, preferences: { interests: ['IU'] } } },
  { id: 'repeated-evidence', context: { profile: { grade: 8, weekly_minutes: 30 }, learningState: evidence, learningMemory: evidence, sourceMaterial: evidence } },
  { id: 'distinct-feedback', context: { profile: { grade: 7, weekly_minutes: 45 }, learningState: evidence, learningMemory: { ...evidence, feedback: 'Newer evidence: increase challenge; retain original time budget.' } } },
]

function compare(stage: string, prompt: string, start: string, end: string) {
  const from = prompt.indexOf(start) + start.length
  const to = prompt.indexOf(end, from)
  if (from < start.length || to < from) throw new Error('Missing prompt section')
  const presented = prompt.slice(from, to)
  const full = presented.startsWith('Context encoding:')
    ? JSON.stringify(restoreModelContext(presented.slice(presented.indexOf('\n') + 1))) : presented
  const beforePrompt = prompt.slice(0, from) + full + prompt.slice(to)
  const before = measureContextText(beforePrompt)
  const after = measureContextText(prompt)
  return { stage, before, after, savedChars: before.chars - after.chars,
    reductionPercent: Number(((before.chars - after.chars) * 100 / before.chars).toFixed(2)),
    learner: { before: measureContextText(full), after: measureContextText(presented) } }
}
const rows = scenarios.map(({ id, context }) => {
  const calls = [false, true].flatMap(repair => {
    const candidate = repair ? '{"syntheticCandidate":true,"answerMapping":"q1 -> a1"}' : undefined
    const issue = repair ? 'Synthetic finding: preserve mapping while fixing q1.' : undefined
    const planner = buildPacketPlanningPrompt(context, grounding, candidate, issue)
    const author = buildAuthoringPresentation(bundle, context, grounding, candidate, issue)
    return [
      compare(repair ? 'packet-plan-repair' : 'packet-plan', planner, '## 1. Learner Context & Pedagogical Constraints\n', '\n\n## 2. Public Research Grounding'),
      { ...compare(repair ? 'author-repair' : 'author', author.prompt, 'PRIVATE CLAIMED CONTEXT (never quote or expose):\n', '\nPUBLIC FACTUAL GROUNDING'), components: author.diagnostics },
    ]
  })
  return { id, calls }
})
const report = {
  measurement: 'synthetic exact prompt-builder comparison',
  scope: 'New JSON presentation only, after existing compaction. Each stage measured separately; repair is optional. UTF-16 chars and UTF-8 bytes, not tokens, live usage, or teaching-quality equivalence.',
  baselineBundle: measureContextText(bundle),
  implementation: measureContextText(await readFile(new URL('../src/model-context.ts', import.meta.url), 'utf8')),
  rows,
}
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(rows.map(row => ({ id: row.id, calls: row.calls.map(({ stage, savedChars, reductionPercent }) => ({ stage, savedChars, reductionPercent })) })), null, 2))
