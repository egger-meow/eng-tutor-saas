import { describe, expect, it, vi } from 'vitest'
import { captureScopedMaterialToken, forgetScopedMaterialToken, SCOPED_MATERIAL_TOKEN_KEY } from './scoped-material-token'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
}

describe('scoped material tab token', () => {
  it('captures a direct email token before removing it from the visible URL', () => {
    const storage = memoryStorage()
    const replace = vi.fn()
    expect(captureScopedMaterialToken('?t=secret-token', storage, replace)).toBe('secret-token')
    expect(storage.getItem(SCOPED_MATERIAL_TOKEN_KEY)).toBe('secret-token')
    expect(replace).toHaveBeenCalledOnce()
  })

  it('restores the token from session storage after refresh', () => {
    const storage = memoryStorage()
    storage.setItem(SCOPED_MATERIAL_TOKEN_KEY, 'secret-token')
    const replace = vi.fn()
    expect(captureScopedMaterialToken('', storage, replace)).toBe('secret-token')
    expect(replace).not.toHaveBeenCalled()
  })

  it('forgets scoped access before redirecting the matching owner', () => {
    const storage = memoryStorage()
    storage.setItem(SCOPED_MATERIAL_TOKEN_KEY, 'secret-token')
    forgetScopedMaterialToken(storage)
    expect(storage.getItem(SCOPED_MATERIAL_TOKEN_KEY)).toBeNull()
  })
})
