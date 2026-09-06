import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { compileProductionBundle, REPO_ROOT } from '../src/bundle-compiler.js'
import { assembleSelectiveAuthoringBundle, retrievePrecedentsForAssessmentPlans, CURRENT_ENGINE_VERSION, CURRENT_PROMPT_VERSION } from '../src/index.js'
import { planningPrompt, researchPrompt, authoringPrompt, buildPrivatePlanningCapsule, prepareAuthoringBundleWithPrecedents, measurePromptInput } from '../../worker/src/local-codex-authoring.js'
import { buildPacketPlanningPrompt } from '../../worker/src/packet-planning.js'
import { compactAuthoringBundle, compactAuthoringContext } from '../../worker/src/authoring-context.js'

export interface CompactionCase {
  id: string
  name: string
  category: 'music' | 'kpop' | 'animation' | 'movie' | 'character' | 'science' | 'format_organizer' | 'current_vs_evergreen'
  description: string
  topics: string[]
  grade: string
  primarySkill: string
  cognitiveDepth: 'D1_recall_locate' | 'D2_single_step_inference' | 'D3_multi_step_synthesis' | 'D4_applied_evaluation'
  plannedFormats: string[]
  isCurrent: boolean
}

export const BENCHMARK_CASES: CompactionCase[] = [
  {
    id: 'case-1-keshi',
    name: 'keshi: Acoustic Production & Songwriting Decisions',
    category: 'music',
    description: 'Explores songwriting workflow, home studio arrangements, and emotional resonance.',
    topics: ['keshi', 'lo-fi acoustic music', 'home studio recording'],
    grade: 'A2_basic',
    primarySkill: 'purpose_speaker_intent',
    cognitiveDepth: 'D2_single_step_inference',
    plannedFormats: ['written:lines', 'sequence:horizontal'],
    isCurrent: false,
  },
  {
    id: 'case-2-kpop',
    name: 'K-pop: 2NE1 & IU Live Vocal & Stage Preparation',
    category: 'kpop',
    description: 'Examines debut rehearsals, stage coordination, and live vocal training decisions.',
    topics: ['2NE1', 'IU', 'vocal warmups', 'stage performance'],
    grade: 'B1_intermediate',
    primarySkill: 'information_integration',
    cognitiveDepth: 'D3_multi_step_synthesis',
    plannedFormats: ['written:lines', 'table:grid'],
    isCurrent: false,
  },
  {
    id: 'case-3-animation',
    name: 'Animation: Your Name (Kimi no Na wa) Art & Lighting',
    category: 'animation',
    description: 'Analyzes visual storytelling, twilight color palettes, and Makoto Shinkai directing.',
    topics: ['Your Name', 'animation lighting', 'background art direction'],
    grade: 'A2_basic',
    primarySkill: 'evaluative_judgment',
    cognitiveDepth: 'D4_applied_evaluation',
    plannedFormats: ['table:organizer', 'written:lines'],
    isCurrent: false,
  },
  {
    id: 'case-4-movie-adaptation',
    name: 'Movie Adaptation: Book to Screen Creative Condensation',
    category: 'movie',
    description: 'Compares how novel chapters translate to screenplay scenes and pacing choices.',
    topics: ['novel adaptation', 'screenplay writing', 'visual framing'],
    grade: 'B1_intermediate',
    primarySkill: 'structure_organization',
    cognitiveDepth: 'D3_multi_step_synthesis',
    plannedFormats: ['table:grid', 'written:lines'],
    isCurrent: false,
  },
  {
    id: 'case-5-character-choice',
    name: 'Character Choice: Chihiro in Spirited Away',
    category: 'character',
    description: 'Evaluates character motivations, tradeoffs, and consequences under pressure.',
    topics: ['Chihiro', 'Spirited Away', 'character choices'],
    grade: 'A2_basic',
    primarySkill: 'purpose_speaker_intent',
    cognitiveDepth: 'D2_single_step_inference',
    plannedFormats: ['written:lines', 'table:organizer'],
    isCurrent: false,
  },
  {
    id: 'case-6-science-mechanism',
    name: 'Science Mechanism: Robotics Vision & Sensor Calibration',
    category: 'science',
    description: 'Explains optical camera recognition, light interference, and iterative testing.',
    topics: ['robotics vision', 'optical sensors', 'experimental controls'],
    grade: 'A2_basic',
    primarySkill: 'cause_effect',
    cognitiveDepth: 'D3_multi_step_synthesis',
    plannedFormats: ['sequence:horizontal', 'written:lines'],
    isCurrent: false,
  },
  {
    id: 'case-7-table-organizer',
    name: 'Format Variety: Evidence Matrix & Deductive Flowchart',
    category: 'format_organizer',
    description: 'Structured comparison of three historical navigation instruments using table and organizer.',
    topics: ['navigation tools', 'compass', 'astrolabe', 'sextant'],
    grade: 'B1_intermediate',
    primarySkill: 'information_integration',
    cognitiveDepth: 'D3_multi_step_synthesis',
    plannedFormats: ['table:grid', 'table:organizer'],
    isCurrent: false,
  },
  {
    id: 'case-8-current-vs-evergreen',
    name: 'Current vs Evergreen: James Webb Telescope Deep Field Discoveries',
    category: 'current_vs_evergreen',
    description: 'Recent astronomical observations grounded with exact dates versus durable optics principles.',
    topics: ['James Webb Space Telescope', 'infrared astronomy', 'deep field images'],
    grade: 'B1_intermediate',
    primarySkill: 'cause_effect',
    cognitiveDepth: 'D4_applied_evaluation',
    plannedFormats: ['table:grid', 'written:lines'],
    isCurrent: true,
  },
]

/** Controlled sizing fixtures, never learner records or verified factual research. */
export async function runContextCompactionBenchmark() {
  const outputDir = resolve(REPO_ROOT, 'docs/evaluations')
  await mkdir(outputDir, { recursive: true })
  const baseBundle = (await compileProductionBundle(REPO_ROOT)).content
  const policy = await readFile(resolve(REPO_ROOT, 'packages/generator/curriculum/interest-exploration.md'), 'utf8')
  const caseResults = []
  for (const c of BENCHMARK_CASES) {
    const memory = [{ materialWeek: 'Week 10', weekNumber: 10, readingGenre: 'article', readingTitle: 'Sizing fixture only', introducedVocabulary: [], responseLayoutTypes: ['lines'], pedagogicalFormats: ['written:lines'] }]
    const packetPlan = {
      selectedAngle: c.name, evidenceRationale: 'Sizing fixture: selection quality is not evaluated here.',
      selectedLearningTargets: { vocabulary: [], grammar: [] },
      assessmentPlans: c.plannedFormats.map((format, index) => ({ itemId: `q${index + 1}`, primarySkill: c.primarySkill, targetSkill: c.primarySkill, targetLanguageDifficulty: c.grade, targetCognitiveDepth: c.cognitiveDepth, responseFormat: format, learningFunction: 'sizing fixture', reasoningOperation: 'inference', formatRationale: 'sizing fixture', scaffoldLevel: 'supported' as const })),
    }
    const context = { child: { grade: 8, preferences: { interests: c.topics } }, profile: { baseline_level: c.grade, weekly_minutes: 45 }, recentDeliveryMemory: memory, diversityCapsule: { recentDeliveryMemory: memory }, packetPlan }
    const grounding = `UNVERIFIED SIZING INPUT ONLY. Research question: ${c.description} No factual claims, source validation or model output is represented.`
    const brief = JSON.stringify({ queries: [c.topics.join(' ')], topicSummary: c.description })
    const { bundle, itemResults } = await prepareAuthoringBundleWithPrecedents(baseBundle, context, { repoRoot: REPO_ROOT, assessmentPlans: packetPlan.assessmentPlans })
    const authorContext = { ...context, perItemPrecedents: itemResults }
    // Matched inputs. Baseline is the same release before presentation compaction,
    // not an invented historical dump or a claimed production lifecycle trace.
    const cards = await retrievePrecedentsForAssessmentPlans(packetPlan.assessmentPlans, { limit: 3, repoRoot: REPO_ROOT })
    const prettyBundle = assembleSelectiveAuthoringBundle(baseBundle, cards.expandedCards)
      .replace(JSON.stringify(cards.expandedCards), JSON.stringify(cards.expandedCards, null, 2))
    const stages = [
      { stage: 'topic-screen', current: planningPrompt(buildPrivatePlanningCapsule(context), policy) },
      { stage: 'public-research', current: researchPrompt(brief, policy) },
      { stage: 'packet-plan', current: buildPacketPlanningPrompt(context, grounding) },
      { stage: 'author', current: authoringPrompt(bundle, authorContext, grounding) },
      { stage: 'optional-author-repair', current: authoringPrompt(bundle, authorContext, grounding, JSON.stringify({ sizingFixture: true }), 'Sizing fixture diagnostic') },
    ].map(row => {
      const baseline = row.stage.includes('author')
        ? row.current.replace(compactAuthoringBundle(bundle), prettyBundle)
          .replace(JSON.stringify(compactAuthoringContext(authorContext)), JSON.stringify(authorContext))
        : row.current
      const before = measurePromptInput(baseline)
      const after = measurePromptInput(row.current)
      return { stage: row.stage, beforeChars: before.chars, afterChars: after.chars, beforeBytes: before.bytes, afterBytes: after.bytes, savedChars: before.chars - after.chars }
    })
    caseResults.push({ caseId: c.id, scenario: c.name, retrievedCards: cards.expandedCards.length, stages })
  }
  const rows = caseResults.flatMap(c => c.stages)
  const before = rows.reduce((sum, r) => sum + r.beforeChars, 0)
  const after = rows.reduce((sum, r) => sum + r.afterChars, 0)
  const manifest = { engineVersion: CURRENT_ENGINE_VERSION, promptVersion: CURRENT_PROMPT_VERSION, measurement: 'controlled-prompt-builder-sizing', baseline: 'same release and inputs before presentation compaction', includesOptionalRepair: true, providerTokensMeasured: false, qualityEvaluated: false, beforeChars: before, afterChars: after, reductionPercent: Number((100 * (before - after) / before).toFixed(2)), caseResults }
  await writeFile(resolve(outputDir, 'release-1.8.2-compaction-manifest.json'), JSON.stringify(manifest, null, 2))
  await writeFile(resolve(outputDir, 'release-1.8.2-compaction-benchmark.md'), [
    '# Release 1.8.2: controlled context sizing', '',
    'This is a reproducible comparison of real prompt-builder strings with explicitly synthetic sizing inputs. It does not measure production executions, verified research, teaching quality, hidden system/tool context, or billed tokens. No fabricated biography/science claims are used as grounding.', '',
    `Matched baseline: same release and evidence before presentation compaction. ${before} → ${after} characters (${manifest.reductionPercent}% reduction), including one optional repair per case.`, '',
    'Savings come only from whitespace in retrieved CAP cards, duplicate delivery memory, and runtime removal of build hashes / legacy conversion implementations. Current schema definitions, teaching rules, per-item precedent refs, feedback and repair evidence remain available.', '',
    '| Scenario | CAP cards | Before chars | After chars |', '|---|---:|---:|---:|',
    ...caseResults.map(c => `| ${c.scenario} | ${c.retrievedCards} | ${c.stages.reduce((s,r)=>s+r.beforeChars,0)} | ${c.stages.reduce((s,r)=>s+r.afterChars,0)} |`), '',
    'Actual local executions now write `.runtime/private-generation/<job>/prompt-metrics.json`: every attempted model input, stage, status, UTF-8 bytes and SHA-256, including planning and author repairs. These private runtime records are not committed. Provider-reported usage and tool-result sizes require separate instrumentation; character counts must not be described as token savings.', '',
  ].join('\n'))
  console.log(JSON.stringify({ before, after, reductionPercent: manifest.reductionPercent }))
}
if (process.argv[1]?.endsWith('run-context-compaction-benchmark.ts')) runContextCompactionBenchmark().catch(error => { console.error(error); process.exit(1) })
