import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LandingPage } from './LandingPage'

describe('Landing Page — Two Core Brains', () => {
  it('explains the two strongest technical systems in parent-readable language before the sample PDFs', () => {
    const html = renderToStaticMarkup(<LandingPage />)

    expect(html).toContain('紙屬英文的兩顆核心大腦')
    expect(html).toContain('全網知識大腦')
    expect(html).toContain('會考命題大腦')
    expect(html).toContain('興趣不是文章換皮，而是通往真實新知的入口。')
    expect(html).toContain('會考是品質底線，不是限制創意的模具。')
    expect(html).toContain('近五年國中會考英文 215 題')
    expect(html).toContain('孩子現在的位置')
    expect(html).toContain('這一週，只屬於他的教材')

    expect(html.indexOf('紙屬英文的兩顆核心大腦')).toBeGreaterThan(html.indexOf('訂閱的是一個會變好的系統'))
    expect(html.indexOf('紙屬英文的兩顆核心大腦')).toBeLessThan(html.indexOf('先看每週實際拿到什麼'))

    expect(html).not.toContain('Prompt 2.9.1')
    expect(html).not.toContain('non-holdout')
    expect(html).not.toContain('precedentRefs')
    expect(html).not.toContain('cap-provenance')
  })
})
