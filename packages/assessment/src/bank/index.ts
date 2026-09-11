import type { AssessmentItem } from '../contracts.js'
import { VOCABULARY_ITEMS } from './vocabulary.js'
import { GRAMMAR_ITEMS } from './grammar.js'
import { READING_ITEMS } from './reading.js'

export * from './normalizer.js'
export * from './passages.js'
export * from './vocabulary.js'
export * from './grammar.js'
export * from './reading.js'
export * from './validator.js'

export const CANONICAL_ITEMS: readonly AssessmentItem[] = [
  ...VOCABULARY_ITEMS,
  ...GRAMMAR_ITEMS,
  ...READING_ITEMS,
]
