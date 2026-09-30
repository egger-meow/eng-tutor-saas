import { describe, expect, it, vi } from 'vitest'
import { processMaterialPdfs } from './material-pdf.js'
import type { WorkerClient } from './pipeline.js'

function fixture(completion: boolean = true) {
  const claim = { id: 'artifact', leaseToken: 'lease', kind: 'student', path: 'private/cache.pdf', canonicalSource: { immutable: true } }
  let claimed = false
  const rpc = vi.fn(async (name: string) => {
    if (name === 'claim_material_pdf') {
      if (claimed) return { data: null, error: null }
      claimed = true
      return { data: claim, error: null }
    }
    return { data: completion, error: null }
  })
  const upload = vi.fn(async () => ({ data: {}, error: null }))
  const client = { rpc, storage: { from: () => ({ upload }) } } as unknown as WorkerClient
  return { client, rpc, upload }
}

describe('on-demand PDF trusted processor', () => {
  it('renders only immutable source and stores lease-bound bytes without overwriting history', async () => {
    const { client, rpc, upload } = fixture()
    const render = vi.fn(async () => new Uint8Array(2000))
    expect(await processMaterialPdfs(client, 5, render)).toEqual({ ready: 1, failed: 0 })
    expect(render).toHaveBeenCalledWith({ immutable: true }, 'student')
    expect(upload).toHaveBeenCalledWith('private/cache.pdf', expect.any(Uint8Array), { contentType: 'application/pdf', upsert: false })
    expect(rpc).toHaveBeenCalledWith('finish_material_pdf', expect.objectContaining({ p_id: 'artifact', p_lease: 'lease', p_bytes: 2000 }))
  })
  it('records failed rendering once and leaves it for explicit retry', async () => {
    const { client, rpc, upload } = fixture()
    expect(await processMaterialPdfs(client, 5, async () => { throw new Error('offline') })).toEqual({ ready: 0, failed: 1 })
    expect(upload).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledWith('fail_material_pdf', { p_id: 'artifact', p_lease: 'lease' })
  })
  it('does not report ready when a stale worker loses completion authority', async () => {
    const { client } = fixture(false)
    expect(await processMaterialPdfs(client, 5, async () => new Uint8Array(2000))).toEqual({ ready: 0, failed: 1 })
  })
})
