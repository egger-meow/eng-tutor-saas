import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const uiFiles = [
  'apps/web/src/App.tsx',
  'apps/web/src/routes/BillingPage.tsx',
  'apps/web/src/routes/ChildProfilePage.tsx',
  'apps/web/src/routes/ChildOnboardingPage.tsx',
  'apps/web/src/components/auth/EmailAuthPanel.tsx',
  'apps/web/src/components/auth/LandingOnboardingPanel.tsx',
  'apps/web/src/components/feedback/FeedbackForm.tsx',
  'apps/web/src/components/materials/MaterialActions.tsx',
  'apps/web/src/components/product-feedback/ProductFeedbackForm.tsx',
] as const

describe('user-facing raw error boundary', () => {
  it.each(uiFiles)('%s does not render raw exception/provider messages', (path) => {
    const source = readFileSync(resolve(root, path), 'utf8')
    expect(source).not.toMatch(/caught instanceof Error\s*\?\s*caught\.message/u)
    expect(source).not.toMatch(/text:\s*error\.message/u)
  })
})
