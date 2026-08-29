import { readFile, writeFile } from 'node:fs/promises'

async function replaceRequired(path, from, to) {
  const content = await readFile(path, 'utf8')
  if (!content.includes(from)) throw new Error(`Required patch anchor not found in ${path}`)
  await writeFile(path, content.replace(from, to))
}

const capPath = 'packages/generator/src/cap-precedent-audit.ts'
await replaceRequired(
  capPath,
`const PASSAGE_QUOTE_ATTRIBUTION = /(?:\\b(?:according to|from)\\s+(?:the\\s+)?(?:reading|passage|article|text)\\b|\\bin\\s+(?:the\\s+)?(?:reading|passage|article|text|sentence|paragraph(?:\\s+\\d+)?)\\b|\\b(?:the\\s+)?(?:reading|passage|article|text|writer|author)\\s+(?:says?|states?|writes?|notes?|explains?|mentions?)\\b)/iu

/**
 * Quote-verbatim checking is defense-in-depth for text attributed to the passage.
 * Constructed claims such as A student says, "..." are assessment stimuli,
 * not passage quotations; their correctness is governed by canonical evidence anchors.
 */
function quoteClaimsPassageSource(prompt: string, rawQuoted: string): boolean {
  const quoteIndex = prompt.indexOf(rawQuoted)
  if (quoteIndex < 0) return false
  const start = Math.max(0, quoteIndex - 180)
  const end = Math.min(prompt.length, quoteIndex + rawQuoted.length + 180)
  return PASSAGE_QUOTE_ATTRIBUTION.test(prompt.slice(start, end))
}`,
`const PASSAGE_QUOTE_ATTRIBUTION = /(?:\\b(?:according to|from)\\s+(?:the\\s+)?(?:reading|passage|article|text)\\b|\\bin\\s+(?:the\\s+)?(?:reading|passage|article|text|sentence|paragraph(?:\\s+\\d+)?)\\b|\\b(?:the\\s+)?(?:reading|passage|article|text|writer|author)\\s+(?:says?|states?|writes?|notes?|explains?|mentions?|includes?|uses?)\\b)/iu
const CONSTRUCTED_QUOTE_SPEAKER = /\\b(?:(?:a|one|another|your)\\s+)?(?:student|classmate|learner|reader|friend|person|someone|somebody)\\s+(?:says?|claims?|argues?|thinks?|suggests?|writes?)\\s*,?\\s*$/iu

/**
 * Quote-verbatim checking is defense-in-depth for text attributed to the passage.
 * A clearly constructed speaker quote takes precedence over nearby instructions such
 * as "According to the reading"; canonical evidence anchors still govern the answer.
 */
function quoteClaimsPassageSource(prompt: string, rawQuoted: string): boolean {
  const quoteIndex = prompt.indexOf(rawQuoted)
  if (quoteIndex < 0) return false
  const prefix = prompt.slice(Math.max(0, quoteIndex - 160), quoteIndex)
  if (CONSTRUCTED_QUOTE_SPEAKER.test(prefix)) return false
  const start = Math.max(0, quoteIndex - 180)
  const end = Math.min(prompt.length, quoteIndex + rawQuoted.length + 180)
  return PASSAGE_QUOTE_ATTRIBUTION.test(prompt.slice(start, end))
}`,
)

const testPath = 'packages/generator/src/finisher-calibration-regression.test.ts'
await replaceRequired(
  testPath,
`  it('still rejects a quote that the question explicitly attributes to the reading but that is absent from reading prose', () => {`,
`  it('keeps a constructed speaker quote exempt even when the follow-up asks students to use the reading', () => {
    const pkg = constructedClaimPackage() as any
    pkg.studentLesson.practice[0].questions[0].prompt =
      'A student says, "Every tight string must sound higher than every loose string." According to the reading, why is this claim too strong?'

    const capReport = auditCapPrecedentPackage(pkg, capRuntime)
    expect(capReport.findings.join('\\n')).not.toContain('CAP_QUOTE_EVIDENCE_MISMATCH:C3')

    const evidenceReport = auditReadingEvidenceBoundary(pkg)
    expect(evidenceReport.findings.join('\\n')).not.toContain('EVIDENCE_QUOTE_MISMATCH:C3')
    expect(evidenceReport.passed).toBe(true)
  })

  it('still rejects a quote that the question explicitly attributes to the reading but that is absent from reading prose', () => {`,
)

console.log('Applied constructed-quote attribution hardening.')
