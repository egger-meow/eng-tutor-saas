import type { Plugin } from 'vite'
import { LandingFunnelAdminService } from './landing-funnel-admin-service.js'
import { handleApiRequest } from './api-handler.js'

export function adminApiPlugin(): Plugin {
  let service: LandingFunnelAdminService

  return {
    name: 'admin-api-plugin',
    configureServer(server) {
      service = new LandingFunnelAdminService()

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
