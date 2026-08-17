import type { CurriculumPackage } from '@paper-english/generator'
import { escapeHtml as h } from '../escape-html.js'

type InstructionItem = CurriculumPackage['studentLesson']['instruction'][number]

function renderWorkedExample(example: InstructionItem['workedExamples'][number]): string {
  return `<article class="worked-card">
  <div class="worked-target">${h(example.example)}</div>
  <div class="worked-walkthrough"><strong>解析思考：</strong>${h(example.walkthroughZh)}</div>
</article>`
}

function renderCommonMistake(mistake: InstructionItem['commonMistakes'][number]): string {
  return `<article class="mistake-card">
  <div class="mistake-comparison">
    <div class="mistake-wrong-row">
      <span class="mistake-tag-wrong">✗ 錯誤</span>
      <span class="mistake-wrong-text">${h(mistake.wrong)}</span>
    </div>
    <div class="mistake-correct-row">
      <span class="mistake-tag-correct">✓ 正確</span>
      <span class="mistake-correct-text">${h(mistake.corrected)}</span>
    </div>
  </div>
  <div class="mistake-why"><strong>💡 為什麼：</strong>${h(mistake.whyZh)}</div>
</article>`
}

function renderSingleInstruction(instruction: InstructionItem): string {
  const patternsHtml = instruction.patterns.map((pat) => `
    <div class="pattern-box">
      <div class="pattern-label">核心句型結構</div>
      <div class="pattern-formula">${h(pat)}</div>
    </div>
  `).join('\n')

  const workedHtml = instruction.workedExamples.length > 0
    ? `<h3>完整示範</h3>
       <div class="worked-examples-group">
         ${instruction.workedExamples.map(renderWorkedExample).join('\n')}
       </div>`
    : ''

  const mistakesHtml = instruction.commonMistakes.length > 0
    ? `<h3>容易踩到的盲點與陷阱</h3>
       <div class="mistakes-group">
         ${instruction.commonMistakes.map(renderCommonMistake).join('\n')}
       </div>`
    : ''

  return `<section class="instruction-section">
  <h2>觀念解說：${h(instruction.titleZh)}</h2>
  <div class="concept-explanation">${h(instruction.explanationZh)}</div>
  ${patternsHtml}
  ${workedHtml}
  ${mistakesHtml}
</section>`
}

export function renderInstructionSection(instructions?: readonly InstructionItem[]): string {
  if (!instructions || instructions.length === 0) return ''
  return instructions.map(renderSingleInstruction).join('\n')
}
