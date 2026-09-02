import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const view = readFileSync(resolve(root, 'apps/admin/src/components/funnel/ConversionFunnelView.tsx'), 'utf8')

describe('admin pre-auth funnel copy contract', () => {
  it('describes first-child provisioning before later Magic Link account binding', () => {
    expect(view).toContain('Email → 建立孩子 → 完成設定 → Magic Link 綁定帳號')
    expect(view).not.toContain('Email → Magic Link → 完成設定')
  })

  it('orders the trend columns by the actual first-time onboarding chronology', () => {
    const trendStart = view.indexOf('新客轉換漏斗時間趨勢')
    expect(trendStart).toBeGreaterThanOrEqual(0)
    const trendView = view.slice(trendStart)
    const emailIndex = trendView.indexOf('<th>送出 Email</th>')
    const childIndex = trendView.indexOf('<th>建立孩子</th>')
    const onboardedIndex = trendView.indexOf('<th>完成設定</th>')
    const authIndex = trendView.indexOf('<th>帳號綁定</th>')

    expect(emailIndex).toBeGreaterThanOrEqual(0)
    expect(childIndex).toBeGreaterThan(emailIndex)
    expect(onboardedIndex).toBeGreaterThan(childIndex)
    expect(authIndex).toBeGreaterThan(onboardedIndex)
  })
})
