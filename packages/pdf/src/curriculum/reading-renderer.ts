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
  targetVocabulary?: readonly (string | { word: string })[]
  targetPatterns?: readonly string[]
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function buildVocabPattern(word: string): string | null {
  const clean = word.toLowerCase().trim().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gu, '')
  if (clean.length < 2) return null

  const forms = new Set<string>()
  forms.add(clean)

  // Regular and common inflections
  if (clean.endsWith('y') && clean.length > 2 && !/[aeiou]y$/u.test(clean)) {
    const stem = clean.slice(0, -1)
    forms.add(stem + 'ies')
    forms.add(stem + 'ied')
    forms.add(clean + 'ing')
  } else if (clean.endsWith('e')) {
    const stem = clean.slice(0, -1)
    forms.add(clean + 's')
    forms.add(clean + 'd')
    forms.add(stem + 'ing')
    forms.add(clean + 'r')
    forms.add(clean + 'st')
  } else {
    forms.add(clean + 's')
    forms.add(clean + 'es')
    forms.add(clean + 'ed')
    forms.add(clean + 'ing')
    forms.add(clean + 'er')
    forms.add(clean + 'est')
    forms.add(clean + 'ly')

    // Doubled final consonant (CVC pattern)
    if (clean.length >= 3 && /[^aeiou][aeiou][b-df-hj-np-tv-z]$/u.test(clean)) {
      const lastChar = clean[clean.length - 1]
      forms.add(clean + lastChar + 'ed')
      forms.add(clean + lastChar + 'ing')
      forms.add(clean + lastChar + 'er')
      forms.add(clean + lastChar + 'est')
    }
  }

  // Sort longest first to match maximum prefixes
  const sortedForms = Array.from(forms).sort((a, b) => b.length - a.length)
  return `(?:${sortedForms.map(escapeRegex).join('|')})`
}

export function highlightReadingContent(
  text: string,
  targetVocab?: readonly (string | { word: string })[],
  targetPatterns?: readonly string[],
): string {
  if (!text) return ''

  const vocabWords = (targetVocab ?? [])
    .map((v) => (typeof v === 'string' ? v : v.word))
    .filter(Boolean)

  const grammarPatterns = (targetPatterns ?? [])
    .filter(Boolean)
    .filter((p) => !p.includes('+') && !p.includes('/') && p.length >= 3) // only concrete target phrases, not formulaic rules

  const matchRanges: Array<{ start: number; end: number; type: 'vocab' | 'grammar' }> = []

  // 1. Find target grammar phrase matches
  for (const pattern of grammarPatterns) {
    const regex = new RegExp(`\\b${escapeRegex(pattern)}\\b`, 'giu')
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      matchRanges.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'grammar',
      })
    }
  }

  // 2. Find target vocabulary matches
  for (const word of vocabWords) {
    const patternStr = buildVocabPattern(word)
    if (!patternStr) continue
    const regex = new RegExp(`\\b${patternStr}\\b`, 'giu')
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      matchRanges.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'vocab',
      })
    }
  }

  if (matchRanges.length === 0) {
    return h(text)
  }

  // Sort ranges and eliminate overlaps (earlier / longer match wins)
  matchRanges.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))

  const nonOverlapping: typeof matchRanges = []
  let lastEnd = 0
  for (const range of matchRanges) {
    if (range.start >= lastEnd) {
      nonOverlapping.push(range)
      lastEnd = range.end
    }
  }

  let result = ''
  let cursor = 0
  for (const range of nonOverlapping) {
    if (range.start > cursor) {
      result += h(text.slice(cursor, range.start))
    }
    const matchedText = text.slice(range.start, range.end)
    const className = range.type === 'vocab' ? 'target-vocab' : 'target-grammar'
    result += `<span class="${className}">${h(matchedText)}</span>`
    cursor = range.end
  }

  if (cursor < text.length) {
    result += h(text.slice(cursor))
  }

  return result
}

function renderReadingBlocks(
  blocks: readonly ReadingBlock[],
  targetVocab?: readonly (string | { word: string })[],
  targetPatterns?: readonly string[],
): string {
  const hl = (txt: string) => highlightReadingContent(txt, targetVocab, targetPatterns)

  // Check if blocks are entirely or predominantly schedule rows or dialogue turns to group them nicely
  const hasScheduleRows = blocks.some((b) => b.type === 'schedule-row')
  const hasDialogue = blocks.some((b) => b.type === 'dialogue')

  if (hasScheduleRows && blocks.every((b) => b.type === 'schedule-row')) {
    const rows = blocks.map((block) => {
      if (block.type !== 'schedule-row') return ''
      return `<tr>
  <td class="schedule-time">${hl(block.timeOrStep)}</td>
  <td class="schedule-event">${hl(block.event)}</td>
  <td class="schedule-detail">${block.detail ? hl(block.detail) : '<span class="muted">-</span>'}</td>
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
  <div class="dialogue-text">${hl(block.text)}</div>
</div>`
    }).join('\n')

    return `<div class="dialogue-container">${turns}</div>`
  }

  // Mixed or general blocks
  return blocks.map((block) => {
    switch (block.type) {
      case 'paragraph':
        return `<p class="reading-paragraph">${hl(block.text)}</p>`
      case 'dialogue':
        return `<div class="dialogue-turn">
  <div class="dialogue-speaker">${h(block.speaker)}:</div>
  <div class="dialogue-text">${hl(block.text)}</div>
</div>`
      case 'notice':
        return `<div class="notice-card">
  ${block.heading ? `<div class="notice-heading">${hl(block.heading)}</div>` : ''}
  <div class="notice-body">${hl(block.text)}</div>
</div>`
      case 'schedule-row':
        return `<div class="schedule-table-wrap">
  <table class="schedule-table">
    <tbody>
      <tr>
        <td class="schedule-time">${hl(block.timeOrStep)}</td>
        <td class="schedule-event">${hl(block.event)}</td>
        <td class="schedule-detail">${block.detail ? hl(block.detail) : '<span class="muted">-</span>'}</td>
      </tr>
    </tbody>
  </table>
</div>`
      default:
        return `<p class="reading-paragraph">${hl((block as any).text ?? '')}</p>`
    }
  }).join('\n')
}

export function renderReadingSection(
  reading: ReadingInput,
  targetVocab?: readonly (string | { word: string })[],
  targetPatterns?: readonly string[],
): string {
  if (!reading) return ''

  const vocab = targetVocab ?? reading.targetVocabulary
  const patterns = targetPatterns ?? reading.targetPatterns
  const hl = (txt: string) => highlightReadingContent(txt, vocab, patterns)

  let contentHtml = ''
  if (Array.isArray(reading.blocks) && reading.blocks.length > 0) {
    contentHtml = renderReadingBlocks(reading.blocks, vocab, patterns)
  } else if (Array.isArray(reading.paragraphs) && reading.paragraphs.length > 0) {
    contentHtml = reading.paragraphs.map((p) => `<p class="reading-paragraph">${hl(p)}</p>`).join('\n')
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
