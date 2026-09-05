import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const paths = [
  'apps/web/src/routes/BillingPage.tsx',
  'apps/web/src/components/billing/ChildSubscription.tsx',
] as const

describe('Beta account copy trust boundary', () => {
  it.each(paths)('%s uses Beta/NT$0 language instead of scarcity marketing', (path) => {
    const source = readFileSync(resolve(root, path), 'utf8')
    expect(source).toContain('紙屬英文 Beta')
    expect(source).toContain('NT$0')
    expect(source).not.toContain('🔥 前 100 位')
    expect(source).not.toContain('前 100 位學員')
  })
})
