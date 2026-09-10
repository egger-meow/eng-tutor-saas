import type { CurriculumPackage } from '@paper-english/generator'
import { escapeHtml as h } from '../escape-html.js'

type InstructionItem = CurriculumPackage['studentLesson']['instruction'][number]
type LegacyInstructionItem = Extract<InstructionItem, { explanationZh: string }>
type InstructionBlock = Extract<InstructionItem, { blocks: unknown[] }>['blocks'][number]

function renderWorkedExample(example: LegacyInstructionItem['workedExamples'][number]): string {
  return `<article class="worked-card">
  <div class="worked-target">${h(example.example)}</div>
  <div class="worked-walkthrough"><strong>解析思考：</strong>${h(example.walkthroughZh)}</div>
</article>`
}

function renderCommonMistake(mistake: LegacyInstructionItem['commonMistakes'][number]): string {
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

function renderInstructionBlock(block: InstructionBlock): string {
  const title = block.titleZh ? `<h3>${h(block.titleZh)}</h3>` : ''
  let content: string
  switch (block.type) {
    case 'prose':
      content = `<p class="instruction-prose">${h(block.textZh)}</p>`
      break
    case 'bullets':
      content = `<ul class="instruction-bullets">${block.itemsZh.map((item) => `<li>${h(item)}</li>`).join('')}</ul>`
      break
    case 'steps':
      content = `<ol class="instruction-steps">${block.itemsZh.map((item) => `<li>${h(item)}</li>`).join('')}</ol>`
      break
    case 'comparison':
      content = `<table class="instruction-comparison"><thead><tr>${block.headers.map((header) => `<th scope="col">${h(header)}</th>`).join('')}</tr></thead>
<tbody>${block.rows.map((row) => `<tr>${row.map((cell) => `<td>${h(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>
${block.takeawayZh ? `<p class="instruction-takeaway">${h(block.takeawayZh)}</p>` : ''}`
      break
    case 'worked-example':
      content = renderWorkedExample(block)
      break
    case 'error-analysis':
      content = renderCommonMistake(block)
      break
  }
  return `<div class="instruction-block instruction-block-${block.type}">${title}${content}</div>`
}

function renderSingleInstruction(instruction: InstructionItem): string {
  if ('blocks' in instruction) {
    return `<section class="instruction-section instruction-structured">
  <h2>${h(instruction.titleZh)}</h2>
  ${instruction.blocks.map(renderInstructionBlock).join('\n')}
</section>`
  }

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
