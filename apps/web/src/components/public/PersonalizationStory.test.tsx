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
    expect(html).toContain('Parent Answer PDF')
    expect(html).toContain('空間介系詞 at / on / in ＋ 閱讀證據整合')
    expect(html).toContain('story-stages-nav')
    expect(html).toContain('role="tablist"')
  })
})
