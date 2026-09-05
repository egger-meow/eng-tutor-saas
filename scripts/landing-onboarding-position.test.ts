import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const source = readFileSync(resolve(root, 'apps/web/src/routes/LandingPage.tsx'), 'utf8')

describe('landing onboarding placement', () => {
  it('lets parents inspect a real sample and then start immediately before the long explanation path', () => {
    const sampleIndex = source.indexOf('id="samples"')
    const onboardingIndex = source.indexOf('onboarding-login-section')
    const personalizationIndex = source.indexOf('id="personalization"')

    expect(sampleIndex).toBeGreaterThan(-1)
    expect(onboardingIndex).toBeGreaterThan(sampleIndex)
    expect(personalizationIndex).toBeGreaterThan(onboardingIndex)
  })
})
