import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Week1FastProgress } from './Week1FastProgress'

describe('Week1FastProgress', () => {
  it('renders the five real stages without a fake percentage', () => {
    const html = renderToStaticMarkup(<Week1FastProgress progress={{ stage: 'authoring', stageUpdatedAt: null, ready: false }} />)
    expect(html).toContain('資料已收到')
    expect(html).toContain('已排入教材製作')
    expect(html).toContain('正在製作內容')
    expect(html).toContain('品質檢查與排版')
    expect(html).toContain('教材可以下載')
    expect(html).toContain('week1-fast-spinner')
    expect(html).not.toMatch(/\b\d{1,3}%\b/u)
  })

  it('settles all steps into completed state when ready', () => {
    const html = renderToStaticMarkup(<Week1FastProgress progress={{ stage: 'ready', stageUpdatedAt: null, ready: true }} />)
    expect(html).toContain('第一週教材完成了')
    expect(html).not.toContain('week1-fast-spinner')
    expect((html.match(/is-complete/gu) ?? []).length).toBe(5)
  })
})
