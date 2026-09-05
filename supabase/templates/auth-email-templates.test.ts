import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = resolve(import.meta.dirname, '..', '..')
const config = readFileSync(resolve(projectRoot, 'supabase', 'config.toml'), 'utf8')

const templates = [
  {
    type: 'confirmation',
    file: 'confirmation.html',
    subject: '請確認你的紙屬英文帳號',
    reason: '註冊紙屬英文',
    cta: '確認並前往紙屬英文',
  },
  {
    type: 'magic_link',
    file: 'magic-link.html',
    subject: '登入紙屬英文',
    reason: '完成孩子設定或安全登入紙屬英文',
    cta: '繼續紙屬英文',
  },
  {
    type: 'recovery',
    file: 'recovery.html',
    subject: '重設你的紙屬英文密碼',
    reason: '提出密碼重設要求',
    cta: '重設紙屬英文密碼',
  },
] as const

describe('branded Supabase auth email templates', () => {
  it.each(templates)('configures and brands the $type email', ({ type, file, subject, reason, cta }) => {
    expect(config).toContain(`[auth.email.template.${type}]`)
    expect(config).toContain(`subject = "${subject}"`)
    expect(config).toContain(`content_path = "./supabase/templates/${file}"`)

    const html = readFileSync(resolve(import.meta.dirname, file), 'utf8')
    expect(html).toContain('lang="zh-Hant"')
    expect(html).toContain('紙屬英文')
    expect(html).toContain(reason)
    expect(html).toContain(`>${cta}</a>`)
    expect(html).toContain('直接忽略這封信即可')
    expect(html).toContain('{{ .ConfirmationURL }}')
    expect(html).not.toContain('Click me')
  })

  it('keeps the Magic Link behind a single branded button instead of printing a phishing-looking raw URL', () => {
    const html = readFileSync(resolve(import.meta.dirname, 'magic-link.html'), 'utf8')
    const confirmationUrlOccurrences = html.match(/{{ \.ConfirmationURL }}/g) ?? []

    expect(confirmationUrlOccurrences).toHaveLength(1)
    expect(html).toContain('若按鈕沒有反應，請回到紙屬英文重新寄送一封登入信。')
    expect(html).not.toContain('請複製以下連結到瀏覽器')
    expect(html).not.toContain('word-break:break-all')
  })

  it('brands the waitlist release notification email', () => {
    const html = readFileSync(resolve(import.meta.dirname, 'waitlist-release.html'), 'utf8')
    expect(html).toContain('lang="zh-Hant"')
    expect(html).toContain('紙屬英文')
    expect(html).toContain('學習名額已為您開放')
    expect(html).toContain('>立即前往啟用訂閱</a>')
    expect(html).toContain('{{ .ConfirmationURL }}')
  })
})
