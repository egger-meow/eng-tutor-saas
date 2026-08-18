import type { AdaptiveExtension } from '@paper-english/generator'
import { escapeHtml as h } from '../escape-html.js'

export const ADAPTIVE_EXTENSION_PURPOSE_LABELS: Record<AdaptiveExtension['purpose'], string> = {
  'strategy': '學習策略加深',
  'reasoning': '思維推論挑戰',
  'pronunciation': '發音與語調秘訣',
  'real-world-application': '真實語境應用',
  'creative-depth': '創意學習延伸',
}

export function renderAdaptiveExtension(ext: AdaptiveExtension | null | undefined): string {
  if (!ext) return ''

  const badgeLabel = ADAPTIVE_EXTENSION_PURPOSE_LABELS[ext.purpose] || '學習延伸'

  let taskHtml = ''
  if (ext.taskZh) {
    let linesHtml = ''
    const lineCount = typeof ext.taskWritingLines === 'number' ? ext.taskWritingLines : 0
    if (lineCount > 0) {
      const lines: string[] = []
      for (let i = 0; i < lineCount; i++) {
        lines.push('<div class="writing-line"></div>')
      }
      linesHtml = `<div class="writing-lines-container" style="margin-top: 2mm;">${lines.join('')}</div>`
    }

    taskHtml = `<div class="adaptive-extension-task">
    <div class="adaptive-task-kicker">延伸小任務</div>
    <div class="adaptive-task-prompt">${h(ext.taskZh)}</div>
    ${linesHtml}
  </div>`
  }

  return `<section class="adaptive-extension-card" data-placement="${h(ext.placement)}" data-purpose="${h(ext.purpose)}">
  <div class="adaptive-extension-header">
    <span class="adaptive-extension-badge">【${h(badgeLabel)}】</span>
    <h3 class="adaptive-extension-title">${h(ext.titleZh)}</h3>
  </div>
  <div class="adaptive-extension-content">${h(ext.contentZh)}</div>
  ${taskHtml}
</section>`
}
