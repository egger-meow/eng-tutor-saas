from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'expected text not found in {path}: {old[:100]!r}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


# 1. Real Finisher gate: auditCurriculumPackage is already on the deterministic
# worker path, so Prompt 2.9 packages must pass the CAP floor there.
audit_path = Path('packages/generator/src/audit-curriculum.ts')
audit = audit_path.read_text(encoding='utf-8')
import_anchor = "import { evaluateWorkloadFit, isWithinWorkloadExceptionBand, WORKLOAD_BUDGET_EXCEPTION_CHECK_ID } from './workload-fit.js'"
if "auditCapPrecedentPackage" not in audit:
    if import_anchor not in audit:
        raise SystemExit('audit import anchor missing')
    audit = audit.replace(import_anchor, import_anchor + "\nimport { auditCapPrecedentPackage } from './cap-precedent-audit.js'", 1)
add_anchor = "  const add = (tier: CurriculumAuditTier, dimension: string, severity: CurriculumAuditFinding['severity'], message: string) => findings.push({ tier, dimension, severity, message })\n\n"
cap_gate = """  if (pkg.metadata.promptVersion.includes('2.9.0')) {\n    const capAudit = auditCapPrecedentPackage(pkg)\n    for (const message of capAudit.findings) add('semantic-critical', 'cap-precedent-floor', 'critical', message)\n  }\n\n"""
if cap_gate not in audit:
    if add_anchor not in audit:
        raise SystemExit('audit add anchor missing')
    audit = audit.replace(add_anchor, add_anchor + cap_gate, 1)
audit_path.write_text(audit, encoding='utf-8')


# 2. Export the production CAP runtime/retriever/audit surfaces.
index_path = Path('packages/generator/src/index.ts')
index = index_path.read_text(encoding='utf-8')
export_anchor = "export type { CurriculumAuditFinding, CurriculumAuditReport, CurriculumAuditTier } from './audit-curriculum.js'\n"
cap_exports = "export { auditCapPrecedentFloor, auditCapPrecedentPackage, retrieveCapPrecedents, capRuntimeMetadata } from './cap-precedent-audit.js'\nexport type { CapAssessmentIntent, CapAssessmentPlan, CapDesignAnchor, CapPrecedentAuditResult, CapPrecedentRuntimeBundle } from './cap-precedent-audit.js'\n"
if cap_exports not in index:
    if export_anchor not in index:
        raise SystemExit('generator index export anchor missing')
    index = index.replace(export_anchor, export_anchor + cap_exports, 1)
index_path.write_text(index, encoding='utf-8')


# 3. Prompt 2.9 is the frozen through-2.8 prompt stack plus the compiled CAP
# precedent contract. Do not clone/fake a byte-identical 2.8 prompt directory.
engine_path = Path('packages/generator/src/engine-version.ts')
engine = engine_path.read_text(encoding='utf-8')
engine = engine.replace("export const CURRENT_PROMPT_VERSION = '2.8.0'", "export const CURRENT_PROMPT_VERSION = '2.9.0'")
engine_path.write_text(engine, encoding='utf-8')

bundle_path = Path('packages/generator/src/bundle-compiler.ts')
bundle = bundle_path.read_text(encoding='utf-8')
bundle = bundle.replace(".replaceAll('2.4.0', '2.8.0')", ".replaceAll('2.4.0', '2.9.0')")
bundle = bundle.replace("bundleVersion: '2.8.0-prod'", "bundleVersion: '2.9.0-prod'")
bundle = bundle.replace("promptVersion: '2.8.0'", "promptVersion: '2.9.0'")
bundle_path.write_text(bundle, encoding='utf-8')

bundle_test_path = Path('packages/generator/src/bundle-compiler.test.ts')
bundle_test = bundle_test_path.read_text(encoding='utf-8')
bundle_test = bundle_test.replace("expect(freshBundle.metadata.promptVersion).toBe('2.8.0')", "expect(freshBundle.metadata.promptVersion).toBe('2.9.0')")
bundle_test = bundle_test.replace("expect(freshBundle.metadata.bundleVersion).toBe('2.8.0-prod')", "expect(freshBundle.metadata.bundleVersion).toBe('2.9.0-prod')")
bundle_test = bundle_test.replace("expect(freshBundle.content).toContain('qualityEvidence.precedentRefs')", "expect(freshBundle.content).toContain('cap-plan:<questionId>')")
bundle_test = bundle_test.replace("expect(freshBundle.content).toContain('Language difficulty and cognitive depth are independent controls')", "expect(freshBundle.content).toContain('A weaker learner may receive A1/A2 language with D2/D3 thinking')")
bundle_test_path.write_text(bundle_test, encoding='utf-8')


# 4. Rolling build order. Holdouts rotate after analysis and before synthesis;
# cards/debug index and hash seal happen only after authoritative validation.
cli_path = Path('scripts/history-exams/src/cli.ts')
cli = cli_path.read_text(encoding='utf-8')
cli = cli.replace("import { reconcileRollingWindow } from './corpus/rolling-window.ts';", "import { commitRollingWindowManifest, reconcileRollingWindow } from './corpus/rolling-window.ts';")
# Fix the pre-existing invalid pilot reference to a build-local variable.
cli = cli.replace("      rotateHoldoutManifest(analyzedDir, benchmarkDir, rolling.examIds);\n", "", 1)
start = cli.index("    case 'build': {")
end = cli.index("    case 'reconcile': {", start)
block = cli[start:end]
analysis_anchor = """      await runAnalysisPipeline({
        extractedDir,
        analyzedDir,
        providerName,
        modelName,
        concurrency,
        force: false,
        allowOfflineMock: allowProvisionalMock,
      });
"""
if "rotateHoldoutManifest(analyzedDir, benchmarkDir, rolling.examIds);" not in block:
    if analysis_anchor not in block:
        raise SystemExit('CLI build analysis anchor missing')
    block = block.replace(analysis_anchor, analysis_anchor + "      rotateHoldoutManifest(analyzedDir, benchmarkDir, rolling.examIds);\n", 1)
block = block.replace("      writePrecedentCards(analyzedDir, benchmarkDir, path.resolve(rootDir, 'packages/generator/curriculum/cap-precedent-cards.json'));\n", "")
block = block.replace("      if (!report.valid) {", "      if (!report.valid || !report.authorityEligible || report.authorityStatus !== 'authoritative') {")
success_anchor = "      console.log(`[history-exams] Complete digestion pipeline successfully built, validated, and spot-check/pilot reports generated!`);"
final_steps = """      writePrecedentCards(
        analyzedDir,
        benchmarkDir,
        path.resolve(rootDir, 'packages/generator/curriculum/cap-precedent-cards.json'),
        path.resolve(rootDir, 'history_exams/knowledge/cap-precedent-index.json'),
      );
      commitRollingWindowManifest(rawDir, rolling);
"""
if final_steps not in block:
    if success_anchor not in block:
        raise SystemExit('CLI build success anchor missing')
    block = block.replace(success_anchor, final_steps + success_anchor, 1)
cli = cli[:start] + block + cli[end:]
old_precedents = "const cards = writePrecedentCards(analyzedDir, benchmarkDir, path.resolve(rootDir, 'packages/generator/curriculum/cap-precedent-cards.json'));"
new_precedents = "const cards = writePrecedentCards(analyzedDir, benchmarkDir, path.resolve(rootDir, 'packages/generator/curriculum/cap-precedent-cards.json'), path.resolve(rootDir, 'history_exams/knowledge/cap-precedent-index.json'));"
cli = cli.replace(old_precedents, new_precedents)
cli_path.write_text(cli, encoding='utf-8')


# 5. Expand anti-copy fingerprints to include the linked passage/subdocuments as
# well as the stem/options. No historical wording is emitted into runtime cards.
builder_path = Path('scripts/history-exams/src/precedents/build-precedent-cards.ts')
builder = builder_path.read_text(encoding='utf-8')
old_genre_fn = """function passageGenresForExam(analyzedDir: string, examId: string): Map<string, string> {
  const extractedPath = path.resolve(analyzedDir, '../extracted', `${examId}.json`)
  if (!fs.existsSync(extractedPath)) return new Map()
  const exam = ExtractedExamSchema.parse(JSON.parse(fs.readFileSync(extractedPath, 'utf8')))
  return new Map(exam.passages.map((passage) => [passage.id, passage.genre]))
}
"""
new_context_fn = """function passageContextForExam(analyzedDir: string, examId: string): Map<string, { genre: string; copyText: string }> {
  const extractedPath = path.resolve(analyzedDir, '../extracted', `${examId}.json`)
  if (!fs.existsSync(extractedPath)) return new Map()
  const exam = ExtractedExamSchema.parse(JSON.parse(fs.readFileSync(extractedPath, 'utf8')))
  return new Map(exam.passages.map((passage) => [passage.id, {
    genre: passage.genre,
    copyText: [passage.title ?? '', passage.text, ...(passage.subDocuments ?? []).flatMap((doc) => [doc.title ?? '', doc.author ?? '', doc.text])].join(' '),
  }]))
}
"""
if old_genre_fn in builder:
    builder = builder.replace(old_genre_fn, new_context_fn, 1)
builder = builder.replace("    const passageGenres = passageGenresForExam(analyzedDir, exam.examId)", "    const passageContext = passageContextForExam(analyzedDir, exam.examId)")
builder = builder.replace("      const sourceText = `${question.extracted.stem} ${Object.values(question.extracted.options).join(' ')}`", "      const linkedPassage = question.extracted.passageId ? passageContext.get(question.extracted.passageId) : undefined\n      const sourceText = `${linkedPassage?.copyText ?? ''} ${question.extracted.stem} ${Object.values(question.extracted.options).join(' ')}`")
builder = builder.replace("genre: question.extracted.passageId ? (passageGenres.get(question.extracted.passageId) ?? question.extracted.section) : question.extracted.section,", "genre: linkedPassage?.genre ?? question.extracted.section,")
builder_path.write_text(builder, encoding='utf-8')


# 6. Canonical product/docs contract. CAP is a production assessment-design
# layer, not just an R&D appendix.
schedule_path = Path('docs/chatgpt-work-daily-schedule.md')
schedule = schedule_path.read_text(encoding='utf-8')
schedule = schedule.replace('Engine 1.4.0 / Prompt 2.8.0', 'Engine 1.4.0 / Prompt 2.9.0')
schedule_path.write_text(schedule, encoding='utf-8')

spec_path = Path('docs/SPEC.md')
spec = spec_path.read_text(encoding='utf-8')
old_cap_source = "Historical CAP English exam design knowledge (taxonomy, question recipes, distractor patterns, cognitive depth framework, and benchmark foundation) lives independently under `history_exams/` and `docs/history-exams/` as an assessment-design reference."
new_cap_source = old_cap_source + "\n\nProduction assessment authoring consumes only the deterministically compiled **authoritative non-holdout CAP runtime bundle**. Raw historical PDFs and heavy visual assets never enter normal weekly generation. For normal assessment/application/comprehension items, a relevant authentic CAP precedent is a required design anchor rather than optional inspiration; intentional vocabulary/grammar retrieval remains exempt when explicitly planned as retrieval."
if old_cap_source in spec and new_cap_source not in spec:
    spec = spec.replace(old_cap_source, new_cap_source, 1)
validation_anchor = "* required grounding accuracy and copyright critical checks pass."
cap_validation = """* required grounding accuracy and copyright critical checks pass.
* Prompt 2.9+ normal assessment/application/comprehension items have per-item CAP assessment plans; relevant authoritative precedent retrieval cannot be silently skipped.
* package-level CAP precedent refs equal the union of per-item refs and resolve only to the authoritative non-holdout runtime bundle.
* CAP language difficulty and cognitive depth are validated independently; simplifying English must not silently erase planned reasoning.
* deterministic CAP copy-fingerprint and shallow-assessment checks pass before rendering."""
if validation_anchor in spec and 'per-item CAP assessment plans' not in spec:
    spec = spec.replace(validation_anchor, cap_validation, 1)
section_206 = "\n# 206. Core Architectural Summary"
cap_agent_rules = """
24. Under Prompt 2.9+, normal assessment/application/comprehension authoring is precedent-first: retrieve 1–5 relevant authoritative non-holdout CAP design anchors before writing the item, and preserve mechanics rather than wording.
25. Keep language difficulty independent from cognitive depth. A1/A2 surface language may still carry D2/D3 reasoning when that serves the learner.
26. Record per-item CAP design provenance internally, never in Student/Parent PDFs; intentional vocabulary/grammar retrieval is allowed only when explicitly planned as retrieval.
27. The deterministic Finisher must fail closed on missing/unknown CAP refs, authority/provenance mismatch, blank-page authoring when a relevant precedent exists, copy overlap, or accidental shallow assessment; repair only the failing item/local cluster.
"""
if section_206 in spec and 'normal assessment/application/comprehension authoring is precedent-first' not in spec:
    spec = spec.replace(section_206, cap_agent_rules + section_206, 1)
spec_path.write_text(spec, encoding='utf-8')


# 7. README rolling-window contract must match reality and official-answer usage.
readme_path = Path('docs/history-exams/README.md')
readme = readme_path.read_text(encoding='utf-8')
readme = readme.replace(
    "1. **No Hallucinated Answers**: The official student test booklets in `history_exams/raw/` contain questions and passages, but do not contain printed answer keys. In strict accordance with repository fidelity rules, `answer` is recorded as `null` rather than fabricated.",
    "1. **Verified Official Answers**: Student booklets do not contain answer keys. Each active year therefore requires a separately verified official RCPET 43-item answer key before extraction/build may proceed; the pipeline fails closed instead of guessing answers.",
)
readme = readme.replace(
    "- Validate 100% of data structures against Zod contracts.",
    "- Validate 100% of data structures against Zod contracts.\n   - Seal the rolling source hashes only after the rebuilt corpus is authoritative, so a crashed update cannot reuse stale analyses on the next run.",
)
readme_path.write_text(readme, encoding='utf-8')


# 8. Focused regression tests.
Path('packages/generator/src/cap-precedent-audit.test.ts').write_text(r'''import { describe, expect, it } from 'vitest'
import {
  auditCapPrecedentFloor,
  auditCapPrecedentPackage,
  retrieveCapPrecedents,
  type CapPrecedentRuntimeBundle,
} from './cap-precedent-audit.js'

const card = {
  ref: 'cap-0123456789ab', genre: 'article_informational', primarySkill: 'local_inference', secondarySkills: [],
  cognitiveDepth: 'D2_single_step_inference', languageDifficulty: 'A1_elementary', evidenceMode: 'text_only',
  evidenceNecessity: 'essential', evidenceSpan: 'cross_sentence_local', reasoningOperations: ['connect evidence'],
  questionMechanism: 'infer a result from two clues', whyTheQuestionWorks: 'context is required',
  correctAnswerConstructionPrinciple: 'one option follows both clues', distractorStrategies: ['partial_truth'],
  reusableDesignPrinciple: 'make two clues jointly decisive',
  difficultyAdjustment: { simplificationConstraints: ['keep two clues'], depthAdjustmentStrategies: ['add a competing clue'] },
  copyGuardHashes: [],
}
const runtime: CapPrecedentRuntimeBundle = {
  version: 'test', authorityStatus: 'authoritative', capKnowledgeVersion: 'k', capCorpusHash: 'a'.repeat(64),
  capBundleVersion: 'b', plannerVersion: 'p', qualityFloorVersion: 'q', cards: [card],
}
const provenance = JSON.stringify({ capKnowledgeVersion: 'k', capCorpusHash: 'a'.repeat(64), capBundleVersion: 'b', plannerVersion: 'p', qualityFloorVersion: 'q' })
const plan = (overrides = {}) => JSON.stringify({
  learningObjective: 'infer from evidence', primarySkill: 'local_inference', secondarySkills: [],
  targetLanguageDifficulty: 'A1_elementary', targetCognitiveDepth: 'D2_single_step_inference', evidenceMode: 'text_only',
  evidenceSpan: 'cross_sentence_local', reasoningOperations: ['connect evidence'], precedentRefs: ['cap-0123456789ab'],
  preservedMechanics: ['two clues jointly decide'], adaptationStrategy: ['change topic and wording'], distractorStrategies: ['partial_truth'],
  intentionalRecall: false, noPrecedentReason: null, ...overrides,
})
const pkg = (planEvidence: string | null, question = { id: 'q1', itemType: 'inference', prompt: 'What can we infer from both clues?', options: ['A', 'B', 'C', 'D'] }) => ({
  studentLesson: { reading: { blocks: [{ type: 'paragraph', text: 'Mia saw wet streets. She also saw people closing umbrellas.' }] }, practice: [{ stage: 'independent', questions: [question] }], homework: { questions: [] } },
  qualityEvidence: {
    precedentRefs: ['cap-0123456789ab'],
    criticalChecks: [
      { id: 'cap-provenance', passed: true, evidence: provenance },
      ...(planEvidence ? [{ id: 'cap-plan:q1', passed: true, evidence: planEvidence }] : []),
    ],
  },
})

describe('CAP precedent deterministic quality floor', () => {
  it('keeps the low-level unknown/missing ref primitive', () => {
    const available = new Set(['cap-0123456789ab'])
    expect(auditCapPrecedentFloor({ capTransferQuestionCount: 1, precedentRefs: [], availableRefs: available }).passed).toBe(false)
    expect(auditCapPrecedentFloor({ capTransferQuestionCount: 1, precedentRefs: ['cap-0123456789ab'], availableRefs: available }).passed).toBe(true)
  })

  it('retrieves relevant anchors deterministically', () => {
    expect(retrieveCapPrecedents(JSON.parse(plan()), runtime).map((item) => item.ref)).toEqual(['cap-0123456789ab'])
  })

  it('blocks blank-page assessment authoring when a relevant precedent exists', () => {
    expect(auditCapPrecedentPackage(pkg(plan({ precedentRefs: [] })), runtime).findings.join('\n')).toContain('CAP_PRECEDENT_MISSING:q1')
  })

  it('requires a per-item plan and exact runtime provenance', () => {
    expect(auditCapPrecedentPackage(pkg(null), runtime).findings.join('\n')).toContain('CAP_ITEM_PLAN_MISSING:q1')
    const bad = pkg(plan())
    bad.qualityEvidence.criticalChecks[0]!.evidence = JSON.stringify({ capKnowledgeVersion: 'wrong' })
    expect(auditCapPrecedentPackage(bad, runtime).findings.join('\n')).toContain('CAP_PROVENANCE_MISMATCH')
  })

  it('allows explicit vocabulary recall without forcing CAP imitation', () => {
    const recall = pkg(plan({ intentionalRecall: true, precedentRefs: [] }), { id: 'q1', itemType: 'vocabulary', prompt: 'brave = ?', options: ['勇敢的', '安靜的', '古老的', '昂貴的'] })
    recall.qualityEvidence.precedentRefs = []
    expect(auditCapPrecedentPackage(recall, runtime).passed).toBe(true)
  })

  it('rejects naked dictionary-definition prompts in normal assessment', () => {
    const weak = pkg(plan(), { id: 'q1', itemType: 'context-clue', prompt: 'What is the meaning of brave?', options: ['A', 'B', 'C', 'D'] })
    expect(auditCapPrecedentPackage(weak, runtime).findings.join('\n')).toContain('CAP_SHALLOW_ASSESSMENT:q1')
  })

  it('keeps easy language independent from deeper cognition', () => {
    const deepCard = { ...card, cognitiveDepth: 'D3_multi_step_synthesis', evidenceSpan: 'multi_paragraph_global' }
    const deepRuntime = { ...runtime, cards: [deepCard] }
    const deepPlan = plan({ targetLanguageDifficulty: 'A1_elementary', targetCognitiveDepth: 'D3_multi_step_synthesis', evidenceSpan: 'multi_paragraph_global' })
    expect(auditCapPrecedentPackage(pkg(deepPlan), deepRuntime).passed).toBe(true)
  })
})
''', encoding='utf-8')

Path('packages/generator/src/cap-precedent-evaluation.test.ts').write_text(r'''import { describe, expect, it } from 'vitest'
import { auditCapPrecedentFloor } from './cap-precedent-audit.js'

describe('CAP quality-floor evaluation harness', () => {
  it('turns precedent coverage into a measurable floor instead of an inspirational hint', () => {
    const available = new Set(['cap-0123456789ab'])
    const baseline = auditCapPrecedentFloor({ capTransferQuestionCount: 3, precedentRefs: [], availableRefs: available })
    const grounded = auditCapPrecedentFloor({ capTransferQuestionCount: 3, precedentRefs: ['cap-0123456789ab'], availableRefs: available })
    expect(baseline.passed).toBe(false)
    expect(grounded.passed).toBe(true)
    expect(baseline.findings[0]).toContain('CAP_PRECEDENT_MISSING')
  })
})
''', encoding='utf-8')

Path('tests/history-exams/precedent-cards.test.ts').write_text(r'''import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildPrecedentCards, buildPrecedentRuntimeBundle } from '../../scripts/history-exams/src/precedents/build-precedent-cards.ts'

describe('production CAP precedent cards', () => {
  it('exposes 195 authoritative non-holdout design anchors without historical wording or source identities', () => {
    const root = process.cwd()
    const analyzed = path.join(root, 'history_exams/analyzed')
    const benchmark = path.join(root, 'history_exams/benchmark')
    const cards = buildPrecedentCards(analyzed, benchmark)
    expect(cards).toHaveLength(195)
    expect(new Set(cards.map((card) => card.ref)).size).toBe(195)
    expect(cards.every((card) => /^cap-[a-f0-9]{12}$/.test(card.ref))).toBe(true)
    expect(JSON.stringify(cards)).not.toMatch(/111-Q\d|112-Q\d|113-Q\d|114-Q\d|115-Q\d/)
    expect(cards.every((card) => card.questionMechanism && card.reasoningOperations.length > 0 && card.reusableDesignPrinciple)).toBe(true)
    expect(cards.every((card) => card.evidenceNecessity && card.difficultyAdjustment && Array.isArray(card.copyGuardHashes))).toBe(true)
    const runtime = buildPrecedentRuntimeBundle(analyzed, benchmark)
    expect(runtime.authorityStatus).toBe('authoritative')
    expect(runtime.capCorpusHash).toMatch(/^[a-f0-9]{64}$/)
  })
})
''', encoding='utf-8')

Path('tests/history-exams/rolling-window.test.ts').write_text(r'''import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { commitRollingWindowManifest, reconcileRollingWindow } from '../../scripts/history-exams/src/corpus/rolling-window.ts'

const roots: string[] = []
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-window-')); roots.push(root)
  const dirs = Object.fromEntries(['raw', 'extracted', 'analyzed', 'assets', 'agent'].map((name) => {
    const dir = path.join(root, name); fs.mkdirSync(dir); return [name, dir]
  })) as Record<string, string>
  for (const id of ['111', '112', '113', '114', '115']) {
    fs.writeFileSync(path.join(dirs.raw!, `${id}P_English.pdf`), `pdf-${id}`)
    fs.writeFileSync(path.join(dirs.extracted!, `${id}.json`), '{}')
    fs.writeFileSync(path.join(dirs.analyzed!, `${id}.json`), '{}')
  }
  return dirs
}
afterEach(() => roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })))

describe('rolling five-year CAP corpus', () => {
  it('reuses only a successfully sealed authoritative window and purges stale artifacts', () => {
    const d = fixture()
    fs.writeFileSync(path.join(d.extracted!, '110.json'), '{}'); fs.mkdirSync(path.join(d.assets!, '110'))
    let result = reconcileRollingWindow({ rawDir: d.raw!, extractedDir: d.extracted!, analyzedDir: d.analyzed!, assetsDir: d.assets!, agentAnalysisDir: d.agent! })
    expect(result.removedExamIds).toEqual(['110'])
    expect(result.unchangedExamIds).toEqual([])
    commitRollingWindowManifest(d.raw!, result)
    result = reconcileRollingWindow({ rawDir: d.raw!, extractedDir: d.extracted!, analyzedDir: d.analyzed!, assetsDir: d.assets!, agentAnalysisDir: d.agent! })
    expect(result.unchangedExamIds).toEqual(['111', '112', '113', '114', '115'])
  })

  it('does not seal changed PDF hashes before a successful build', () => {
    const d = fixture()
    const initial = reconcileRollingWindow({ rawDir: d.raw!, extractedDir: d.extracted!, analyzedDir: d.analyzed!, assetsDir: d.assets! })
    commitRollingWindowManifest(d.raw!, initial)
    fs.appendFileSync(path.join(d.raw!, '115P_English.pdf'), '-changed')
    expect(reconcileRollingWindow({ rawDir: d.raw!, extractedDir: d.extracted!, analyzedDir: d.analyzed!, assetsDir: d.assets! }).changedExamIds).toEqual(['115'])
    expect(reconcileRollingWindow({ rawDir: d.raw!, extractedDir: d.extracted!, analyzedDir: d.analyzed!, assetsDir: d.assets! }).changedExamIds).toEqual(['115'])
  })

  it('fails before derivation when a new year lacks a verified 43-item key', () => {
    const d = fixture(); fs.rmSync(path.join(d.raw!, '111P_English.pdf')); fs.writeFileSync(path.join(d.raw!, '116P_English.pdf'), 'new')
    expect(() => reconcileRollingWindow({ rawDir: d.raw!, extractedDir: d.extracted!, analyzedDir: d.analyzed!, assetsDir: d.assets! })).toThrow('no verified official 43-item answer key')
  })
})
''', encoding='utf-8')
