import { readFile, writeFile } from 'node:fs/promises'

async function replaceRequired(path, replacements) {
  let content = await readFile(path, 'utf8')
  for (const [from, to] of replacements) {
    if (!content.includes(from)) {
      throw new Error(`Required patch anchor not found in ${path}: ${from.slice(0, 120)}`)
    }
    content = content.replace(from, to)
  }
  await writeFile(path, content)
}

const capPath = 'packages/generator/src/cap-precedent-audit.ts'
await replaceRequired(capPath, [
  [
`function studentAssessmentText(pkg: PackageLike, question: QuestionLike): string {
  const reading = (pkg.studentLesson.reading?.blocks ?? [])
    .flatMap((block) => Object.values(block).filter((value): value is string => typeof value === 'string'))
    .join(' ')
  return \`${'${reading}'} ${'${question.prompt}'} ${'${(question.options ?? []).join(\' \')}'}\`
}

/**
 * Deterministic production CAP quality floor.`,
`function studentAssessmentText(pkg: PackageLike, question: QuestionLike): string {
  const reading = (pkg.studentLesson.reading?.blocks ?? [])
    .flatMap((block) => Object.values(block).filter((value): value is string => typeof value === 'string'))
    .join(' ')
  return \`${'${reading}'} ${'${question.prompt}'} ${'${(question.options ?? []).join(\' \')}'}\`
}

const PASSAGE_QUOTE_ATTRIBUTION = /(?:\\b(?:according to|from)\\s+(?:the\\s+)?(?:reading|passage|article|text)\\b|\\bin\\s+(?:the\\s+)?(?:reading|passage|article|text|sentence|paragraph(?:\\s+\\d+)?)\\b|\\b(?:the\\s+)?(?:reading|passage|article|text|writer|author)\\s+(?:says?|states?|writes?|notes?|explains?|mentions?)\\b)/iu

/**
 * Quote-verbatim checking is defense-in-depth for text attributed to the passage.
 * Constructed claims (for example, `A student says, "..."`) are assessment stimuli,
 * not passage quotations; their correctness is governed by canonical evidence anchors.
 */
function quoteClaimsPassageSource(prompt: string, rawQuoted: string): boolean {
  const quoteIndex = prompt.indexOf(rawQuoted)
  if (quoteIndex < 0) return false
  const start = Math.max(0, quoteIndex - 180)
  const end = Math.min(prompt.length, quoteIndex + rawQuoted.length + 180)
  return PASSAGE_QUOTE_ATTRIBUTION.test(prompt.slice(start, end))
}

/**
 * Deterministic production CAP quality floor.`,
  ],
  [
`            if (!readingFullText.includes(normQuote)) {
              findings.push(
                \`CAP_QUOTE_EVIDENCE_MISMATCH:${'${question.id}'}: quoted prompt text "${'${cleanQuote}'}" does not exist in declared reading evidence\`,
              )
            }`,
`            if (!readingFullText.includes(normQuote) && quoteClaimsPassageSource(question.prompt, rawQuoted)) {
              findings.push(
                \`CAP_QUOTE_EVIDENCE_MISMATCH:${'${question.id}'}: quoted prompt text "${'${cleanQuote}'}" does not exist in declared reading evidence\`,
              )
            }`,
  ],
  [
`      } else if (plan) {
        if (plan.evidenceScope && plan.evidenceScope !== 'primary_reading') {
          findings.push(
            \`EVIDENCE_BOUNDARY_VIOLATION:${'${question.id}'}: reading-dependent question cannot claim evidence from "${'${plan.evidenceScope}'}"; evidenceScope must be primary_reading\`,
          )
        }

        if (!Array.isArray(plan.evidenceAnchors) || plan.evidenceAnchors.length === 0) {`,
`      } else if (plan) {
        if (isGoverned && (!plan.evidenceScope || plan.evidenceScope.trim().length === 0)) {
          findings.push(
            \`EVIDENCE_SCOPE_MISSING:${'${question.id}'}: governed reading-dependent question must explicitly declare evidenceScope as primary_reading\`,
          )
        } else if (plan.evidenceScope && plan.evidenceScope !== 'primary_reading') {
          findings.push(
            \`EVIDENCE_BOUNDARY_VIOLATION:${'${question.id}'}: reading-dependent question cannot claim evidence from "${'${plan.evidenceScope}'}"; evidenceScope must be primary_reading\`,
          )
        }

        if (!Array.isArray(plan.evidenceAnchors) || plan.evidenceAnchors.length === 0) {`,
  ],
  [
`          } else if (isReadingDependent && !isExplicitRecall) {
            findings.push(
              \`EVIDENCE_QUOTE_MISMATCH:${'${question.id}'}: quoted prompt text "${'${cleanQuote}'}" does not exist in primary reading prose\`,
            )
          }`,
`          } else if (isReadingDependent && !isExplicitRecall && quoteClaimsPassageSource(question.prompt, rawQuoted)) {
            findings.push(
              \`EVIDENCE_QUOTE_MISMATCH:${'${question.id}'}: quoted prompt text "${'${cleanQuote}'}" does not exist in primary reading prose\`,
            )
          }`,
  ],
])

const auditPath = 'packages/generator/src/audit-curriculum.ts'
await replaceRequired(auditPath, [
  [
`const IRREGULAR_INFLECTIONS: Readonly<Record<string, string[]>> = Object.entries(IRREGULAR_BASE_FORMS).reduce(
  (acc, [inflected, base]) => {
    acc[base] = acc[base] ? [...acc[base], inflected] : [inflected]
    return acc
  },
  {} as Record<string, string[]>,
)

function isApprovedWord(word: string, taughtWords: Set<string>): boolean {`,
`const IRREGULAR_INFLECTIONS: Readonly<Record<string, string[]>> = Object.entries(IRREGULAR_BASE_FORMS).reduce(
  (acc, [inflected, base]) => {
    acc[base] = acc[base] ? [...acc[base], inflected] : [inflected]
    return acc
  },
  {} as Record<string, string[]>,
)

function comparativeBaseCandidates(word: string, suffix: 'er' | 'est'): string[] {
  const stem = word.slice(0, -suffix.length)
  const candidates = new Set<string>([stem, \`${'${stem}'}e\`])

  // happier/happiest -> happy
  if (stem.endsWith('i') && stem.length > 1) candidates.add(\`${'${stem.slice(0, -1)}'}y\`)

  // thinner/thinnest -> thin; bigger/biggest -> big
  if (stem.length >= 2 && stem.at(-1) === stem.at(-2) && /[bcdfghjklmnpqrstvwxyz]$/u.test(stem)) {
    candidates.add(stem.slice(0, -1))
  }

  return [...candidates]
}

function isApprovedWord(word: string, taughtWords: Set<string>): boolean {`,
  ],
  [
`  if (w.endsWith('er') && (isBase(w.slice(0, -2)) || isBase(w.slice(0, -1)))) return true
  if (w.endsWith('est') && (isBase(w.slice(0, -3)) || isBase(w.slice(0, -2)))) return true`,
`  if (w.endsWith('er') && comparativeBaseCandidates(w, 'er').some(isBase)) return true
  if (w.endsWith('est') && comparativeBaseCandidates(w, 'est').some(isBase)) return true`,
  ],
  [
`  if (w.endsWith('y') && !/[aeiou]y$/u.test(w)) {
    variants.add(w.slice(0, -1) + 'ies')
    variants.add(w.slice(0, -1) + 'ied')`,
`  if (w.endsWith('y') && !/[aeiou]y$/u.test(w)) {
    variants.add(w.slice(0, -1) + 'ies')
    variants.add(w.slice(0, -1) + 'ied')
    variants.add(w.slice(0, -1) + 'ier')
    variants.add(w.slice(0, -1) + 'iest')`,
  ],
  [
`  } else if (w.endsWith('e')) {
    variants.add(w + 's')
    variants.add(w + 'd')
    variants.add(w.slice(0, -1) + 'ing')`,
`  } else if (w.endsWith('e')) {
    variants.add(w + 's')
    variants.add(w + 'd')
    variants.add(w.slice(0, -1) + 'ing')
    variants.add(w + 'r')
    variants.add(w + 'st')`,
  ],
  [
`      variants.add(w + lastChar + 'ed')
      variants.add(w + lastChar + 'ing')
      variants.add(w + lastChar + 'er')`,
`      variants.add(w + lastChar + 'ed')
      variants.add(w + lastChar + 'ing')
      variants.add(w + lastChar + 'er')
      variants.add(w + lastChar + 'est')`,
  ],
])

const regressionPath = 'packages/generator/src/finisher-calibration-regression.test.ts'
await replaceRequired(regressionPath, [
  [` The thin string is easy to see.`, ` The thin one is easy to see.`],
  [`exampleEn: 'The thin string is easy to see.'`, `exampleEn: 'The thin one is easy to see.'`],
  [`prompt = 'The thinner string is thinner.'`, `prompt = 'The thinner one is thinner.'`],
])

console.log('Applied Finisher calibration patch.')
