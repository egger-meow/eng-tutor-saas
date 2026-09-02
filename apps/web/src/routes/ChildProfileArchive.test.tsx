import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(import.meta.dirname, 'ChildProfilePage.tsx'), 'utf8')

describe('child profile archive UX contract', () => {
  it('offers an explicit reversible-looking confirmation before soft-removing a child', () => {
    expect(source).toContain('archiveChild')
    expect(source).toContain('移除孩子')
    expect(source).toContain('確認移除')
    expect(source).toContain('過往教材與帳務紀錄仍會保留')
    expect(source).toContain('付費訂閱')
  })
})
