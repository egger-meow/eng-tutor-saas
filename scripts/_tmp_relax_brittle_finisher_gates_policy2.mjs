import { readFile, writeFile } from 'node:fs/promises'

async function edit(path, transform) {
  const before = await readFile(path, 'utf8')
  const after = transform(before)
  if (after === before) throw new Error(`No change applied to ${path}`)
  await writeFile(path, after)
}

function replaceRequired(content, from, to, label) {
  if (!content.includes(from)) throw new Error(`Missing patch anchor: ${label}`)
  return content.replace(from, to)
}

function replaceItBlock(content, title, newBlock) {
  const startMarker = `  it('${title}', () => {`
  const start = content.indexOf(startMarker)
  if (start < 0) throw new Error(`Missing test block: ${title}`)
  const nextIt = content.indexOf('\n  it(', start + startMarker.length)
  const nextEach = content.indexOf('\n  it.each(', start + startMarker.length)
  const candidates = [nextIt, nextEach].filter((v) => v >= 0)
  const end = candidates.length > 0 ? Math.min(...candidates) : content.indexOf('\n})', start + startMarker.length)
  if (end < 0) throw new Error(`Cannot find end of test block: ${title}`)
  return content.slice(0, start) + newBlock + content.slice(end)
}

await edit('packages/generator/src/audit-curriculum.ts', (content) => replaceRequired(
  content,
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
  'warning-only heuristic dimensions',
))

await edit('docs/SPEC.md', (content) => replaceRequired(
  content,
`30. Deterministic quality heuristics that approximate style or difficulty through finite lists, morphology rules, character counts, answer-position percentages, vocabulary-card counts, or phrase quotas are warning-only unless they establish an objective integrity violation.`,
`30. Deterministic quality heuristics that approximate style or difficulty through finite lists, morphology rules, character counts, answer-position percentages, vocabulary-card counts, phrase quotas, grounding-density counts, workload percentage bands, or forbidden-jargon word lists are warning-only unless they establish an objective integrity violation.`,
  'SPEC heuristic policy',
))

await edit('packages/generator/src/curriculum-package.test.ts', (content) => {
  content = replaceRequired(
    content,
`  it.each([
    ['production packet', 'Week 1 無前一份 production packet 可比較；本週建立閱讀取證與因果產出的可觀察基線'],
    ['observable baseline', '本週建立可量測基準：同一目標跨 guided、independent、CAP 留下提示前後證據。'],
    ['silence-mastery trope', '本輪為 Week 1 且 feedbackMissing=true；沒有把沉默視為掌握，採保守校準。'],
  ])('rejects semantic jargon in parentSummary.personalizationZh: %s', (_, jargonSentence) => {
    const value = validPackage()
    value.parentSummary.personalizationZh = [jargonSentence]
    const audit = auditCurriculumPackage(value)
    expect(audit.passed).toBe(false)
    const semanticFinding = audit.findings.find((f) => f.tier === 'semantic-critical' && f.dimension === 'parent-personalization')
    expect(semanticFinding).toBeDefined()
  })`,
`  it.each([
    ['production packet', 'Week 1 無前一份 production packet 可比較；本週建立閱讀取證與因果產出的可觀察基線'],
    ['observable baseline', '本週建立可量測基準：同一目標跨 guided、independent、CAP 留下提示前後證據。'],
    ['silence-mastery trope', '本輪為 Week 1 且 feedbackMissing=true；沒有把沉默視為掌握，採保守校準。'],
  ])('reports forbidden-jargon word-list matches as warning-only telemetry: %s', (_, jargonSentence) => {
    const value = validPackage()
    value.parentSummary.personalizationZh = [jargonSentence]
    const audit = auditCurriculumPackage(value)
    expect(audit.passed).toBe(true)
    const semanticFinding = audit.findings.find((f) => f.tier === 'semantic-critical' && f.dimension === 'parent-personalization')
    expect(semanticFinding).toBeDefined()
    expect(semanticFinding?.severity).toBe('warning')
  })`,
    'parent jargon matrix',
  )
  content = replaceItBlock(content, 'rejects generic one-fact theming at the semantic quality gate', `  it('reports low grounding density as warning-only telemetry', () => {
    const value = groundedPackage('basketball')
    value.grounding.facts = value.grounding.facts.slice(0, 1)
    value.grounding.claims = value.grounding.claims.slice(0, 1)
    const report = auditCurriculumPackage(value)
    expect(report.passed).toBe(true)
    expect(report.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ dimension: 'grounding-substance', severity: 'warning' }),
      expect.objectContaining({ dimension: 'grounding-coverage', severity: 'warning' }),
    ]))
  })`)
  content = replaceItBlock(content, 'does not allow an article to self-declare a density exception', `  it('keeps article density exceptions advisory instead of publication-blocking', () => {
    const value = groundedPackage('anime')
    value.grounding.facts = value.grounding.facts.slice(0, 2)
    value.grounding.claims = value.grounding.claims.slice(0, 2)
    value.qualityEvidence.criticalChecks.push({
      id: 'grounding-density-exception',
      passed: true,
      evidence: 'This explanation records why the author used lower factual density for this article.',
    })
    const report = auditCurriculumPackage(value)
    expect(report.passed).toBe(true)
    expect(report.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ dimension: 'grounding-substance', severity: 'warning' }),
    ]))
  })`)
  return content
})

await edit('packages/generator/src/audit-curriculum.test.ts', (content) => {
  content = replaceItBlock(content, 'enforces lexical anchor: rejects package when core vocabulary is absent from reading passage', `  it('reports an unanchored core vocabulary card as warning-only telemetry', () => {
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
  })`)
  content = replaceItBlock(content, 'enforces comprehensive lexical ceiling: detects untaught high-difficulty words across options and practice', `  it('does not use fixed-list lexical ceiling membership as a publication gate', () => {
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
  })`)
  content = replaceItBlock(content, 'enforces token-boundary morphology: car != carry (does not match substring in carry)', `  it('keeps lexical-anchor morphology mismatches warning-only rather than blocking publication', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.reading.blocks = [
      { type: 'paragraph', text: 'Mia and Alex carry the heavy robot parts across the workshop to the main workbench. They are carrying extra batteries and testing instruments carefully before the regional robotics tournament begins tomorrow morning.' },
      { type: 'paragraph', text: 'The entire team works together after school every Tuesday in Taipei to calibrate each optical sensor and inspect the aluminum chassis. When unexpected circuit problems happen during testing, they record the exact error code, discuss possible solutions calmly with their teacher, and test each component step by step. Everyone agrees that careful preparation and good teamwork help them achieve excellent results in the competition. They check every screw and verify all electrical connections to ensure complete safety. By keeping detailed logs and testing repeatedly, the students build strong confidence for the big tournament match.' },
    ]
    pkg.studentLesson.reading.wordCount = 135
    pkg.studentLesson.vocabulary = [
      { id: 'v-car', word: 'car', partOfSpeech: 'n.', meaningZh: '車子', pronunciationHint: null, exampleEn: 'He drives a car.', exampleZh: '他開車。', status: 'new' },
      ...['workshop', 'team', 'sensor', 'error', 'prepare', 'result', 'tournament'].map((word, i) => ({ id: \`v-\${word}\`, word, partOfSpeech: 'n.', meaningZh: \`意思 \${i}\`, pronunciationHint: null, exampleEn: \`Example for \${word}.\`, exampleZh: \`例句 \${i}。\`, status: 'new' as const })),
    ]

    const report = auditCurriculumPackage(pkg)
    const anchorFinding = report.findings.find((f) => f.dimension === 'lexical-anchor' && f.message.includes('car'))
    expect(anchorFinding).toBeDefined()
    expect(anchorFinding?.severity).toBe('warning')
    expect(report.passed).toBe(true)
  })`)
  content = replaceItBlock(content, 'rejects more than three phrase or collocation cards', `  it('treats more than three phrase or collocation cards as warning-only telemetry', () => {
    const pkg = canonicalPackage()
    const phrases = ['work together', 'after school', 'take notes', 'find out']
    phrases.forEach((word, index) => {
      pkg.studentLesson.vocabulary[index] = { ...pkg.studentLesson.vocabulary[index], word, partOfSpeech: 'phr.' }
    })

    const report = auditCurriculumPackage(pkg)
    const finding = report.findings.find((f) => f.dimension === 'lexical-unit-mix')
    expect(finding?.severity).toBe('warning')
    expect(report.passed).toBe(true)
  })`)
  content = replaceItBlock(content, 'flags isolated advanced non-allowlist words as warning telemetry without hard rejection', `  it('does not emit fixed-list lexical findings for isolated off-list words', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.reading.blocks[0] = { type: 'paragraph', text: 'A quantum device helps our daily robot testing procedures in the workshop today.' }
    const report = auditCurriculumPackage(pkg)
    expect(report.findings.find((f) => f.dimension === 'lexical-ceiling')).toBeUndefined()
    expect(report.passed).toBe(true)
  })`)
  content = replaceItBlock(content, 'verifies workload calibration against the inclusive 85%-115% band', `  it('reports workload budget percentage deviations as warning-only telemetry', () => {
    const pkg = canonicalPackage()

    const reportMatched = auditCurriculumPackage(pkg, 80)
    expect(reportMatched.findings.find((f) => f.dimension === 'workload-calibration')).toBeUndefined()

    const reportUnder = auditCurriculumPackage(pkg, 100)
    const underFinding = reportUnder.findings.find((f) => f.dimension === 'workload-calibration')
    expect(underFinding).toBeDefined()
    expect(underFinding?.severity).toBe('warning')
    expect(underFinding?.message).toContain('BUDGET_UNDERFILLED')
    expect(reportUnder.passed).toBe(true)

    const reportOver = auditCurriculumPackage(pkg, { declaredWeeklyMinutes: 50 })
    const overFinding = reportOver.findings.find((f) => f.dimension === 'workload-calibration')
    expect(overFinding).toBeDefined()
    expect(overFinding?.severity).toBe('warning')
    expect(overFinding?.message).toContain('BUDGET_OVERFILLED')
    expect(reportOver.passed).toBe(true)
  })`)
  content = replaceItBlock(content, 'requires explicit substantive evidence for a workload exception', `  it('accepts short non-empty workload exception evidence without an arbitrary character minimum', () => {
    const pkg = canonicalPackage()
    const targetMinutes = Math.round(computeDeterministicPlanMinutes(pkg) / 0.8)
    pkg.qualityEvidence.criticalChecks.push({ id: 'workload-budget-exception', passed: true, evidence: 'Temporary exception.' })

    const report = auditCurriculumPackage(pkg, targetMinutes)
    expect(report.findings.some((finding) => finding.message.includes('requires at least 80 characters'))).toBe(false)
    expect(report.passed).toBe(true)

    const outsideBand = auditCurriculumPackage(pkg, 600)
    const finding = outsideBand.findings.find((item) => item.dimension === 'workload-calibration')
    expect(finding).toBeDefined()
    expect(finding?.severity).toBe('warning')
    expect(outsideBand.passed).toBe(true)
  })`)
  content = replaceItBlock(content, 'rejects all-A concentrated pattern (AAAAAAAAAAAA)', `  it('reports all-A concentration without blocking publication', () => {
    const pkg = make12McqPackage(Array.from({ length: 12 }, () => 'A'))
    const report = auditCurriculumPackage(pkg)
    expect(report.passed).toBe(true)
    const findings = report.findings.filter((f) => f.dimension === 'mcq-position-leakage')
    expect(findings.some((f) => f.severity === 'warning' && f.message.includes('run >= 4'))).toBe(true)
    expect(findings.some((f) => f.severity === 'warning' && f.message.includes('嚴重答案位置集中洩漏'))).toBe(true)
  })`)
  content = replaceItBlock(content, 'rejects strongly concentrated patterns exceeding 60% single-position concentration', `  it('reports strongly concentrated patterns without blocking publication', () => {
    const concentrated = ['A', 'A', 'A', 'B', 'A', 'A', 'A', 'C', 'A', 'A', 'A', 'D']
    const report = auditCurriculumPackage(make12McqPackage(concentrated))
    expect(report.passed).toBe(true)
    const findings = report.findings.filter((f) => f.dimension === 'mcq-position-leakage')
    expect(findings.some((f) => f.severity === 'warning' && f.message.includes('過度集中於位置 "A"'))).toBe(true)
  })`)
  content = replaceItBlock(content, 'rejects excessively long identical-position runs (run >= 4)', `  it('reports long identical-position runs without blocking publication', () => {
    const longRun = ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'C', 'D', 'D']
    const report = auditCurriculumPackage(make12McqPackage(longRun))
    expect(report.passed).toBe(true)
    const findings = report.findings.filter((f) => f.dimension === 'mcq-position-leakage')
    expect(findings.some((f) => f.severity === 'warning' && f.message.includes('run >= 4'))).toBe(true)
  })`)
  content = replaceItBlock(content, 'balances an all-A package using balanceCurriculumMcqPositions so it passes quality audit', `  it('can still balance an all-A package as optional deterministic cleanup', () => {
    const pkg = make12McqPackage(Array.from({ length: 12 }, () => 'A'))
    expect(auditCurriculumPackage(pkg).passed).toBe(true)

    const balanced = balanceCurriculumMcqPositions(pkg)
    const report = auditCurriculumPackage(balanced)
    expect(report.findings.filter((f) => f.dimension === 'mcq-position-leakage')).toEqual([])
    expect(report.passed).toBe(true)
    expect(balanced.answers.map((a: any) => a.answer[0])).toEqual(['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'B', 'C', 'D'])
  })`)
  content = content.replace(`describe('MCQ answer-position leakage & distribution gate', () => {`, `describe('MCQ answer-position leakage telemetry', () => {`)
  return content
})

await edit('packages/generator/src/production-failure-regression.test.ts', (content) => {
  content = replaceItBlock(content, 'dedupes lexical-ceiling findings case-insensitively and flags repeated unapproved words critically', `  it('does not emit fixed-list lexical-ceiling findings for repeated off-list words', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.practice[0].questions[0].prompt = 'Meticulous meticulous METICULOUS MeTiCuLoUs'
    expect(lexicalFinding(pkg)).toBeUndefined()
    expect(auditCurriculumPackage(pkg).passed).toBe(true)
  })`)
  content = replaceItBlock(content, 'rejects untaught above-ceiling word when used as direct context-clue target', `  it('does not use fixed-list membership to reject a context-clue target', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.practice[0].questions[0].itemType = 'context-clue'
    pkg.studentLesson.practice[0].questions[0].prompt = 'In paragraph 2, what is the meaning of "epistemology"?'
    pkg.studentLesson.practice[0].questions[0].options = ['Theory of knowledge', 'Tool', 'Machine', 'Camera']
    expect(auditCurriculumPackage(pkg).findings.find((f) => f.dimension === 'lexical-ceiling')).toBeUndefined()
  })`)
  content = replaceItBlock(content, 'rejects unanchored new vocabulary card critically', `  it('treats an unanchored new vocabulary card as warning-only telemetry', () => {
    const pkg = canonicalPackage()
    pkg.studentLesson.vocabulary.push({ id: 'v-unanchored-new', word: 'astronomy', partOfSpeech: 'n.', meaningZh: '天文學', pronunciationHint: null, exampleEn: 'He studies astronomy.', exampleZh: '他研究天文學。', status: 'new' })
    const audit = auditCurriculumPackage(pkg)
    expect(audit.passed).toBe(true)
    expect(audit.findings.find((f) => f.dimension === 'lexical-anchor')?.severity).toBe('warning')
  })`)
  return content
})

await edit('packages/generator/src/finisher-tiers.test.ts', (content) => replaceItBlock(
  content,
  'Tier 3 (SEMANTIC CRITICAL): fails closed on forbidden internal developer jargon',
`  it('Tier 1 (WARNING TELEMETRY): forbidden-jargon word-list matches do not independently block publication', () => {
    const mutated = structuredClone(samplePackage)
    mutated.parentSummary.personalizationZh = ['本週建立 observable baseline 來確認能力。']

    const audit = auditCurriculumPackage(mutated)
    expect(audit.passed).toBe(true)
    const jargonFinding = audit.findings.find((f) => f.tier === 'semantic-critical' && f.dimension === 'parent-personalization')
    expect(jargonFinding).toBeDefined()
    expect(jargonFinding?.severity).toBe('warning')
  })`,
))

console.log('Aligned legacy hard-gate tests with semantic-first Finisher policy.')
