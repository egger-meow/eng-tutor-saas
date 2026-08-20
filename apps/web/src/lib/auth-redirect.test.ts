import { describe, expect, it } from 'vitest'
import { buildAuthRedirectUrl } from './auth-redirect'

describe('buildAuthRedirectUrl', () => {
  it('uses the Cloudflare production origin root', () => {
    expect(buildAuthRedirectUrl('https://paperbond.jjmowlab.com'))
      .toBe('https://paperbond.jjmowlab.com/')
  })

  it('uses the local origin for a root deployment', () => {
    expect(buildAuthRedirectUrl('http://localhost:5173'))
      .toBe('http://localhost:5173/')
  })
})
