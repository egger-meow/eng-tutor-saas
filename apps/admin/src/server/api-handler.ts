import type { IncomingMessage, ServerResponse } from 'node:http'
import { parse } from 'node:url'
import { AdminService } from './admin-service.js'

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

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return true
  }

  if (req.method !== 'GET') {
    res.statusCode = 405
    res.end(JSON.stringify({ error: 'Method Not Allowed' }))
    return true
  }

  try {
    switch (pathname) {
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
