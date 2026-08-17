import type { IncomingMessage, ServerResponse } from 'node:http'
import { parse } from 'node:url'
import { AdminService } from './admin-service.js'

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  service: AdminService,
): Promise<boolean> {
  const parsedUrl = parse(req.url || '/', true)
  const pathname = parsedUrl.pathname || '/'

  if (!pathname.startsWith('/api/')) {
    return false
  }

  res.setHeader('Content-Type', 'application/json')
  
  const origin = req.headers.origin
  const allowedLoopbackOrigins = [
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]

  if (origin && allowedLoopbackOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return true
  }

  try {
    // 1. Action POST endpoints
    if (pathname === '/api/jobs/grant-retry') {
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method Not Allowed' }))
        return true
      }

      const body = await readRequestBody(req)
      let parsed: any = {}
      try {
        parsed = body ? JSON.parse(body) : {}
      } catch {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'INVALID_JSON', message: 'Malformed JSON payload' }))
        return true
      }

      const jobId = parsed?.jobId
      if (!jobId || typeof jobId !== 'string') {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'INVALID_JOB_ID', message: 'jobId is required' }))
        return true
      }

      const result = await service.grantJobRetry(jobId)
      res.statusCode = result.success ? 200 : 400
      res.end(JSON.stringify(result))
      return true
    }

    if (pathname === '/api/test-mode/enable') {
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method Not Allowed' }))
        return true
      }
      const body = await readRequestBody(req)
      let parsed: any = {}
      try {
        parsed = body ? JSON.parse(body) : {}
      } catch {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'INVALID_JSON', message: 'Malformed JSON payload' }))
        return true
      }

      const childId = parsed?.childId
      const targetWeek = typeof parsed?.targetWeek === 'number' ? parsed.targetWeek : 9
      if (!childId || typeof childId !== 'string') {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'INVALID_CHILD_ID', message: 'childId is required' }))
        return true
      }

      const result = await service.setTestMode(childId, true, targetWeek)
      res.statusCode = result.success ? 200 : 400
      res.end(JSON.stringify(result))
      return true
    }

    if (pathname === '/api/test-mode/disable') {
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method Not Allowed' }))
        return true
      }
      const body = await readRequestBody(req)
      let parsed: any = {}
      try {
        parsed = body ? JSON.parse(body) : {}
      } catch {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'INVALID_JSON', message: 'Malformed JSON payload' }))
        return true
      }

      const childId = parsed?.childId
      const force = Boolean(parsed?.force)
      if (!childId || typeof childId !== 'string') {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'INVALID_CHILD_ID', message: 'childId is required' }))
        return true
      }

      const result = await service.setTestMode(childId, false, undefined, force)
      res.statusCode = result.success ? 200 : 400
      res.end(JSON.stringify(result))
      return true
    }

    if (pathname === '/api/test-mode/advance') {
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method Not Allowed' }))
        return true
      }
      const body = await readRequestBody(req)
      let parsed: any = {}
      try {
        parsed = body ? JSON.parse(body) : {}
      } catch {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'INVALID_JSON', message: 'Malformed JSON payload' }))
        return true
      }

      const childId = parsed?.childId
      if (!childId || typeof childId !== 'string') {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'INVALID_CHILD_ID', message: 'childId is required' }))
        return true
      }

      const result = await service.advanceTestWeek(childId)
      res.statusCode = result.success ? 200 : 400
      res.end(JSON.stringify(result))
      return true
    }

    if (pathname === '/api/test-mode/feedback') {
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method Not Allowed' }))
        return true
      }
      const body = await readRequestBody(req)
      let parsed: any = {}
      try {
        parsed = body ? JSON.parse(body) : {}
      } catch {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'INVALID_JSON', message: 'Malformed JSON payload' }))
        return true
      }

      const childId = parsed?.childId
      const materialId = parsed?.materialId
      if (!childId || !materialId) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'INVALID_PARAMETERS', message: 'childId and materialId are required' }))
        return true
      }

      const result = await service.recordTestFeedback(parsed)
      res.statusCode = result.success ? 200 : 400
      res.end(JSON.stringify(result))
      return true
    }

    if (pathname === '/api/test-mode/reset') {
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method Not Allowed' }))
        return true
      }
      const body = await readRequestBody(req)
      let parsed: any = {}
      try {
        parsed = body ? JSON.parse(body) : {}
      } catch {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'INVALID_JSON', message: 'Malformed JSON payload' }))
        return true
      }

      const childId = parsed?.childId
      if (!childId || typeof childId !== 'string') {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'INVALID_CHILD_ID', message: 'childId is required' }))
        return true
      }

      const result = await service.resetTestChildToOnboarding(childId)
      res.statusCode = result.success ? 200 : 400
      res.end(JSON.stringify(result))
      return true
    }

    // 2. Read GET endpoints
    if (req.method !== 'GET') {
      res.statusCode = 405
      res.end(JSON.stringify({ error: 'Method Not Allowed' }))
      return true
    }

    switch (pathname) {
      case '/api/test-mode/status': {
        const childId = typeof parsedUrl.query.childId === 'string' ? parsedUrl.query.childId : ''
        const data = await service.getTestModeStatus(childId)
        res.statusCode = data.success ? 200 : 400
        res.end(JSON.stringify(data))
        return true
      }

      case '/api/test-mode/pdf-url': {
        const childId = typeof parsedUrl.query.childId === 'string' ? parsedUrl.query.childId : ''
        const materialId = typeof parsedUrl.query.materialId === 'string' ? parsedUrl.query.materialId : ''
        const pdfType = parsedUrl.query.type === 'parent' ? 'parent' : 'student'
        const data = await service.getTestPdfSignedUrl(childId, materialId, pdfType)
        res.statusCode = data.success ? 200 : 400
        res.end(JSON.stringify(data))
        return true
      }
      case '/api/health': {
        res.statusCode = 200
        res.end(JSON.stringify({
          status: 'ok',
          connected: service.getIsConnected(),
          timestamp: new Date().toISOString(),
        }))
        return true
      }

      case '/api/operations/overview': {
        const data = await service.getOperationsOverview()
        res.statusCode = 200
        res.end(JSON.stringify(data))
        return true
      }

      case '/api/intelligence/failures': {
        const data = await service.getFailureIntelligence()
        res.statusCode = 200
        res.end(JSON.stringify(data))
        return true
      }

      case '/api/intelligence/feedback': {
        const data = await service.getFeedbackIntelligence()
        res.statusCode = 200
        res.end(JSON.stringify(data))
        return true
      }

      case '/api/intelligence/product-feedback': {
        const data = await service.getProductFeedbackIntelligence()
        res.statusCode = 200
        res.end(JSON.stringify(data))
        return true
      }

      case '/api/timeline': {
        const childId = typeof parsedUrl.query.childId === 'string' ? parsedUrl.query.childId : undefined
        const week = typeof parsedUrl.query.week === 'string' ? parsedUrl.query.week : undefined
        const data = await service.getChildWeekTimeline(childId, week)
        res.statusCode = 200
        res.end(JSON.stringify(data))
        return true
      }

      case '/api/export/ai-dataset': {
        const data = await service.getAiExportDataset()
        res.statusCode = 200
        res.end(JSON.stringify(data, null, 2))
        return true
      }

      default: {
        res.statusCode = 404
        res.end(JSON.stringify({ error: `Unknown endpoint: ${pathname}` }))
        return true
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    res.statusCode = 500
    res.end(JSON.stringify({ error: 'Internal Server Error', message }))
    return true
  }
}
