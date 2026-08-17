import type { CurriculumPackage } from '@paper-english/generator'
import { escapeHtml as h } from '../escape-html.js'

type VocabularyItem = CurriculumPackage['studentLesson']['vocabulary'][number]

function formatPos(pos: string): string {
  const trimmed = pos.trim()
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) return trimmed
  return `(${trimmed})`
}

function renderVocabEntry(item: VocabularyItem): string {
  const posFormatted = formatPos(item.partOfSpeech)
  const exampleZhHtml = item.exampleZh ? `<div class="vocab-example-zh">${h(item.exampleZh)}</div>` : ''

  return `<article class="vocab-entry">
  <div class="vocab-header">
    <div class="vocab-word-group">
      <span class="vocab-word">${h(item.word)}</span>
      <span class="vocab-pos">${h(posFormatted)}</span>
    </div>
    <span class="vocab-meaning">${h(item.meaningZh)}</span>
  </div>
  <div class="vocab-example-en">${h(item.exampleEn)}</div>
  ${exampleZhHtml}
</article>`
}

export function renderVocabularySection(vocabulary?: readonly VocabularyItem[]): string {
  if (!vocabulary || vocabulary.length === 0) return ''

  const entriesHtml = vocabulary.map(renderVocabEntry).join('\n')

  return `<section class="vocab-section">
  <h2>核心單字</h2>
  <div class="vocab-grid">
    ${entriesHtml}
  </div>
</section>`
}
