import nodemailer from 'nodemailer'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AnnouncementItem, AnnouncementCategory } from '../client/types.js'

export interface SmtpEmailConfig {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  from: string
}

export interface AnnouncementEmailDispatchResult {
  total: number
  sent: number
  failed: number
  error?: string
}

const CATEGORY_MAP: Record<string, { label: string; bg: string; color: string }> = {
  feature: { label: '新功能', bg: '#e0f2fe', color: '#0369a1' },
  material: { label: '教材更新', bg: '#dcfce7', color: '#15803d' },
  maintenance: { label: '維護通知', bg: '#fef3c7', color: '#b45309' },
  notice: { label: '服務公告', bg: '#f1f5f9', color: '#475569' },
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isSafeUrl(url: string): boolean {
  try {
    const trimmed = url.trim()
    if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true
    const parsed = new URL(trimmed)
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

export function formatMarkdownToEmailHtml(content: string): string {
  if (!content || typeof content !== 'string') return ''

  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')

  const output: string[] = []
  let index = 0

  function renderInline(text: string): string {
    const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\[[^\]]+\]\([^)]+\))/g
    const parts = text.split(pattern)

    return parts
      .map((part) => {
        if (!part) return ''
        if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
          const inner = part.slice(2, -2)
          return `<strong style="font-weight:700;color:#173f35;">${escapeHtml(inner)}</strong>`
        }

        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
        if (linkMatch) {
          const [, linkText, href] = linkMatch
          if (isSafeUrl(href)) {
            return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="color:#c96c43;text-decoration:underline;">${escapeHtml(linkText)}</a>`
          }
          return escapeHtml(linkText)
        }

        return escapeHtml(part)
      })
      .join('')
  }

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      index++
      continue
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2]
      if (level === 1) {
        output.push(`<h2 style="margin:22px 0 10px;font-size:20px;line-height:1.4;color:#173f35;font-family:Georgia,'Noto Serif TC',serif;">${renderInline(text)}</h2>`)
      } else if (level === 2) {
        output.push(`<h3 style="margin:18px 0 8px;font-size:18px;line-height:1.4;color:#173f35;font-family:Georgia,'Noto Serif TC',serif;">${renderInline(text)}</h3>`)
      } else {
        output.push(`<h4 style="margin:14px 0 6px;font-size:16px;line-height:1.4;color:#173f35;">${renderInline(text)}</h4>`)
      }
      index++
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ''))
        index++
      }
      output.push(
        `<ul style="margin:0 0 16px 20px;padding:0;color:#24382f;line-height:1.8;font-size:15px;">` +
          items.map((it) => `<li style="margin-bottom:6px;">${renderInline(it)}</li>`).join('') +
          `</ul>`,
      )
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ''))
        index++
      }
      output.push(
        `<ol style="margin:0 0 16px 20px;padding:0;color:#24382f;line-height:1.8;font-size:15px;">` +
          items.map((it) => `<li style="margin-bottom:6px;">${renderInline(it)}</li>`).join('') +
          `</ol>`,
      )
      continue
    }

    output.push(`<p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#24382f;">${renderInline(line)}</p>`)
    index++
  }

  return output.join('\n')
}

export function resolveCtaUrl(rawUrl: string | null | undefined, siteUrl: string): string {
  const cleanSiteUrl = siteUrl.replace(/\/$/, '')
  if (!rawUrl || !rawUrl.trim()) {
    return cleanSiteUrl
  }
  const trimmed = rawUrl.trim()
  if (trimmed.startsWith('/')) {
    return `${cleanSiteUrl}${trimmed}`
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  return `${cleanSiteUrl}/${trimmed}`
}

export function buildAnnouncementEmailHtml(
  announcement: {
    title: string
    body: string
    category: AnnouncementCategory | string
    cta_text?: string | null
    cta_url?: string | null
    published_at?: string | null
  },
  siteUrl: string,
): string {
  const catInfo = CATEGORY_MAP[announcement.category] || CATEGORY_MAP.notice
  const contentHtml = formatMarkdownToEmailHtml(announcement.body)
  const buttonText = announcement.cta_text?.trim() || '前往紙屬英文官網'
  const actionUrl = resolveCtaUrl(announcement.cta_url, siteUrl)

  return `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>紙屬英文公告 — ${escapeHtml(announcement.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f0e6;color:#24382f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans TC',sans-serif;-webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f0e6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#fffdf7;border:1px solid #ded7c7;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.04);">
            <!-- Header -->
            <tr>
              <td style="background:#173f35;padding:22px 32px;color:#fffdf7;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="font-family:Georgia,'Noto Serif TC',serif;font-size:24px;font-weight:700;color:#fffdf7;letter-spacing:0.5px;">
                      紙屬英文
                    </td>
                    <td align="right">
                      <span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;background:rgba(255,255,255,0.18);color:#fffdf7;">
                        服務公告
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Content Area -->
            <tr>
              <td style="padding:32px 32px 28px;">
                <!-- Category Badge -->
                <div style="margin-bottom:12px;">
                  <span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;background:${catInfo.bg};color:${catInfo.color};">
                    ${escapeHtml(catInfo.label)}
                  </span>
                </div>

                <!-- Title -->
                <h1 style="margin:0 0 20px;font-size:22px;line-height:1.45;color:#173f35;font-weight:700;font-family:Georgia,'Noto Serif TC',serif;">
                  ${escapeHtml(announcement.title)}
                </h1>

                <!-- Body Content -->
                <div style="border-top:1px solid #eee7db;padding-top:20px;margin-bottom:28px;">
                  ${contentHtml}
                </div>

                <!-- Action CTA -->
                <div style="text-align:center;margin:32px 0 24px;">
                  <a href="${escapeHtml(actionUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#c96c43;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 36px;border-radius:999px;letter-spacing:0.5px;box-shadow:0 3px 10px rgba(201,108,67,0.25);">
                    ${escapeHtml(buttonText)} →
                  </a>
                  <div style="margin-top:12px;font-size:12px;color:#85948c;line-height:1.5;">
                    官網連結：<a href="${escapeHtml(actionUrl)}" target="_blank" rel="noopener noreferrer" style="color:#c96c43;text-decoration:underline;word-break:break-all;">${escapeHtml(actionUrl)}</a>
                  </div>
                </div>

                <!-- Footer Note inside Card -->
                <div style="margin-top:24px;padding-top:18px;border-top:1px solid #eee7db;font-size:13px;line-height:1.7;color:#617068;">
                  親愛的家長您好，此信件為紙屬英文最新發布之服務公告通知。<br>
                  您也可以隨時登入紙屬英文後台查看所有歷史公告與教材進度。
                </div>
              </td>
            </tr>

            <!-- Subtle Bottom Footer -->
            <tr>
              <td style="background:#f9f6ef;padding:14px 32px;font-size:12px;color:#85948c;text-align:center;border-top:1px solid #ded7c7;">
                紙屬英文團隊 · 專為台灣國中生打造的個人化英文自學教材
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export function getSmtpConfigFromEnv(): SmtpEmailConfig | null {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || '465', 10)
  const secure = process.env.SMTP_SECURE === 'true' || port === 465
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASS
  const from = process.env.EMAIL_FROM || '紙屬英文 <noreply@paperenglish.com>'

  if (!host || !user || !password) {
    return null
  }

  return { host, port, secure, user, password, from }
}

export async function fetchAllActiveUserEmails(client: SupabaseClient): Promise<string[]> {
  const emails = new Set<string>()
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`)
    }

    if (!data?.users || data.users.length === 0) break

    for (const user of data.users) {
      if (user.email && typeof user.email === 'string') {
        const cleaned = user.email.trim().toLowerCase()
        if (cleaned.includes('@') && !user.banned_until) {
          emails.add(cleaned)
        }
      }
    }

    if (data.users.length < perPage) break
    page++
  }

  return Array.from(emails)
}

export async function dispatchAnnouncementEmails(
  client: SupabaseClient,
  announcement: AnnouncementItem,
  options?: {
    siteUrl?: string
    smtpConfig?: SmtpEmailConfig
    transporter?: nodemailer.Transporter
    recipients?: string[]
  },
): Promise<AnnouncementEmailDispatchResult> {
  const siteUrl = options?.siteUrl || process.env.SITE_URL || 'https://paperbond.jjmowlab.com'
  const smtpConfig = options?.smtpConfig || getSmtpConfigFromEnv()

  if (!options?.transporter && !smtpConfig) {
    return {
      total: 0,
      sent: 0,
      failed: 0,
      error: 'SMTP_CONFIG_MISSING: SMTP_HOST, SMTP_USER, or SMTP_PASS is not configured.',
    }
  }

  const transporter =
    options?.transporter ||
    nodemailer.createTransport({
      host: smtpConfig!.host,
      port: smtpConfig!.port,
      secure: smtpConfig!.secure,
      requireTLS: !smtpConfig!.secure,
      auth: {
        user: smtpConfig!.user,
        pass: smtpConfig!.password,
      },
    })

  const fromAddress = smtpConfig?.from || '紙屬英文 <noreply@paperenglish.com>'
  const subject = `[紙屬英文公告] ${announcement.title}`
  const html = buildAnnouncementEmailHtml(announcement, siteUrl)

  // 1. Fetch all recipient emails
  const recipients = options?.recipients || (await fetchAllActiveUserEmails(client))
  const total = recipients.length

  if (total === 0) {
    return { total: 0, sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0

  // 2. Dispatch concurrently in batches of 5
  const CONCURRENCY = 5
  for (let i = 0; i < recipients.length; i += CONCURRENCY) {
    const chunk = recipients.slice(i, i + CONCURRENCY)
    await Promise.all(
      chunk.map(async (email) => {
        try {
          await transporter.sendMail({
            from: fromAddress,
            to: email,
            subject,
            html,
          })
          sent++
        } catch (err) {
          failed++
          console.error(`[AUDIT] announcement_email_failed for ${email}:`, err)
        }
      }),
    )
  }

  // 3. Update announcement table record
  const sentAt = new Date().toISOString()
  try {
    await client
      .from('announcements')
      .update({
        email_sent_at: sentAt,
        email_sent_count: sent,
      })
      .eq('id', announcement.id)
  } catch (dbErr) {
    console.error('[AUDIT] failed to update announcement email_sent_at:', dbErr)
  }

  console.log('[AUDIT] announcement_emails_dispatched:', {
    announcementId: announcement.id,
    title: announcement.title,
    totalRecipients: total,
    sent,
    failed,
    timestamp: sentAt,
  })

  return { total, sent, failed }
}
