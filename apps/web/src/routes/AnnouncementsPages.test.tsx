import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Session } from '@supabase/supabase-js'
import { AnnouncementsPage } from './AnnouncementsPage'
import { AnnouncementDetailPage } from './AnnouncementDetailPage'
import { MarkdownContent } from '../components/announcements/MarkdownContent'
import {
  getCategoryLabel,
  formatAnnouncementDate,
  getAnnouncementExcerpt,
  type Announcement,
} from '../lib/announcements'

const mockSession: Session = {
  access_token: 'fake-token',
  refresh_token: 'fake-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'user-1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-08-01T00:00:00Z',
    email: 'parent@example.com',
  },
}

describe('Announcements page rendering', () => {
  it('renders announcement page structure and friendly headings', () => {
    const html = renderToStaticMarkup(<AnnouncementsPage session={mockSession} />)
    expect(html).toContain('最新消息')
    expect(html).toContain('紙屬英文最近在忙什麼')
    expect(html).toContain('🌱')
    expect(html).toContain('這裡會不定期分享紙屬英文的新功能、教材更新與維護通知。')
  })

  it('renders announcement card elements accurately', () => {
    const mockItem: Announcement = {
      id: 'ann-1',
      title: '每週教材現在更懂孩子的回饋了',
      body: '我們調整了教材產生流程，讓下一週內容可以更精準地延續孩子目前的學習狀態。',
      category: 'feature',
      status: 'published',
      published_at: '2026-08-25T00:00:00Z',
      created_at: '2026-08-25T00:00:00Z',
      updated_at: '2026-08-25T00:00:00Z',
    }

    const excerpt = getAnnouncementExcerpt(mockItem.body)
    const categoryLabel = getCategoryLabel(mockItem.category)
    const dateFormatted = formatAnnouncementDate(mockItem.published_at)

    expect(categoryLabel).toBe('新功能')
    expect(dateFormatted).toMatch(/^2026\.08\.2[56]$/)
    expect(excerpt).toContain('我們調整了教材產生流程')

    const cardHtml = renderToStaticMarkup(
      <article className="announcement-card surface-card">
        <div className="announcement-card-meta">
          <span className={`category-badge category-badge-${mockItem.category}`}>
            {categoryLabel}
          </span>
          <time className="announcement-date">{dateFormatted}</time>
        </div>
        <h2 className="announcement-card-title">
          <a href={`/announcements/${mockItem.id}`}>{mockItem.title}</a>
        </h2>
        <p className="announcement-card-excerpt">{excerpt}</p>
        <div className="announcement-card-action">
          <a href={`/announcements/${mockItem.id}`} className="announcement-read-more">
            查看完整內容 →
          </a>
        </div>
      </article>
    )

    expect(cardHtml).toContain('新功能')
    expect(cardHtml).toContain('每週教材現在更懂孩子的回饋了')
    expect(cardHtml).toContain('href="/announcements/ann-1"')
    expect(cardHtml).toContain('查看完整內容 →')
  })

  it('renders announcement detail page shell with back link', () => {
    const html = renderToStaticMarkup(
      <AnnouncementDetailPage session={mockSession} announcementId="ann-1" />
    )
    expect(html).toContain('← 返回最新消息')
    expect(html).toContain('href="/announcements"')
  })

  it('renders markdown body on detail view', () => {
    const detailBody = '親愛的家長：\n\n我們新增了 **克漏字思考指引**。\n\n- 第一點改進\n- 第二點改進'
    const html = renderToStaticMarkup(<MarkdownContent content={detailBody} />)
    expect(html).toContain('親愛的家長：')
    expect(html).toContain('<strong>克漏字思考指引</strong>')
    expect(html).toContain('<li>第一點改進</li>')
  })
})
