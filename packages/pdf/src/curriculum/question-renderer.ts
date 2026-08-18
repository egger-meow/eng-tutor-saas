import type { CurriculumQuestion } from '@paper-english/generator'
import { escapeHtml as h } from '../escape-html.js'

const OPTION_PREFIX_REGEX = /^(?:\([A-Da-d]\)|\[[A-Da-d]\]|[A-Da-d][).:])\s*/u

function cleanOptionText(text: string): string {
  if (typeof text !== 'string') return text
  return text.replace(OPTION_PREFIX_REGEX, '').trim()
}

function renderOptions(options: readonly string[]): string {
  const cleaned = options.map(cleanOptionText)
  const isShort = cleaned.every((opt) => opt.length <= 28)
  const containerClass = isShort ? 'options-grid' : 'options-stack'

  const optionItems = cleaned.map((option, index) => {
    const marker = `(${String.fromCharCode(65 + index)})`
    return `<div class="option-item">
  <span class="option-marker">${marker}</span>
  <span class="option-text">${h(option)}</span>
</div>`
  }).join('\n')

  return `<div class="${containerClass}">
  ${optionItems}
</div>`
}

function renderWritingLines(count: number): string {
  if (count <= 0) return ''
  const lines = Array.from({ length: count }, () => '<div class="writing-line"></div>').join('\n')
  return `<div class="writing-lines-container">
  ${lines}
</div>`
}

export function renderQuestionCard(question: CurriculumQuestion): string {
  const optionsHtml = question.options && question.options.length > 0
    ? renderOptions(question.options)
    : ''
  const linesHtml = renderWritingLines(question.writingLines)

  return `<article class="question-card">
  <div class="question-header">
    <div class="question-qid">${h(question.id)}</div>
  </div>
  <p class="question-prompt">${h(question.prompt)}</p>
  ${optionsHtml}
  ${linesHtml}
</article>`
}
