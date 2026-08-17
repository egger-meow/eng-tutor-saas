import { describe, expect, it } from 'vitest'
import { renderVocabularySection } from './vocabulary-renderer.js'

describe('vocabulary-renderer', () => {
  it('renders a 2-column scannable reference panel for vocabulary items', () => {
    const vocabList = [
      {
        id: 'vocab-1',
        word: 'partner',
        partOfSpeech: 'n.',
        meaningZh: '夥伴；搭檔',
        pronunciationHint: null,
        exampleEn: 'Mina works with a partner to test the machine.',
        exampleZh: 'Mina 和搭檔一起測試這台機器。',
        status: 'new' as const,
      },
      {
        id: 'vocab-2',
        word: 'suggest',
        partOfSpeech: 'v.',
        meaningZh: '建議',
        pronunciationHint: null,
        exampleEn: 'Jay suggests changing one part first.',
        exampleZh: 'Jay 建議先更換一個零件。',
        status: 'review' as const,
      },
    ]

    const html = renderVocabularySection(vocabList)
    expect(html).toContain('<h2>核心單字</h2>')
    expect(html).toContain('class="vocab-grid"')
    expect(html).toContain('class="vocab-entry"')
    expect(html).toContain('class="vocab-word">partner</span>')
    expect(html).toContain('class="vocab-pos">(n.)</span>')
    expect(html).toContain('class="vocab-meaning">夥伴；搭檔</span>')
    expect(html).toContain('Mina works with a partner to test the machine.')
    expect(html).toContain('Mina 和搭檔一起測試這台機器。')
    expect(html).toContain('class="vocab-word">suggest</span>')
    expect(html).toContain('class="vocab-pos">(v.)</span>')
  })

  it('returns empty string if vocabulary is empty or undefined', () => {
    expect(renderVocabularySection([])).toBe('')
    expect(renderVocabularySection(undefined as any)).toBe('')
  })
})
