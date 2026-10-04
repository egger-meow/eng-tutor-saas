import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LearningSessionNav } from './LearningSessionNav'

describe('LearningSessionNav', () => {
  it('returns null when no saved position, conflict, or error exists', () => {
    const html = renderToStaticMarkup(
      <LearningSessionNav
        savedPosition={null}
        onResume={vi.fn()}
        onDismiss={vi.fn()}
      />
    )
    expect(html).toBe('')
  })

  it('renders resume button and label when savedPosition exists', () => {
    const html = renderToStaticMarkup(
      <LearningSessionNav
        savedPosition={{
          chapter_id: 'reading',
          question_id: null,
          version: 1,
        }}
        onResume={vi.fn()}
        onDismiss={vi.fn()}
      />
    )
    expect(html).toContain('上次停在「<strong>主題閱讀</strong>」')
    expect(html).toContain('接續上次位置')
    expect(html).toContain('略過')
  })

  it('renders question ID detail when present', () => {
    const html = renderToStaticMarkup(
      <LearningSessionNav
        savedPosition={{
          chapter_id: 'practice',
          question_id: 'q-mc-1',
          version: 2,
        }}
        onResume={vi.fn()}
        onDismiss={vi.fn()}
      />
    )
    expect(html).toContain('上次停在「<strong>課堂練習</strong>」 (題目 q-mc-1)')
  })

  it('renders conflict notice when hasConflict is true', () => {
    const html = renderToStaticMarkup(
      <LearningSessionNav
        savedPosition={null}
        hasConflict={true}
        onResume={vi.fn()}
        onDismiss={vi.fn()}
      />
    )
    expect(html).toContain('偵測到其他裝置上的新學習位置')
  })

  it('renders error notice when saveError is true', () => {
    const html = renderToStaticMarkup(
      <LearningSessionNav
        savedPosition={null}
        saveError={true}
        onResume={vi.fn()}
        onDismiss={vi.fn()}
      />
    )
    expect(html).toContain('接續位置暫時未能同步至雲端')
  })
})
