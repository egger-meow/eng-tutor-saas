import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DisclosureItem, DisclosureIcon } from './Disclosure'
import { AnimatedDetails } from './AnimatedDetails'

describe('DisclosureItem component', () => {
  it('renders with correct aria-expanded false and controls when closed', () => {
    const html = renderToStaticMarkup(
      <DisclosureItem
        id="test-1"
        title="這是一道常見問題？"
        open={false}
        onToggle={() => {}}
      >
        <p>這是問題的解答內容。</p>
      </DisclosureItem>
    )

    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('aria-controls="disclosure-panel-test-1"')
    expect(html).toContain('這是一道常見問題？')
    expect(html).toContain('disclosure-trigger')
    expect(html).toContain('disclosure-icon-wrap')
    // Answer panel is not rendered when closed
    expect(html).not.toContain('這是問題的解答內容。')
  })

  it('renders answer and aria-expanded true when open', () => {
    const html = renderToStaticMarkup(
      <DisclosureItem
        id="test-2"
        title="這是一道已展開的問題？"
        open={true}
        onToggle={() => {}}
      >
        <p>這是展開後的解答內容。</p>
      </DisclosureItem>
    )

    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('aria-controls="disclosure-panel-test-2"')
    expect(html).toContain('disclosure-panel')
    expect(html).toContain('這是展開後的解答內容。')
    expect(html).toContain('is-open')
  })

  it('renders morphing SVG icon with circular outline and plus bars', () => {
    const closedHtml = renderToStaticMarkup(<DisclosureIcon open={false} />)
    expect(closedHtml).toContain('disclosure-bar-h')
    expect(closedHtml).toContain('disclosure-bar-v')
    expect(closedHtml).not.toContain('is-open')

    const openHtml = renderToStaticMarkup(<DisclosureIcon open={true} />)
    expect(openHtml).toContain('is-open')
  })
})

describe('AnimatedDetails component', () => {
  it('renders semantic details and summary with accessible inner content', () => {
    const html = renderToStaticMarkup(
      <AnimatedDetails summary="深入了解系統機制">
        <div className="inner-body">
          <p>這是深入說明的詳細文字。</p>
        </div>
      </AnimatedDetails>
    )

    expect(html).toContain('<details')
    expect(html).toContain('<summary')
    expect(html).toContain('深入了解系統機制')
    expect(html).toContain('animated-details-wrapper')
    expect(html).toContain('這是深入說明的詳細文字。')
  })
})
