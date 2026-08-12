import { describe, expect, it } from 'vitest'
import { buildAuthRedirectUrl } from './auth-redirect'

describe('buildAuthRedirectUrl', () => {
  it('keeps the GitHub Pages repository path', () => {
    expect(buildAuthRedirectUrl('https://egger-meow.github.io', '/eng-tutor-saas/'))
      .toBe('https://egger-meow.github.io/eng-tutor-saas/')
  })

  it('uses the local origin for a root deployment', () => {
    expect(buildAuthRedirectUrl('http://localhost:5173', '/'))
      .toBe('http://localhost:5173/')
  })
})
