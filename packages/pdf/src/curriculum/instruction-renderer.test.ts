import { describe, expect, it } from 'vitest'
import { renderInstructionSection } from './instruction-renderer.js'

describe('instruction-renderer', () => {
  it('renders explanation, pattern formulas, worked examples, and grayscale-safe common mistakes', () => {
    const instructions = [
      {
        id: 'do-does',
        titleZh: 'do / does 問句與肯定句',
        explanationZh: '主詞是第三人稱單數（he, she, it）時，問句用 Does 開頭，後面的動詞回到原形。',
        patterns: ['Does + he / she / it + 原形動詞...?'],
        workedExamples: [
          {
            example: 'Does Mina record the test result?',
            walkthroughZh: 'Mina 是第三人稱單數，開頭用 Does，後面的動詞 record 使用原形。',
          },
        ],
        commonMistakes: [
          {
            wrong: 'Does Mina records the result?',
            corrected: 'Does Mina record the result?',
            whyZh: 'Does 已經表示第三人稱單數，後面的動詞必須保持原形。',
          },
        ],
      },
    ]

    const html = renderInstructionSection(instructions)
    expect(html).toContain('<h2>觀念解說：do / does 問句與肯定句</h2>')
    expect(html).toContain('主詞是第三人稱單數（he, she, it）時')
    expect(html).toContain('class="pattern-box"')
    expect(html).toContain('Does + he / she / it + 原形動詞...?')
    expect(html).toContain('<h3>完整示範</h3>')
    expect(html).toContain('Does Mina record the test result?')
    expect(html).toContain('Mina 是第三人稱單數')
    expect(html).toContain('<h3>容易踩到的盲點與陷阱</h3>')
    expect(html).toContain('class="mistake-tag-wrong">✗ 錯誤</span>')
    expect(html).toContain('Does Mina records the result?')
    expect(html).toContain('class="mistake-tag-correct">✓ 正確</span>')
    expect(html).toContain('Does Mina record the result?')
    expect(html).toContain('Does 已經表示第三人稱單數')
  })

  it('returns empty string if instructions array is empty', () => {
    expect(renderInstructionSection([])).toBe('')
    expect(renderInstructionSection(undefined as any)).toBe('')
  })
})

it('renders authored instruction blocks in order without compulsory legacy sections', () => {
  const html = renderInstructionSection([{
    id: 'compare', titleZh: '看主詞，再選動詞', blocks: [
      { type: 'comparison', headers: ['主詞', '例句'], rows: [['I', 'I run.'], ['She', 'She runs.']], takeawayZh: '留意動詞結尾。' },
      { type: 'prose', textZh: '先觀察兩句。\n再找差異。' },
      { type: 'bullets', itemsZh: ['看主詞', '看動詞'] },
      { type: 'steps', titleZh: '判斷順序', itemsZh: ['找出主詞。', '決定動詞形式。'] },
      { type: 'worked-example', example: 'He runs.', walkthroughZh: 'He 是第三人稱單數。' },
      { type: 'error-analysis', wrong: 'She run.', corrected: 'She runs.', whyZh: 'She 搭配 runs。' },
    ],
  }])
  expect(html).toContain('<th scope="col">主詞</th>')
  expect(html).toContain('<td>She runs.</td>')
  expect(html).toContain('<ul class="instruction-bullets">')
  expect(html).toContain('<ol class="instruction-steps">')
  expect(html.indexOf('instruction-comparison')).toBeLessThan(html.indexOf('instruction-prose'))
  expect(html).toContain('He 是第三人稱單數。')
  expect(html).toContain('She 搭配 runs。')
  expect(html).not.toContain('核心句型結構')
  expect(html).not.toContain('完整示範')
})

it('escapes every authored instructional block instead of interpreting HTML', () => {
  const html = renderInstructionSection([{
    id: 'escaped', titleZh: '<b>title</b>', blocks: [
      { type: 'comparison', headers: ['<img>', '例句'], rows: [['<script>', '<i>']] },
      { type: 'steps', itemsZh: ['<script>alert(1)</script>'] },
      { type: 'prose', textZh: '<b>prose</b>' },
    ],
  }])
  expect(html).toContain('&lt;script&gt;')
  expect(html).not.toContain('<script>')
  expect(html).not.toContain('<img>')
  expect(html).not.toContain('<b>')
})
