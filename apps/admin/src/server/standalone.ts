import { createServer } from 'node:http'
import { AdminService } from './admin-service.js'
import { handleApiRequest } from './api-handler.js'

const PORT = parseInt(process.env.ADMIN_PORT || process.env.PORT || '3001', 10)
const service = new AdminService()

const server = createServer(async (req, res) => {
  const handled = await handleApiRequest(req, res, service)
  if (!handled) {
    res.statusCode = 404
    res.setHeader('Content-Type', 'text/plain')
    res.end('Not Found')
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`紙屬英文 Admin Console Backend running on http://127.0.0.1:${PORT}`)
  console.log(`Database: ${service.getIsConnected() ? 'Connected to Supabase' : 'Supabase Disconnected (Set SUPABASE_SECRET_KEY in .env)'}`)
})
