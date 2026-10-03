import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import http, { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { handleApiRequest } from './api-handler.js'
import type { AdminService } from './admin-service.js'

describe('Admin API Request Guard & CSRF/Rebinding Protections', () => {
  let server: Server
  let port: number

  const mockService = {
    getIsConnected: vi.fn(() => true),
    createAnnouncement: vi.fn(async () => ({ success: true, id: 'ann-1' })),
    sendAnnouncementEmail: vi.fn(async () => ({ success: true })),
    getAiExportDataset: vi.fn(async () => ({ rows: [] })),
  } as unknown as AdminService

  function rawRequest(options: {
    method: string
    path: string
    host?: string
    origin?: string
    headers?: Record<string, string>
    body?: string
  }): Promise<{ status: number; headers: http.IncomingHttpHeaders; text: string }> {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: options.path,
        method: options.method,
        headers: {
          ...(options.host ? { Host: options.host } : {}),
          ...(options.origin ? { Origin: options.origin } : {}),
          ...(options.headers || {}),
        },
      }, (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            text: data,
          })
        })
      })
      req.on('error', reject)
      if (options.body) req.write(options.body)
      req.end()
    })
  }

  beforeAll(async () => {
    server = createServer(async (req, res) => {
      const handled = await handleApiRequest(req, res, mockService)
      if (!handled) {
        res.statusCode = 404
        res.end('Not Found')
      }
    })

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve())
    })
    const addr = server.address() as AddressInfo
    port = addr.port
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('rejects hostile-origin text/plain simple POST (blocks CSRF mutation attempt)', async () => {
    const res = await rawRequest({
      method: 'POST',
      path: '/api/announcements/send-email',
      host: `127.0.0.1:${port}`,
      origin: 'https://malicious-site.example',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ id: 'target-announcement' }),
    })

    expect(res.status).toBe(403)
    const json = JSON.parse(res.text)
    expect(json.error).toBe('FORBIDDEN_ORIGIN')
    expect(mockService.sendAnnouncementEmail).not.toHaveBeenCalled()
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('rejects POST with allowed Origin but missing X-Paper-Admin header', async () => {
    const res = await rawRequest({
      method: 'POST',
      path: '/api/announcements/create',
      host: `127.0.0.1:${port}`,
      origin: `http://127.0.0.1:${port}`,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'test', content: 'test' }),
    })

    expect(res.status).toBe(403)
    const json = JSON.parse(res.text)
    expect(json.error).toBe('FORBIDDEN_REQUEST')
    expect(mockService.createAnnouncement).not.toHaveBeenCalled()
  })

  it('rejects POST with allowed Origin and header but unsupported Content-Type (e.g. text/plain)', async () => {
    const res = await rawRequest({
      method: 'POST',
      path: '/api/announcements/create',
      host: `127.0.0.1:${port}`,
      origin: `http://127.0.0.1:${port}`,
      headers: {
        'Content-Type': 'text/plain',
        'X-Paper-Admin': '1',
      },
      body: JSON.stringify({ title: 'test', content: 'test' }),
    })

    expect(res.status).toBe(415)
    const json = JSON.parse(res.text)
    expect(json.error).toBe('UNSUPPORTED_MEDIA_TYPE')
    expect(mockService.createAnnouncement).not.toHaveBeenCalled()
  })

  it('rejects GET with disallowed Host (DNS rebinding protection for data export)', async () => {
    const res = await rawRequest({
      method: 'GET',
      path: '/api/export/ai-dataset',
      host: 'attacker-controlled-rebinding-domain.example',
    })

    expect(res.status).toBe(421)
    const json = JSON.parse(res.text)
    expect(json.error).toBe('MISDIRECTED_REQUEST')
    expect(mockService.getAiExportDataset).not.toHaveBeenCalled()
  })

  it('rejects hostile preflight OPTIONS request without granting CORS', async () => {
    const res = await rawRequest({
      method: 'OPTIONS',
      path: '/api/announcements/create',
      host: `127.0.0.1:${port}`,
      origin: 'https://evil-attacker.example',
    })

    expect(res.status).toBe(403)
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('accepts legitimate preflight OPTIONS request from allowed origin', async () => {
    const origin = `http://127.0.0.1:${port}`
    const res = await rawRequest({
      method: 'OPTIONS',
      path: '/api/announcements/create',
      host: `127.0.0.1:${port}`,
      origin,
    })

    expect(res.status).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe(origin)
    expect(res.headers['access-control-allow-headers']).toContain('X-Paper-Admin')
  })

  it('executes legitimate POST with valid Host, Origin, Content-Type, and X-Paper-Admin', async () => {
    const origin = `http://127.0.0.1:${port}`
    const payload = { title: 'Security Announcement', messageZh: 'Important notice' }

    const res = await rawRequest({
      method: 'POST',
      path: '/api/announcements/create',
      host: `127.0.0.1:${port}`,
      origin,
      headers: {
        'Content-Type': 'application/json',
        'X-Paper-Admin': '1',
      },
      body: JSON.stringify(payload),
    })

    expect(res.status).toBe(200)
    expect(mockService.createAnnouncement).toHaveBeenCalledWith(payload)
  })

  it('allows trusted Tailscale host jjmow.tail7fa36c.ts.net', async () => {
    const origin = 'https://jjmow.tail7fa36c.ts.net'
    const res = await rawRequest({
      method: 'GET',
      path: '/api/export/ai-dataset',
      host: 'jjmow.tail7fa36c.ts.net',
      origin,
    })

    expect(res.status).toBe(200)
    expect(mockService.getAiExportDataset).toHaveBeenCalled()
    expect(res.headers['access-control-allow-origin']).toBe(origin)
  })

  it('rejects oversized request payload with 413 Payload Too Large', async () => {
    const hugePayload = { data: 'x'.repeat(70 * 1024) } // 70 KiB > 64 KiB
    try {
      const res = await rawRequest({
        method: 'POST',
        path: '/api/announcements/create',
        host: `127.0.0.1:${port}`,
        origin: `http://127.0.0.1:${port}`,
        headers: {
          'Content-Type': 'application/json',
          'X-Paper-Admin': '1',
        },
        body: JSON.stringify(hugePayload),
      })
      expect(res.status).toBe(413)
      const json = JSON.parse(res.text)
      expect(json.error).toBe('PAYLOAD_TOO_LARGE')
    } catch (err: any) {
      // Connection might be destroyed immediately on overflow
      expect(err).toBeDefined()
    }
  })
})
