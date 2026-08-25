import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MarkdownContent } from './MarkdownContent'

describe('MarkdownContent Component', () => {
  it('renders paragraphs and line breaks', () => {
    const text = '第一段文字。\n第二行內容。\n\n第二段文字。'
    const html = renderToStaticMarkup(<MarkdownContent content={text} />)
    expect(html).toContain('<p class="announcement-paragraph">第一段文字。<br/>第二行內容。</p>')
    expect(html).toContain('<p class="announcement-paragraph">第二段文字。</p>')
  })

  it('renders bold elements safely', () => {
    const text = '這是 **粗體字** 和 __另一個粗體__。'
    const html = renderToStaticMarkup(<MarkdownContent content={text} />)
    expect(html).toContain('<strong>粗體字</strong>')
    expect(html).toContain('<strong>另一個粗體</strong>')
  })

  it('renders unordered and ordered lists', () => {
    const text = '- 項目 A\n- 項目 B\n\n1. 第一步\n2. 第二步'
    const html = renderToStaticMarkup(<MarkdownContent content={text} />)
    expect(html).toContain('<ul class="announcement-list announcement-ul"><li>項目 A</li><li>項目 B</li></ul>')
    expect(html).toContain('<ol class="announcement-list announcement-ol"><li>第一步</li><li>第二步</li></ol>')
  })

  it('renders safe external links with noopener and target blank', () => {
    const text = '請參考 [紙屬英文首頁](https://paperbond.jjmowlab.com)。'
    const html = renderToStaticMarkup(<MarkdownContent content={text} />)
    expect(html).toContain(
      '<a href="https://paperbond.jjmowlab.com" target="_blank" rel="noopener noreferrer" class="announcement-inline-link">紙屬英文首頁</a>'
    )
  })

  it('strictly escapes raw HTML to prevent XSS injection', () => {
    const malicious = '<script>alert("xss")</script><img src="x" onerror="alert(1)" /><b>bold html</b>'
    const html = renderToStaticMarkup(<MarkdownContent content={malicious} />)
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
  })
})
