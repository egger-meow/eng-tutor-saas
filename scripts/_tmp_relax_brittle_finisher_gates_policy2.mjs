import { readFile, writeFile } from 'node:fs/promises'

async function replaceRequired(path, from, to) {
  let content = await readFile(path, 'utf8')
  if (!content.includes(from)) throw new Error(`Required patch anchor not found in ${path}: ${from.slice(0, 140)}`)
  content = content.replace(from, to)
  await writeFile(path, content)
}

async function replaceRegexRequired(path, regex, to) {
  let content = await readFile(path, 'utf8')
  if (!regex.test(content)) throw new Error(`Required regex patch anchor not found in ${path}: ${regex}`)
  regex.lastIndex = 0
  content = content.replace(regex, to)
  await writeFile(path, content)
}

const auditPath = 'packages/generator/src/audit-curriculum.ts'
await replaceRequired(
  auditPath,
`  const warningOnlyHeuristicDimensions = new Set([
    'cognitive-load',
    'lexical-unit-mix',
    'lexical-anchor',
    'mcq-position-leakage',
  ])`,
`  const warningOnlyHeuristicDimensions = new Set([
    'cognitive-load',
    'lexical-unit-mix',
    'lexical-anchor',
    'mcq-position-leakage',
    'grounding-substance',
    'grounding-coverage',
    'workload-calibration',
    'parent-personalization',
  ])`,
)

const specPath = 'docs/SPEC.md'
await replaceRequired(
  specPath,
`30. Deterministic quality heuristics that approximate style or difficulty through finite lists, morphology rules, character counts, answer-position percentages, vocabulary-card counts, or phrase quotas are warning-only unless they establish an objective integrity violation.`,
`30. Deterministic quality heuristics that approximate style or difficulty through finite lists, morphology rules, character counts, answer-position percentages, vocabulary-card counts, phrase quotas, grounding-density counts, workload percentage bands, or forbidden-jargon word lists are warning-only unless they establish an objective integrity violation.`,
)

const auditTest = 'packages/generator/src/audit-curriculum.test.ts'
await replaceRegexRequired(
  auditTest,
  /  it\('enforces lexical anchor: rejects package when core vocabulary is absent from reading passage',[\s\S]*?\n  \}\)\n\n  it\('enforces comprehensive lexical ceiling:/u,
`  it('reports an unanchored core vocabulary card as warning-only telemetry', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.vocabulary.push({
      id: 'vocab-unrelated',
      word: 'astronomy',
      partOfSpeech: 'n.',
      meaningZh: '天文學',
      pronunciationHint: null,
      exampleEn: 'Astronomy is the study of stars.',
      exampleZh: '天文學是研究星星的科學。',
      status: 'new',
    })

    const report = auditCurriculumPackage(pkg)
    const anchorFinding = report.findings.find((f) => f.dimension === 'lexical-anchor')
    expect(anchorFinding).toBeDefined()
    expect(anchorFinding?.severity).toBe('warning')
    expect(anchorFinding?.message).toContain('astronomy')
    expect(report.passed).toBe(true)
  })

  it('does not use fixed-list lexical ceiling membership as a publication gate', () => {`,
)
await replaceRegexRequired(
  auditTest,
  /  it\('does not use fixed-list lexical ceiling membership as a publication gate',[\s\S]*?\n  \}\)\n\n  it\('flags genre-block mismatch/u,
`  it('does not use fixed-list lexical ceiling membership as a publication gate', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.practice[0].questions[0].prompt = 'Does the ephemeral juxtaposition cause ubiquitous dichotomy in empirical methodology?'
    pkg.studentLesson.practice[0].questions[0].options = [
      'The transcendent epistemology obfuscates the paradigm.',
      'Normal robot operation continues.',
      'None of the above.',
      'All of the above.',
    ]

    const report = auditCurriculumPackage(pkg)
    expect(report.findings.find((f) => f.dimension === 'lexical-ceiling')).toBeUndefined()
    expect(report.passed).toBe(true)
  })

  it('flags genre-block mismatch`,
)
await replaceRequired(
  auditTest,
`  it('enforces token-boundary morphology: car != carry (does not match substring in carry)', () => {`,
`  it('keeps lexical-anchor morphology mismatches warning-only rather than blocking publication', () => {`,
)
await replaceRequired(
  auditTest,
`    expect(anchorFinding?.severity).toBe('critical')
    expect(report.passed).toBe(false)`,
`    expect(anchorFinding?.severity).toBe('warning')
    expect(report.passed).toBe(true)`,
)
await replaceRequired(
  auditTest,
`  it('rejects more than three phrase or collocation cards', () => {`,
`  it('treats more than three phrase or collocation cards as warning-only telemetry', () => {`,
)
await replaceRequired(
  auditTest,
`    expect(finding?.severity).toBe('critical')
    expect(report.passed).toBe(false)`,
`    expect(finding?.severity).toBe('warning')
    expect(report.passed).toBe(true)`,
)
await replaceRequired(
  auditTest,
`  it('flags isolated advanced non-allowlist words as warning telemetry without hard rejection', () => {`,
`  it('does not emit fixed-list lexical findings for isolated off-list words', () => {`,
)
await replaceRequired(
  auditTest,
`    const lexicalFinding = report.findings.find((f) => f.dimension === 'lexical-ceiling')
    expect(lexicalFinding).toBeDefined()
    expect(lexicalFinding?.severity).toBe('warning')
    expect(report.passed).toBe(true)`,
`    const lexicalFinding = report.findings.find((f) => f.dimension === 'lexical-ceiling')
    expect(lexicalFinding).toBeUndefined()
    expect(report.passed).toBe(true)`,
)
await replaceRegexRequired(
  auditTest,
  /  it\('requires explicit substantive evidence for a workload exception',[\s\S]*?\n  \}\)\n\}\)/u,
`  it('requires non-empty workload exception evidence without an arbitrary character minimum', () => {
    const pkg = canonicalPackage()
    const targetMinutes = Math.round(computeDeterministicPlanMinutes(pkg) / 0.8)
    pkg.qualityEvidence.criticalChecks.push({
      id: 'workload-budget-exception',
      passed: true,
      evidence: 'Temporary exception.',
    })

    const report = auditCurriculumPackage(pkg, targetMinutes)
    expect(report.findings.some((finding) => finding.message.includes('requires at least 80 characters'))).toBe(false)
    expect(report.passed).toBe(true)

    pkg.qualityEvidence.criticalChecks.at(-1)!.evidence = '   '
    const blankEvidence = auditCurriculumPackage(pkg, targetMinutes)
    expect(blankEvidence.findings.some((finding) => finding.dimension === 'workload-calibration')).toBe(true)
    expect(blankEvidence.findings.every((finding) => finding.dimension !== 'workload-calibration' || finding.severity === 'warning')).toBe(true)

    const outsideHardBound = auditCurriculumPackage(pkg, 600)
    expect(outsideHardBound.findings.some((finding) => finding.dimension === 'workload-calibration')).toBe(true)
    expect(outsideHardBound.findings.every((finding) => finding.dimension !== 'workload-calibration' || finding.severity === 'warning')).toBe(true)
  })
})`,
)

await replaceRequired(auditTest, `describe('MCQ answer-position leakage & distribution gate', () => {`, `describe('MCQ answer-position leakage telemetry', () => {`)
await replaceRequired(auditTest, `  it('rejects all-A concentrated pattern (AAAAAAAAAAAA)', () => {`, `  it('reports all-A concentration without blocking publication', () => {`)
await replaceRequired(auditTest, `    expect(report.passed).toBe(false)`, `    expect(report.passed).toBe(true)`)
await replaceRequired(auditTest, `    expect(leakageFindings.some((f) => f.severity === 'critical' && f.message.includes('run >= 4'))).toBe(true)`, `    expect(leakageFindings.some((f) => f.severity === 'warning' && f.message.includes('run >= 4'))).toBe(true)`)
await replaceRequired(auditTest, `    expect(leakageFindings.some((f) => f.severity === 'critical' && f.message.includes('嚴重答案位置集中洩漏'))).toBe(true)`, `    expect(leakageFindings.some((f) => f.severity === 'warning' && f.message.includes('嚴重答案位置集中洩漏'))).toBe(true)`)
await replaceRequired(auditTest, `  it('rejects strongly concentrated patterns exceeding 60% single-position concentration', () => {`, `  it('reports strongly concentrated patterns without blocking publication', () => {`)
await replaceRequired(auditTest, `    expect(report.passed).toBe(false)`, `    expect(report.passed).toBe(true)`)
await replaceRequired(auditTest, `    expect(leakageFindings.some((f) => f.severity === 'critical' && f.message.includes('過度集中於位置 "A"'))).toBe(true)`, `    expect(leakageFindings.some((f) => f.severity === 'warning' && f.message.includes('過度集中於位置 "A"'))).toBe(true)`)
await replaceRequired(auditTest, `  it('rejects excessively long identical-position runs (run >= 4)', () => {`, `  it('reports long identical-position runs without blocking publication', () => {`)
await replaceRequired(auditTest, `    expect(report.passed).toBe(false)`, `    expect(report.passed).toBe(true)`)
await replaceRequired(auditTest, `    expect(leakageFindings.some((f) => f.severity === 'critical' && f.message.includes('run >= 4'))).toBe(true)`, `    expect(leakageFindings.some((f) => f.severity === 'warning' && f.message.includes('run >= 4'))).toBe(true)`)
await replaceRequired(auditTest, `    // Initial audit fails
    expect(auditCurriculumPackage(pkg).passed).toBe(false)`, `    // Initial audit is publishable; balancing remains an optional deterministic cleanup.
    expect(auditCurriculumPackage(pkg).passed).toBe(true)`)

const productionRegression = 'packages/generator/src/production-failure-regression.test.ts'
await replaceRegexRequired(
  productionRegression,
  /  it\('dedupes lexical-ceiling findings case-insensitively and flags repeated unapproved words critically',[\s\S]*?\n  \}\)/u,
`  it('does not emit fixed-list lexical-ceiling findings for repeated off-list words', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.practice[0].questions[0].prompt = 'Meticulous meticulous METICULOUS MeTiCuLoUs'

    expect(lexicalFinding(pkg)).toBeUndefined()
    expect(auditCurriculumPackage(pkg).passed).toBe(true)
  })`,
)
await replaceRegexRequired(
  productionRegression,
  /  it\('rejects untaught above-ceiling word when used as direct context-clue target',[\s\S]*?\n  \}\)/u,
`  it('does not use fixed-list membership to reject a context-clue target', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.practice[0].questions[0].itemType = 'context-clue'
    pkg.studentLesson.practice[0].questions[0].prompt = 'In paragraph 2, what is the meaning of "epistemology"?'
    pkg.studentLesson.practice[0].questions[0].options = ['Theory of knowledge', 'Tool', 'Machine', 'Camera']

    const audit = auditCurriculumPackage(pkg)
    expect(audit.findings.find((f) => f.dimension === 'lexical-ceiling')).toBeUndefined()
  })`,
)
await replaceRegexRequired(
  productionRegression,
  /  it\('rejects unanchored new vocabulary card critically',[\s\S]*?\n  \}\)/u,
`  it('treats an unanchored new vocabulary card as warning-only telemetry', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.vocabulary.push({
      id: 'v-unanchored-new',
      word: 'astronomy',
      partOfSpeech: 'n.',
      meaningZh: '天文學',
      pronunciationHint: null,
      exampleEn: 'He studies astronomy.',
      exampleZh: '他研究天文學。',
      status: 'new',
    })

    const audit = auditCurriculumPackage(pkg)
    expect(audit.passed).toBe(true)
    const anchorFinding = audit.findings.find((f) => f.dimension === 'lexical-anchor')
    expect(anchorFinding?.severity).toBe('warning')
  })`,
)

console.log('Aligned legacy hard-gate tests with semantic-first Finisher policy.')
