import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const files = ['confirmation.html', 'magic-link.html', 'recovery.html'] as const

describe('auth email anti-phishing boundary', () => {
  it.each(files)('%s keeps the one-time URL behind one branded button only', (file) => {
    const html = readFileSync(resolve(root, 'supabase/templates', file), 'utf8')
    const occurrences = html.match(/{{ \.ConfirmationURL }}/g) ?? []

    expect(occurrences).toHaveLength(1)
    expect(html).not.toContain('複製以下連結')
    expect(html).not.toContain('word-break:break-all')
  })
})
