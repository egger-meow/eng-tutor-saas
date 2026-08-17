import type { Plugin } from 'vite'
import { AdminService } from './admin-service.js'
import { handleApiRequest } from './api-handler.js'

export function adminApiPlugin(): Plugin {
  let service: AdminService

  return {
    name: 'admin-api-plugin',
    configureServer(server) {
      service = new AdminService()

      server.middlewares.use(async (req, res, next) => {
        try {
          const handled = await handleApiRequest(req, res, service)
          if (!handled) {
            next()
          }
        } catch (err) {
          next(err)
        }
      })
    },
  }
}
