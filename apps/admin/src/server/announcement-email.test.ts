import { describe, expect, it, vi } from 'vitest'
import {
  buildAnnouncementEmailHtml,
  formatMarkdownToEmailHtml,
  dispatchAnnouncementEmails,
  resolveCtaUrl,
} from './announcement-email.js'

describe('announcement-email module', () => {
  describe('resolveCtaUrl', () => {
    it('returns siteUrl when ctaUrl is empty or null', () => {
      expect(resolveCtaUrl(null, 'https://paperbond.jjmowlab.com')).toBe('https://paperbond.jjmowlab.com')
      expect(resolveCtaUrl('', 'https://paperbond.jjmowlab.com/')).toBe('https://paperbond.jjmowlab.com')
      expect(resolveCtaUrl('   ', 'https://paperbond.jjmowlab.com')).toBe('https://paperbond.jjmowlab.com')
    })

    it('resolves relative URLs against siteUrl', () => {
      expect(resolveCtaUrl('/assessment', 'https://paperbond.jjmowlab.com')).toBe('https://paperbond.jjmowlab.com/assessment')
      expect(resolveCtaUrl('assessment', 'https://paperbond.jjmowlab.com/')).toBe('https://paperbond.jjmowlab.com/assessment')
    })

    it('preserves absolute URLs', () => {
      expect(resolveCtaUrl('https://custom.site.com/test', 'https://paperbond.jjmowlab.com')).toBe('https://custom.site.com/test')
      expect(resolveCtaUrl('http://example.org', 'https://paperbond.jjmowlab.com')).toBe('http://example.org')
    })
  })

  describe('formatMarkdownToEmailHtml', () => {
    it('formats headings correctly', () => {
      const md = '# 大標題\n## 次標題\n### 小標題'
      const html = formatMarkdownToEmailHtml(md)
      expect(html).toContain('<h2')
      expect(html).toContain('大標題</h2>')
      expect(html).toContain('<h3')
      expect(html).toContain('次標題</h3>')
      expect(html).toContain('<h4')
      expect(html).toContain('小標題</h4>')
    })

    it('formats bold text and safe links', () => {
      const md = '這是 **重要通知** 以及 [查看詳情](https://paperbond.jjmowlab.com/dashboard)'
      const html = formatMarkdownToEmailHtml(md)
      expect(html).toContain('<strong style="font-weight:700;color:#173f35;">重要通知</strong>')
      expect(html).toContain('<a href="https://paperbond.jjmowlab.com/dashboard"')
      expect(html).toContain('查看詳情</a>')
    })

    it('escapes unsafe links or scripts', () => {
      const md = '[危險連結](javascript:alert(1))'
      const html = formatMarkdownToEmailHtml(md)
      expect(html).not.toContain('href="javascript:')
      expect(html).toContain('危險連結')
    })

    it('formats bullet lists and numbered lists', () => {
      const md = '- 第一點\n- 第二點\n\n1. 步驟一\n2. 步驟二'
      const html = formatMarkdownToEmailHtml(md)
      expect(html).toContain('<ul')
      expect(html).toContain('<li style="margin-bottom:6px;">第一點</li>')
      expect(html).toContain('<li style="margin-bottom:6px;">第二點</li>')
      expect(html).toContain('<ol')
      expect(html).toContain('<li style="margin-bottom:6px;">步驟一</li>')
      expect(html).toContain('<li style="margin-bottom:6px;">步驟二</li>')
    })
  })

  describe('buildAnnouncementEmailHtml', () => {
    it('builds complete branded email HTML with default official website button and fallback link', () => {
      const html = buildAnnouncementEmailHtml(
        {
          title: '教材更懂得孩子了',
          body: '我們更新了每週教材的回饋調整機制。\n- 支援自選難度\n- 強化會考題型',
          category: 'material',
        },
        'https://paperbond.jjmowlab.com',
      )

      expect(html).toContain('紙屬英文')
      expect(html).toContain('教材更新')
      expect(html).toContain('教材更懂得孩子了')
      expect(html).toContain('前往紙屬英文官網 →')
      expect(html).toContain('https://paperbond.jjmowlab.com')
      expect(html).toContain('官網連結：<a href="https://paperbond.jjmowlab.com"')
      expect(html).toContain('專為台灣國中生打造的個人化英文自學教材')
    })

    it('builds email HTML with custom CTA button text and relative URL for feature release', () => {
      const html = buildAnnouncementEmailHtml(
        {
          title: '🧭 程度診斷上線！',
          body: '孩子可以直接做 **單字・文法・閱讀** 診斷！\n👉 登入後點上方「程度診斷」就可以開始！',
          category: 'feature',
          cta_text: '立即進行程度診斷',
          cta_url: '/assessment',
        },
        'https://paperbond.jjmowlab.com',
      )

      expect(html).toContain('🧭 程度診斷上線！')
      expect(html).toContain('立即進行程度診斷 →')
      expect(html).toContain('href="https://paperbond.jjmowlab.com/assessment"')
      expect(html).toContain('官網連結：<a href="https://paperbond.jjmowlab.com/assessment"')
    })
  })

  describe('dispatchAnnouncementEmails', () => {
    it('sends emails to all users using provided transporter and updates announcement record', async () => {
      const sentMails: any[] = []
      const mockTransporter = {
        sendMail: vi.fn(async (mail) => {
          sentMails.push(mail)
          return { messageId: 'msg-1' }
        }),
      } as any

      const updateCalls: any[] = []
      const mockClient = {
        auth: {
          admin: {
            listUsers: vi.fn(async () => ({
              data: {
                users: [
                  { email: 'user1@example.com' },
                  { email: 'user2@example.com' },
                  { email: 'user1@example.com' }, // duplicate to test deduplication
                ],
              },
              error: null,
            })),
          },
        },
        from: vi.fn(() => ({
          update: vi.fn((payload) => {
            updateCalls.push(payload)
            return {
              eq: vi.fn(async () => ({ data: null, error: null })),
            }
          }),
        })),
      } as any

      const announcement = {
        id: 'ann-123',
        title: '全新功能上線',
        body: '詳細內容',
        category: 'feature' as const,
        status: 'published' as const,
        published_at: '2026-09-12T12:00:00Z',
        created_at: '2026-09-12T12:00:00Z',
        updated_at: '2026-09-12T12:00:00Z',
      }

      const res = await dispatchAnnouncementEmails(mockClient, announcement, {
        siteUrl: 'https://paperbond.jjmowlab.com',
        transporter: mockTransporter,
      })

      expect(res.total).toBe(2)
      expect(res.sent).toBe(2)
      expect(res.failed).toBe(0)
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2)
      expect(sentMails[0].to).toBe('user1@example.com')
      expect(sentMails[0].subject).toBe('[紙屬英文公告] 全新功能上線')
      expect(sentMails[1].to).toBe('user2@example.com')

      expect(updateCalls.length).toBeGreaterThan(0)
      expect(updateCalls[0].email_sent_count).toBe(2)
      expect(updateCalls[0].email_sent_at).toBeDefined()
    })

    it('returns error when SMTP configuration is missing and no transporter is provided', async () => {
      const mockClient = {} as any
      const announcement = {
        id: 'ann-test',
        title: '測試',
        body: '測試內容',
        category: 'notice' as const,
        status: 'published' as const,
        published_at: '2026-09-12T12:00:00Z',
        created_at: '2026-09-12T12:00:00Z',
        updated_at: '2026-09-12T12:00:00Z',
      }

      // Temporarily ensure no SMTP env vars
      const oldHost = process.env.SMTP_HOST
      delete process.env.SMTP_HOST

      const res = await dispatchAnnouncementEmails(mockClient, announcement, {
        recipients: ['test@example.com'],
      })

      expect(res.sent).toBe(0)
      expect(res.error).toContain('SMTP_CONFIG_MISSING')

      if (oldHost) process.env.SMTP_HOST = oldHost
    })
  })
})
