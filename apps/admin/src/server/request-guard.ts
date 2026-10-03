import type { IncomingMessage, ServerResponse } from 'node:http'

export const MAX_BODY_BYTES = 64 * 1024 // 64 KiB

export class PayloadTooLargeError extends Error {
  constructor(message = 'Payload Too Large') {
    super(message)
    this.name = 'PayloadTooLargeError'
  }
}

const DEFAULT_ALLOWED_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

export function parseAllowedHosts(): Set<string> {
  const allowed = new Set(DEFAULT_ALLOWED_HOSTNAMES)
  const envHosts = process.env.ADMIN_ALLOWED_HOSTS
  if (envHosts) {
    for (const h of envHosts.split(',')) {
      const trimmed = h.trim().toLowerCase()
      if (trimmed) allowed.add(trimmed)
    }
  }
  // Default trusted Tailscale host from vite.config.ts if configured
  allowed.add('jjmow.tail7fa36c.ts.net')
  return allowed
}

export function extractHostname(hostHeader: string | undefined): string | null {
  if (!hostHeader) return null
  const trimmed = hostHeader.trim().toLowerCase()
  if (trimmed.startsWith('[')) {
    const closeBracket = trimmed.indexOf(']')
    if (closeBracket !== -1) {
      return trimmed.slice(0, closeBracket + 1)
    }
  }
  const colonIdx = trimmed.indexOf(':')
  if (colonIdx !== -1) {
    return trimmed.slice(0, colonIdx)
  }
  return trimmed
}

export function isAllowedOrigin(originHeader: string | undefined, allowedHosts: Set<string>, hostHeader?: string): boolean {
  if (!originHeader) return false
  try {
    const parsed = new URL(originHeader)
    const hostname = parsed.hostname.toLowerCase()
    return ['http:', 'https:'].includes(parsed.protocol) && allowedHosts.has(hostname)
      && (!hostHeader || parsed.host.toLowerCase() === hostHeader.toLowerCase())
  } catch {
    return false
  }
}

export function validateAdminApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  allowedHosts = parseAllowedHosts(),
): boolean {
  // 1. Host header validation (DNS rebinding protection)
  const host = req.headers.host
  const hostname = extractHostname(host)
  if (!hostname || !allowedHosts.has(hostname)) {
    res.statusCode = 421
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      error: 'MISDIRECTED_REQUEST',
      message: `Invalid or disallowed Host: ${host ?? 'missing'}`,
    }))
    return false
  }

  // 2. Origin validation & CORS response headers
  const origin = req.headers.origin
  if (origin) {
    if (!isAllowedOrigin(origin, allowedHosts, host)) {
      res.statusCode = 403
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        error: 'FORBIDDEN_ORIGIN',
        message: `Untrusted Origin: ${origin}`,
      }))
      return false
    }
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Paper-Admin')
  }

  // 3. Preflight OPTIONS handling
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return false // Handled preflight completely
  }

  // 4. POST state-mutation protections
  if (req.method === 'POST') {
    // Content-Type enforcement (reject text/plain, multipart, urlencoded)
    const contentType = req.headers['content-type']
    if (!contentType || !/^application\/json(;.*)?$/i.test(contentType.trim())) {
      res.statusCode = 415
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        error: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Content-Type must be application/json',
      }))
      return false
    }

    // Custom header enforcement (cannot be sent by cross-origin simple requests)
    const adminHeader = req.headers['x-paper-admin']
    if (adminHeader !== '1') {
      res.statusCode = 403
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        error: 'FORBIDDEN_REQUEST',
        message: 'Missing or invalid X-Paper-Admin header',
      }))
      return false
    }
  }

  return true
}

export function readRequestBody(req: IncomingMessage, maxBytes = MAX_BODY_BYTES): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    let bytesReceived = 0

    const onData = (chunk: Buffer | string) => {
      bytesReceived += typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length
      if (bytesReceived > maxBytes) {
        req.removeListener('data', onData)
        // Drain without accumulating; destroying the socket prevents the caller receiving 413.
        req.resume()
        reject(new PayloadTooLargeError(`Request payload exceeds maximum allowed size of ${maxBytes} bytes`))
        return
      }
      body += chunk
    }

    req.on('data', onData)
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

export async function readJsonBody<T = any>(
  req: IncomingMessage,
  res: ServerResponse,
  maxBytes = MAX_BODY_BYTES,
): Promise<{ ok: true; data: T } | { ok: false }> {
  try {
    const raw = await readRequestBody(req, maxBytes)
    const data = raw ? JSON.parse(raw) : {}
    return { ok: true, data }
  } catch (err) {
    if (err instanceof PayloadTooLargeError) {
      res.statusCode = 413
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'PAYLOAD_TOO_LARGE', message: err.message }))
      return { ok: false }
    }
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'INVALID_JSON', message: 'Malformed JSON payload' }))
    return { ok: false }
  }
}
