import { readFile, writeFile } from 'node:fs/promises'

async function replaceRequired(path, from, to) {
  const content = await readFile(path, 'utf8')
  if (!content.includes(from)) {
    throw new Error(`Required patch anchor not found in ${path}: ${from.slice(0, 160)}`)
  }
  await writeFile(path, content.replace(from, to))
}

const auditPath = 'packages/generator/src/audit-curriculum.ts'
await replaceRequired(
  auditPath,
`  const findings: CurriculumAuditFinding[] = []
  const add = (tier: CurriculumAuditTier, dimension: string, severity: CurriculumAuditFinding['severity'], message: string) => findings.push({ tier, dimension, severity, message })`,
`  const findings: CurriculumAuditFinding[] = []

  // Finisher policy: deterministic validation fails closed only on objective integrity
  // failures. Heuristic quality signals must not reject otherwise valid material.
  // The official 2000-word list is a planning reference, never a publish allowlist.
  const suppressedHeuristicDimensions = new Set(['lexical-ceiling'])
  const warningOnlyHeuristicDimensions = new Set([
    'cognitive-load',
    'lexical-unit-mix',
    'lexical-anchor',
    'mcq-position-leakage',
  ])
  const add = (tier: CurriculumAuditTier, dimension: string, severity: CurriculumAuditFinding['severity'], message: string) => {
    if (suppressedHeuristicDimensions.has(dimension)) return
    const effectiveSeverity = severity === 'critical' && warningOnlyHeuristicDimensions.has(dimension) ? 'warning' : severity
    findings.push({ tier, dimension, severity: effectiveSeverity, message })
  }`,
)

await replaceRequired(
  auditPath,
`check.id === 'grounding-density-exception' && check.passed && check.evidence.trim().length >= 60`,
`check.id === 'grounding-density-exception' && check.passed && check.evidence.trim().length > 0`,
)

await replaceRequired(
  auditPath,
`  if (pkg.studentLesson.opening.goalsZh.length < 2 || cjk(pkg.studentLesson.opening.howToUseZh) < 8) add('semantic-critical', 'self-study', 'critical', '開場沒有足夠的中文目標或使用說明。')
  if (pkg.studentLesson.instruction.some((section) => section.workedExamples.length < 2 || section.commonMistakes.length < 1)) add('semantic-critical', 'self-study', 'critical', '每個新概念都需要至少兩個 worked examples 與一個錯誤對照。')`,
`  if (pkg.studentLesson.opening.goalsZh.length < 2 || cjk(pkg.studentLesson.opening.howToUseZh) < 8) add('semantic-critical', 'self-study', 'warning', '開場中文目標或使用說明偏少；請確認學生仍能自行理解如何使用教材。')
  if (pkg.studentLesson.instruction.some((section) => section.workedExamples.length < 2 || section.commonMistakes.length < 1)) add('semantic-critical', 'self-study', 'warning', '部分新概念的 worked examples / 錯誤對照較少；由 Critic 判斷是否真的影響自學。')`,
)

await replaceRequired(
  auditPath,
`      const evidenceText = checkMatch?.evidence || findingMatch?.finding || ''
      const isSubstantive = typeof evidenceText === 'string' && evidenceText.trim().length >= 30`,
`      const evidenceText = checkMatch?.evidence || findingMatch?.finding || ''
      const hasEvidence = typeof evidenceText === 'string' && evidenceText.trim().length > 0`,
)
await replaceRequired(
  auditPath,
`} else if (!isSubstantive) {
        add(
          'semantic-critical',
          'critic-coverage',
          'critical',
          \`資深審查者 (Critic) 對 "\${dim}" 維度的證據不足 (\${evidenceText.trim().length} 字 < 30 字)。必須提供包含具體題號、單字或數據的實質審查證據。\`,
        )
      }`,
`} else if (!hasEvidence) {
        add(
          'semantic-critical',
          'critic-coverage',
          'critical',
          \`資深審查者 (Critic) 對 "\${dim}" 維度缺少非空白審查證據。\`,
        )
      }`,
)

await replaceRequired(
  auditPath,
`      const hasSubstantiveEvidence = Boolean(exception && exception.evidence.trim().length >= 80)`,
`      const hasSubstantiveEvidence = Boolean(exception && exception.evidence.trim().length > 0)`,
)
await replaceRequired(
  auditPath,
`        add('semantic-critical', 'workload-calibration', 'critical', \`\${WORKLOAD_BUDGET_EXCEPTION_CHECK_ID} requires at least 80 characters of specific evidence explaining why the learner benefits from this bounded exception.\`)`,
`        add('semantic-critical', 'workload-calibration', 'critical', \`\${WORKLOAD_BUDGET_EXCEPTION_CHECK_ID} requires non-empty evidence explaining why the learner benefits from this bounded exception.\`)`,
)

const authorPath = 'packages/generator/prompts/2.10.0/02-author.md'
await replaceRequired(
  authorPath,
`- **Quote Verifiability**: Any quoted sentence or phrase appearing inside a question prompt must be verbatim present in the declared reading passage blocks.`,
`- **Quote Verifiability**: A quote explicitly attributed to the reading/passage/author must be verbatim present in the declared reading blocks. Constructed assessment stimuli (for example, \`A student says, "..."\`) are allowed and are judged by their evidence anchors rather than passage-string identity.`,
)
await replaceRequired(
  authorPath,
`- **Ceiling & Target Integrity**: Never target an untaught, out-of-ceiling word with a context-clue or definition question unless adequate context clues are explicitly built into the primary reading text.
- **Linguistic Richness**: Maintain level-appropriate sentence variety, cohesive conjunctions, and expressive phrasing suited to the learner's calibrated band.`,
`- **Ceiling & Target Integrity**: Use learner-level judgment, context, and instructional value when deciding whether an unfamiliar word is acceptable or should be taught. The official 2000-word foundation is a planning reference, not a deterministic allowlist; ordinary inflections, derivations, compounds, transparent topic words, and natural domain language must not be treated as automatic defects merely because a fixed list or morphology heuristic misses them.
- **Linguistic Richness**: Maintain level-appropriate sentence variety, cohesive conjunctions, and expressive phrasing suited to the learner's calibrated band.`,
)

const criticPath = 'packages/generator/prompts/2.10.0/03-critic.md'
await replaceRequired(
  criticPath,
`In addition to structural, CAP, grounding, and workload audits, the critic MUST independently evaluate and record substantive, non-empty verification evidence (minimum 30 characters each) across the following 5 critical quality dimensions:`,
`In addition to structural, CAP, grounding, and workload audits, the critic MUST independently evaluate and record specific, non-empty verification evidence across the following 5 critical quality dimensions. Do not pad evidence to satisfy a character count.`,
)
await replaceRequired(
  criticPath,
`Verify that all new/extension core vocabulary items are anchored in the primary reading passage, that core vocabulary capacity was not wasted on trivial words while leaving hard words untaught, and that untaught above-ceiling words are not targeted in context-clue questions without textual clues.`,
`Verify lexical appropriateness holistically for this learner: core vocabulary should be useful, genuinely difficult words should receive enough support, and context-clue targets should have usable textual clues. Do not reject merely because a token is outside the official 2000-word list or because a deterministic inflection/derivation heuristic would fail to recognize it.`,
)
await replaceRequired(
  criticPath,
`- **Passing Verification**: All five mandatory dimensions require a substantive (>= 30 characters) passing critical check (\`passed: true\`) in \`qualityEvidence.criticalChecks\` for final deterministic approval.`,
`- **Passing Verification**: All five mandatory dimensions require a specific, non-empty passing critical check (\`passed: true\`) in \`qualityEvidence.criticalChecks\` for final deterministic approval. No arbitrary character minimum applies.`,
)

const specPath = 'docs/SPEC.md'
await replaceRequired(
  specPath,
`A small number of useful extension words may be allowed when clearly identified.`,
`A small number of useful extension words may be allowed when clearly identified.

The official 1200 + 800 foundation is a planning and calibration reference, not a deterministic publication allowlist. A production packet must never fail solely because a natural token is absent from that list or because a finite morphology heuristic does not recognize an inflection, derivation, compound, or transparent topic word.`,
)
await replaceRequired(
  specPath,
`If a difficult word is necessary:

1. make it a core word;
2. or rewrite using simpler language.`,
`If a genuinely difficult word is necessary, the author should normally teach it, support it from context, or rewrite using simpler language.

This is a semantic curriculum objective, not a fixed-list Finisher gate. Deterministic validation must not reject material solely on 2000-word-list membership, token frequency thresholds, morphology guesses, or fixed counts of off-list words. The independent author/critic pair owns the judgment of whether hidden vocabulary actually makes the packet too difficult for the learner.`,
)
await replaceRequired(
  specPath,
`This requirement prevents the common AI worksheet failure:

> supposedly teaching 10 words while secretly requiring 25 more.`,
`This requirement prevents the common AI worksheet failure:

> supposedly teaching 10 words while secretly requiring 25 more.

Validation should therefore prioritize semantic author/critic judgment over brittle token allowlists. Deterministic lexical heuristics may be used for diagnostics, regression investigation, or non-blocking telemetry, but they must not become publication gates unless they prove an objective integrity error rather than approximate language difficulty.`,
)
await replaceRequired(
  specPath,
`* no obvious hidden hard vocabulary;`,
`* semantic review finds no material hidden-vocabulary burden for the learner; deterministic 2000-word membership is not a publish gate;`,
)
await replaceRequired(
  specPath,
`8. Keep hidden vocabulary difficulty controlled.`,
`8. Keep hidden vocabulary difficulty controlled through learner-aware author/critic judgment; do not use fixed word-list membership or finite morphology rules as publication gates.`,
)
await replaceRequired(
  specPath,
`23. Current selection never relaxes source quality, factual density, original synthesis, lexical ceiling, grammar, CAP relevance, answer entailment, workload, copyright, or personalization gates.`,
`23. Current selection never relaxes source quality, factual density, original synthesis, semantic lexical appropriateness, grammar, CAP relevance, answer entailment, workload, copyright, or personalization review.`,
)
await replaceRequired(
  specPath,
`29. The deterministic Finisher must fail closed on missing/unknown/holdout CAP refs, authority/provenance mismatch, blank-page authoring when relevant CAP knowledge exists, invalid retrieval exemptions, copy overlap, answer ambiguity, missing meaningful distractor planning, or cognitive-depth/shallow-assessment failures. It must not reject an item merely for changing topology, answer construction, distractor structure, primary skill, or repeatedly using a still-relevant ref. Semantic Critic review owns unjustified mechanical repetition and targeted repair.`,
`29. The deterministic Finisher must fail closed on missing/unknown/holdout CAP refs, authority/provenance mismatch, blank-page authoring when relevant CAP knowledge exists, invalid retrieval exemptions, copy overlap, answer ambiguity, missing meaningful distractor planning, or cognitive-depth/shallow-assessment failures. It must not reject an item merely for changing topology, answer construction, distractor structure, primary skill, or repeatedly using a still-relevant ref. Semantic Critic review owns unjustified mechanical repetition and targeted repair.
30. Deterministic quality heuristics that approximate style or difficulty through finite lists, morphology rules, character counts, answer-position percentages, vocabulary-card counts, or phrase quotas are warning-only unless they establish an objective integrity violation.`,
)
await replaceRequired(
  specPath,
`14. current grounding has valid publication metadata and independent topic-aware freshness evidence without relaxing pedagogy, privacy, provenance, copyright, or lexical/workload gates.`,
`14. current grounding has valid publication metadata and independent topic-aware freshness evidence without relaxing pedagogy, privacy, provenance, copyright, semantic lexical review, or workload gates.`,
)

const tiersPath = 'packages/generator/src/finisher-tiers.test.ts'
await replaceRequired(
  tiersPath,
`  it('Tier 3 (SEMANTIC CRITICAL): fails quality gate when new vocabulary is unanchored or severe lexical ceiling violation occurs', () => {`,
`  it('Tier 1 (WARNING TELEMETRY): unanchored new vocabulary does not independently block publication', () => {`,
)
await replaceRequired(
  tiersPath,
`    expect(audit.passed).toBe(false)
    const anchorFinding = audit.findings.find((f) => f.dimension === 'lexical-anchor')
    expect(anchorFinding?.tier).toBe('semantic-critical')
    expect(anchorFinding?.severity).toBe('critical')`,
`    expect(audit.passed).toBe(true)
    const anchorFinding = audit.findings.find((f) => f.dimension === 'lexical-anchor')
    expect(anchorFinding?.tier).toBe('semantic-critical')
    expect(anchorFinding?.severity).toBe('warning')`,
)

const regressionPath = 'packages/generator/src/finisher-relaxation-regression.test.ts'
await writeFile(regressionPath, `import { describe, expect, it } from 'vitest'\nimport { auditCurriculumPackage } from './audit-curriculum.js'\nimport { validPackage } from './curriculum-package.test.js'\nimport { upgradeV20ToV21 } from './upgrade-v20-to-v21.js'\nimport { upgradeV21ToV22 } from './upgrade-v21-to-v22.js'\n\nfunction canonicalPackage(): any {\n  const v20 = validPackage()\n  const v21 = upgradeV20ToV21(v20 as any)\n  const v22 = upgradeV21ToV22(v21)\n  delete (v22.studentLesson.reading as any).paragraphs\n  return v22\n}\n\ndescribe('Finisher heuristic gate relaxation', () => {\n  it('does not emit or block on fixed-list lexical-ceiling membership even with many repeated off-list words', () => {\n    const pkg = canonicalPackage()\n    pkg.studentLesson.practice[0].questions[0].prompt += ' guitarist encyclopedia photosynthesis cryptocurrency guitarist encyclopedia photosynthesis cryptocurrency astrophysics microbiome guitarist encyclopedia'\n\n    const audit = auditCurriculumPackage(pkg)\n    expect(audit.findings.some((finding) => finding.dimension === 'lexical-ceiling')).toBe(false)\n    expect(audit.passed).toBe(true)\n  })\n\n  it('keeps heuristic lexical anchor failures warning-only', () => {\n    const pkg = canonicalPackage()\n    pkg.studentLesson.vocabulary.push({\n      id: 'v-unanchored-natural-topic-word',\n      word: 'guitarist',\n      partOfSpeech: 'n.',\n      meaningZh: '吉他手',\n      pronunciationHint: null,\n      exampleEn: 'The guitarist practices every day.',\n      exampleZh: '這位吉他手每天練習。',\n      status: 'new',\n    })\n\n    const audit = auditCurriculumPackage(pkg)\n    const finding = audit.findings.find((item) => item.dimension === 'lexical-anchor')\n    expect(finding?.severity).toBe('warning')\n    expect(audit.passed).toBe(true)\n  })\n})\n`)

console.log('Applied brittle Finisher gate relaxation patch.')
