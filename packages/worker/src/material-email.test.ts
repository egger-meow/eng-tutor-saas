import { describe, expect, it, vi } from 'vitest'
import { buildMaterialReadyEmailHtml, dispatchMaterialEmails, materialAccessToken, materialAccessTokenHash } from './material-email.js'
import type { WorkerClient } from './pipeline.js'

const env = { resendApiKey: 're_test', materialLinkSecret: 'x'.repeat(32), siteUrl: 'https://paperbond.jjmowlab.com', emailFrom: '紙屬英文 <noreply@example.com>' }

function clientWithClaims(claims: unknown[]): WorkerClient {
  return {
    rpc: vi.fn(async (name: string) => ({ data: name === 'worker_claim_material_email_deliveries' ? claims : true, error: null })),
    storage: { from: vi.fn() as never },
  }
}

describe('material release email dispatcher', () => {
  it('derives a stable opaque token and stores only its hash', () => {
    const token = materialAccessToken('delivery-1', env.materialLinkSecret)
    expect(token).toHaveLength(43)
    expect(token).toBe(materialAccessToken('delivery-1', env.materialLinkSecret))
    expect(materialAccessTokenHash(token)).toMatch(/^[0-9a-f]{64}$/)
    expect(materialAccessTokenHash(token)).not.toContain('delivery-1')
  })

  it('sends one attachment-free email with the required CTA and provider idempotency key', async () => {
    const client = clientWithClaims([{ delivery_id: 'delivery-1', material_id: 'm1', parent_id: 'p1', child_id: 'c1', recipient_email: 'login@example.com', attempt_count: 1 }])
    let capturedRequest: RequestInit | undefined
    const fetcher: typeof fetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      capturedRequest = init
      return new Response(JSON.stringify({ id: 'email-1' }), { status: 200 })
    })
    await expect(dispatchMaterialEmails(client, 'worker-1', env, fetcher)).resolves.toEqual({ claimed: 1, sent: 1, failed: 0 })
    expect((capturedRequest?.headers as Record<string, string>)['idempotency-key']).toBe('material-ready/delivery-1')
    const body = JSON.parse(String(capturedRequest?.body))
    expect(body.to).toEqual(['login@example.com'])
    expect(body.attachments).toBeUndefined()
    expect(body.html).toContain('查看本週教材')
    expect(body.html).not.toContain('.pdf')
  })

  it('records SMTP/API failure without touching material release state', async () => {
    const client = clientWithClaims([{ delivery_id: 'delivery-2', material_id: 'm2', parent_id: 'p1', child_id: 'c1', recipient_email: 'login@example.com', attempt_count: 2 }])
    const result = await dispatchMaterialEmails(client, 'worker-1', env, async () => new Response('temporary', { status: 503 }))
    expect(result).toEqual({ claimed: 1, sent: 0, failed: 1 })
    expect(client.rpc).toHaveBeenCalledWith('worker_fail_material_email_delivery', expect.objectContaining({ p_delivery_id: 'delivery-2' }))
    expect(client.rpc).not.toHaveBeenCalledWith('worker_complete_generation_job', expect.anything())
  })

  it('renders minimal transactional content', () => {
    const html = buildMaterialReadyEmailHtml('https://example.com/material?t=secret')
    expect(html).toContain('孩子的本週教材已經完成，可以開始使用。')
    expect(html).toContain('你也可以登入紙屬英文查看過去教材與學習紀錄。')
  })
})
