import type { CurriculumPackage } from './curriculum-package-schema.js'

export const BARE_BILINGUAL_LOOKUP_CODE = 'BARE_BILINGUAL_LOOKUP'
export const BARE_DICTIONARY_DEFINITION_CODE = 'BARE_DICTIONARY_DEFINITION'

export type LexicalRetrievalAuditReport = {
  passed: boolean
  findings: string[]
}

const CJK = '[\\u3400-\\u9fff]'
const BARE_CHINESE_TO_ENGLISH = [
  new RegExp(`^\\s*write\\s+(?:the\\s+)?english\\s+word\\s+for\\s*[「『\"']?${CJK}[^「」『』\"']*[」』\"']?\\s*[.!?。！？]?\\s*$`, 'iu'),
  new RegExp(`^\\s*translate\\s*[「『\"']?${CJK}[^「」『』\"']*[」』\"']?\\s*(?:in)?to\\s+english\\s*[.!?。！？]?\\s*$`, 'iu'),
]
const BARE_ENGLISH_TO_CHINESE = [
  /^\s*write\s+(?:the\s+)?chinese\s+meaning\s+of\s+["']?[a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){0,3}["']?\s*[.!?。！？]?\s*$/iu,
  /^\s*translate\s+["']?[a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){0,3}["']?\s+(?:in)?to\s+chinese\s*[.!?。！？]?\s*$/iu,
]
const ISOLATED_DICTIONARY_DEFINITION = /^\s*what\s+does\s+["']?[a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){0,3}["']?\s+mean\s*[?？]?\s*$/iu

export function classifyBareLexicalLookupPrompt(prompt: string): typeof BARE_BILINGUAL_LOOKUP_CODE | typeof BARE_DICTIONARY_DEFINITION_CODE | null {
  const normalized = prompt.trim()
  if ([...BARE_CHINESE_TO_ENGLISH, ...BARE_ENGLISH_TO_CHINESE].some((pattern) => pattern.test(normalized))) {
    return BARE_BILINGUAL_LOOKUP_CODE
  }
  return ISOLATED_DICTIONARY_DEFINITION.test(normalized) ? BARE_DICTIONARY_DEFINITION_CODE : null
}

function finding(code: string, questionId: string, stage: string): string {
  return `${code}:${questionId}:${stage}: student-facing assessment requires meaningful sentence or semantic context; intentionalRecall does not exempt bare translation or dictionary lookup`
}

/** Cross-stage objective gate for context-free lexical lookup. CAP transfer retains its separate inference audit. */
export function auditLexicalRetrievalQuality(pkg: CurriculumPackage): LexicalRetrievalAuditReport {
  const findings: string[] = []
  const entries = [
    ...pkg.studentLesson.practice.flatMap((section) => section.questions.map((question) => ({ stage: section.stage, question }))),
    ...pkg.studentLesson.homework.questions.map((question) => ({ stage: 'homework', question })),
  ]

  for (const { stage, question } of entries) {
    const code = classifyBareLexicalLookupPrompt(question.prompt)
    if (code) findings.push(finding(code, question.id, stage))
  }

  return { passed: findings.length === 0, findings }
}
