import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const allowedOrigins = new Set([
  'https://paperbond.jjmowlab.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

function cors(origin: string | null) {
  return {
    'access-control-allow-origin': origin && allowedOrigins.has(origin) ? origin : 'https://paperbond.jjmowlab.com',
    'access-control-allow-headers': 'content-type, x-client-info, apikey',
    'access-control-allow-methods': 'POST, OPTIONS',
    'content-type': 'application/json',
    'cache-control': 'no-store',
    vary: 'origin',
  }
}

function json(status: number, body: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: cors(origin) })
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin')
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) })
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)
  if (origin && !allowedOrigins.has(origin)) return json(403, { error: 'forbidden_origin' }, origin)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return json(503, { error: 'temporarily_unavailable' }, origin)

  try {
    const body = await request.json() as { token?: unknown }
    if (typeof body.token !== 'string' || !/^[0-9a-f]{64}$/u.test(body.token)) {
      return json(404, { error: 'progress_not_found' }, origin)
    }

    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await client.rpc('worker_read_week1_progress_token', { p_token: body.token })
    if (error || !data || typeof data !== 'object') {
      return json(404, { error: 'progress_not_found' }, origin)
    }

    const stage = (data as Record<string, unknown>).stage
    const stageUpdatedAt = (data as Record<string, unknown>).stageUpdatedAt
    const ready = (data as Record<string, unknown>).ready
    if (!['received', 'queued', 'authoring', 'publishing', 'ready'].includes(String(stage))) {
      return json(404, { error: 'progress_not_found' }, origin)
    }

    return json(200, {
      stage,
      stageUpdatedAt: typeof stageUpdatedAt === 'string' ? stageUpdatedAt : null,
      ready: ready === true,
    }, origin)
  } catch {
    return json(404, { error: 'progress_not_found' }, origin)
  }
})
