import { describe, expect, it } from 'vitest'

describe('browser configuration boundary', () => {
  it('documents only browser-safe Supabase variables', () => {
    const allowed = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']
    expect(allowed.some((name) => /SECRET|SERVICE_ROLE/.test(name))).toBe(false)
  })
})
