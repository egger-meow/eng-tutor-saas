import { createClient } from '@supabase/supabase-js'
import type { WorkerClient } from './pipeline.js'

export function createWorkerClient(): WorkerClient {
  const url = process.env.SUPABASE_URL?.trim()
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim()
  if (!url || !secretKey) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required')
  if (secretKey.startsWith('sb_publishable_')) throw new Error('SUPABASE_SECRET_KEY must be a server-only secret key')

  const client = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return {
    rpc: async (name, params) => client.rpc(name, params),
    storage: {
      from: (bucket) => {
        const storage = client.storage.from(bucket)
        return {
          upload: async (path, body, options) => storage.upload(path, body, options),
          download: async (path) => storage.download(path),
          remove: async (paths) => storage.remove(paths),
        }
      },
    },
  }
}
