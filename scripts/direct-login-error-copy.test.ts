import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const source = readFileSync(resolve(root, 'apps/web/src/components/auth/EmailAuthPanel.tsx'), 'utf8')

describe('direct login trust boundary', () => {
  it('never renders raw auth provider errors to parents', () => {
    expect(source).not.toContain("text: error.message")
    expect(source).toContain('目前無法寄送登入信，請稍後再試。')
  })
})
