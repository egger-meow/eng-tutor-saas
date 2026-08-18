import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { WorkerClient } from './pipeline.js'

function loadRootEnv() {
  const possiblePaths = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
    resolve(process.cwd(), '../.env'),
  ]
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, 'utf-8')
        for (const line of content.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue
          const eqIdx = trimmed.indexOf('=')
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim()
            const val = trimmed.slice(eqIdx + 1).trim()
            if (!process.env[key]) process.env[key] = val
          }
        }
        break
      } catch {}
    }
  }
}

export function createWorkerClient(): WorkerClient {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    loadRootEnv()
  }
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
