import { describe, expect, it } from 'vitest'
import type { CurriculumPackage } from '@paper-english/generator'
import { renderOpeningActivity } from './opening-renderer.js'

type Opening = CurriculumPackage['studentLesson']['opening']
const base = { goalsZh: ['讀懂原因'], howToUseZh: '讀完再作答。' }

describe('opening activities', () => {
  it('keeps historical warm-ups and their two writing lines', () => {
    const html = renderOpeningActivity({ ...base, warmUp: '你會怎麼做？' })
    expect(html).toContain('先想一想')
    expect(html.match(/class="writing-line"/g)).toHaveLength(2)
  })

  it('omits the activity entirely for direct reading', () => {
    expect(renderOpeningActivity({ ...base, activity: { type: 'direct-reading' } } as Opening)).toBe('')
  })

  it('prints observation examples without silently assigning written work', () => {
    const html = renderOpeningActivity({ ...base, activity: {
      type: 'observation', titleZh: '觀察兩個句子', examples: ['She runs.', '<script>runs</script>'], noticeZh: '留意主詞與動詞。',
    } } as Opening)
    expect(html).toContain('opening-examples')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('writing-line')
    expect(html).not.toContain('先想一想')
  })

  it('respects authored writing space only for a question', () => {
    const html = renderOpeningActivity({ ...base, activity: {
      type: 'question', titleZh: '回想上次的線索', prompt: 'Which clue helped you?', writingLines: 4,
    } } as Opening)
    expect(html.match(/class="writing-line"/g)).toHaveLength(4)
    expect(html).toContain('Which clue helped you?')
  })

  it('provides a compact purpose without response lines', () => {
    const html = renderOpeningActivity({ ...base, activity: {
      type: 'reading-purpose', titleZh: '帶著任務讀', purposeZh: '找出改變結果的原因。',
    } } as Opening)
    expect(html).toContain('找出改變結果的原因。')
    expect(html).not.toContain('writing-line')
  })
})
