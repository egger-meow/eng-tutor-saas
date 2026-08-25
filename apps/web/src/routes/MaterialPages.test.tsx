import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { loadAuthenticatedMaterial } from '../lib/authenticated-material-loader'
import { AuthenticatedMaterialContent } from './AuthenticatedMaterialPage'
import { ScopedMaterialContent, ScopedMaterialLoadingState, ScopedMaterialPage } from './ScopedMaterialPage'

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: vi.fn(() => ({ rpc: rpcMock })),
}))

describe('material page states', () => {
  it('marks the scoped page wrapper as full-width only while loading', () => {
    const html = renderToStaticMarkup(<ScopedMaterialPage session={null} />)

    expect(html).toContain('scoped-material-main-loading')
    expect(html).toContain('container scoped-material-page')
  })

  it('marks the scoped loading state for centered layout', () => {
    const html = renderToStaticMarkup(<ScopedMaterialLoadingState />)

    expect(html).toContain('scoped-material-loading-state')
    expect(html).toContain('正在安全開啟教材')
    expect(html).toContain('role="status"')
  })

  it('renders scoped material ready state with structured download cards and badges', () => {
    const html = renderToStaticMarkup(
      <ScopedMaterialContent
        state={{
          status: 'ready',
          material: { childName: 'Pax', materialWeek: '2026-W35', weekNumber: 1 },
          studentPdfUrl: 'https://example.com/student.pdf',
          parentAnswerPdfUrl: 'https://example.com/parent.pdf',
        }}
        session={null}
      />
    )

    expect(html).toContain('Pax · Week 1')
    expect(html).toContain('本週教材')
    expect(html).toContain('學生學習版')
    expect(html).toContain('學生教材')
    expect(html).toContain('家長解答版')
    expect(html).toContain('家長解答')
    expect(html).toContain('href="https://example.com/student.pdf"')
    expect(html).toContain('href="https://example.com/parent.pdf"')
    expect(html).toContain('scoped-download-item')
    expect(html).toContain('登入查看所有教材與學習紀錄')
  })

  it('renders scoped material error state with clear notice and recovery action', () => {
    const html = renderToStaticMarkup(
      <ScopedMaterialContent
        state={{ status: 'error' }}
        session={null}
      />
    )

    expect(html).toContain('這個教材連結無法使用')
    expect(html).toContain('教材連結')
    expect(html).toContain('登入紙屬英文')
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
