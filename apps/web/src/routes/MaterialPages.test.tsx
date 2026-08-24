import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { loadAuthenticatedMaterial } from '../lib/authenticated-material-loader'
import { AuthenticatedMaterialContent } from './AuthenticatedMaterialPage'
import { ScopedMaterialLoadingState } from './ScopedMaterialPage'

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: vi.fn(() => ({ rpc: rpcMock })),
}))

describe('material page states', () => {
  it('marks the scoped loading state for centered layout', () => {
    const html = renderToStaticMarkup(<ScopedMaterialLoadingState />)

    expect(html).toContain('scoped-material-loading-state')
    expect(html).toContain('正在安全開啟教材')
    expect(html).toContain('role="status"')
  })

  it('keeps a successful empty result distinct from an RPC error', () => {
    const notFound = renderToStaticMarkup(<AuthenticatedMaterialContent state={{ status: 'not-found' }} onRetry={vi.fn()} />)
    const temporaryError = renderToStaticMarkup(<AuthenticatedMaterialContent state={{ status: 'error' }} onRetry={vi.fn()} />)

    expect(notFound).toContain('找不到這份教材')
    expect(notFound).not.toContain('教材暫時無法載入')
    expect(temporaryError).toContain('教材暫時無法載入')
    expect(temporaryError).toContain('請稍後再試一次。')
    expect(temporaryError).toContain('再試一次')
    expect(temporaryError).toContain('href="/dashboard"')
    expect(temporaryError).not.toContain('找不到這份教材')
  })

  it('classifies successful no-row, RPC error, and rejected requests separately', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const maybeSingle = vi.fn()
    rpcMock.mockReturnValue({ maybeSingle })

    maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    await expect(loadAuthenticatedMaterial('material-1', 'parent-1')).resolves.toEqual({ status: 'not-found' })

    maybeSingle.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'permission denied', details: null, hint: null } })
    await expect(loadAuthenticatedMaterial('material-1', 'parent-1')).resolves.toEqual({ status: 'error' })

    maybeSingle.mockRejectedValueOnce(new Error('network unavailable'))
    await expect(loadAuthenticatedMaterial('material-1', 'parent-1')).resolves.toEqual({ status: 'error' })

    expect(rpcMock).toHaveBeenCalledTimes(3)
    expect(consoleError).toHaveBeenCalledTimes(2)
    consoleError.mockRestore()
  })
})
