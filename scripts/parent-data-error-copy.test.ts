import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const source = readFileSync(resolve(root, 'apps/web/src/hooks/use-parent-data.ts'), 'utf8')

describe('parent data error boundary', () => {
  it('never renders raw database or API error messages to parents', () => {
    expect(source).not.toContain("setError(caught instanceof Error ? caught.message")
    expect(source).toContain("setError('目前無法更新孩子的學習資料，請稍後再試。')")
  })
})
