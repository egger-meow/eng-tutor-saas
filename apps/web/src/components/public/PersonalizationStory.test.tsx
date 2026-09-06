import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PersonalizationStory } from './PersonalizationStory'

describe('PersonalizationStory signature component', () => {
  it('renders complete personalization narrative and paper artifact in static markup', () => {
    const html = renderToStaticMarkup(<PersonalizationStory />)

    expect(html).toContain('personalization-story-track')
    expect(html).toContain('一個孩子的狀況')
    expect(html).toContain('How Does a Game Place Sound Around You?')
    expect(html).toContain('Student PDF')
    expect(html).toContain('PARENT ANSWER PDF')
    expect(html).toContain('空間介系詞 at / on / in ＋ 閱讀證據整合')
    expect(html).toContain('story-stages-nav')
    expect(html).toContain('aria-label="個人化教材生成四個步驟"')
    expect(html).toContain('story-stages-list')
    expect(html).toContain('aria-current="step"')
    expect(html).toContain('student-sheet')
    expect(html).toContain('parent-sheet')
    expect(html).not.toContain('role="tablist"')
  })

  it('renders all four distinct stages with descriptive copy and numbering', () => {
    const html = renderToStaticMarkup(<PersonalizationStory />)

    expect(html).toContain('01')
    expect(html).toContain('真實學習訊號')
    expect(html).toContain('02')
    expect(html).toContain('鎖定能力缺口')
    expect(html).toContain('03')
    expect(html).toContain('承載真實新知')
    expect(html).toContain('04')
    expect(html).toContain('雙份紙本交付')
  })
})
