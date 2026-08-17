import type { ReadingBlock } from '@paper-english/generator'
import { escapeHtml as h } from '../escape-html.js'

export type ReadingInput = {
  title: string
  contextZh: string
  genre?: string
  blocks?: ReadingBlock[]
  paragraphs?: string[]
  wordCount?: number
  readingTipsZh: readonly string[]
  sourceNote?: string | null
}

function renderReadingBlocks(blocks: readonly ReadingBlock[]): string {
  // Check if blocks are entirely or predominantly schedule rows or dialogue turns to group them nicely
  const hasScheduleRows = blocks.some((b) => b.type === 'schedule-row')
  const hasDialogue = blocks.some((b) => b.type === 'dialogue')

  if (hasScheduleRows && blocks.every((b) => b.type === 'schedule-row')) {
    const rows = blocks.map((block) => {
      if (block.type !== 'schedule-row') return ''
      return `<tr>
  <td class="schedule-time">${h(block.timeOrStep)}</td>
  <td class="schedule-event">${h(block.event)}</td>
  <td class="schedule-detail">${block.detail ? h(block.detail) : '<span class="muted">-</span>'}</td>
</tr>`
    }).join('\n')

    return `<div class="schedule-table-wrap">
  <table class="schedule-table">
    <thead>
      <tr>
        <th style="width: 25%;">時間 / 步驟</th>
        <th style="width: 35%;">活動 / 內容</th>
        <th style="width: 40%;">說明 / 細節</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</div>`
  }

  if (hasDialogue && blocks.every((b) => b.type === 'dialogue')) {
    const turns = blocks.map((block) => {
      if (block.type !== 'dialogue') return ''
      return `<div class="dialogue-turn">
  <div class="dialogue-speaker">${h(block.speaker)}:</div>
  <div class="dialogue-text">${h(block.text)}</div>
</div>`
    }).join('\n')

    return `<div class="dialogue-container">${turns}</div>`
  }

  // Mixed or general blocks
  return blocks.map((block) => {
    switch (block.type) {
      case 'paragraph':
        return `<p class="reading-paragraph">${h(block.text)}</p>`
      case 'dialogue':
        return `<div class="dialogue-turn">
  <div class="dialogue-speaker">${h(block.speaker)}:</div>
  <div class="dialogue-text">${h(block.text)}</div>
</div>`
      case 'notice':
        return `<div class="notice-card">
  ${block.heading ? `<div class="notice-heading">${h(block.heading)}</div>` : ''}
  <div class="notice-body">${h(block.text)}</div>
</div>`
      case 'schedule-row':
        return `<div class="schedule-table-wrap">
  <table class="schedule-table">
    <tbody>
      <tr>
        <td class="schedule-time">${h(block.timeOrStep)}</td>
        <td class="schedule-event">${h(block.event)}</td>
        <td class="schedule-detail">${block.detail ? h(block.detail) : '<span class="muted">-</span>'}</td>
      </tr>
    </tbody>
  </table>
</div>`
      default:
        return `<p class="reading-paragraph">${h((block as any).text ?? '')}</p>`
    }
  }).join('\n')
}

export function renderReadingSection(reading: ReadingInput): string {
  if (!reading) return ''

  let contentHtml = ''
  if (Array.isArray(reading.blocks) && reading.blocks.length > 0) {
    contentHtml = renderReadingBlocks(reading.blocks)
  } else if (Array.isArray(reading.paragraphs) && reading.paragraphs.length > 0) {
    contentHtml = reading.paragraphs.map((p) => `<p class="reading-paragraph">${h(p)}</p>`).join('\n')
  }

  const tipsHtml = reading.readingTipsZh && reading.readingTipsZh.length > 0
    ? `<div class="reading-tips"><strong>讀法提示：</strong>${h(reading.readingTipsZh.join('；'))}</div>`
    : ''

  const sourceNoteHtml = reading.sourceNote
    ? `<div class="small muted" style="margin-top: 2.5mm;">資料來源：${h(reading.sourceNote)}</div>`
    : ''

  return `<section class="reading-container">
  <h2>閱讀：${h(reading.title)}</h2>
  <div class="reading-meta-bar">
    <div><strong>情境背景：</strong>${h(reading.contextZh)}</div>
    ${tipsHtml}
  </div>
  <div class="reading-content">
    ${contentHtml}
  </div>
  ${sourceNoteHtml}
</section>`
}
