import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'
import {
  dispatchWeek1PublishDoorbells,
  dispatchWeek1WakeDoorbells,
  type Week1GitHubConfig,
} from '../_shared/week1-fast-dispatch.ts'

const jsonHeaders = {
  'content-type': 'application/json',
  'cache-control': 'no-store',
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders })
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const dispatchSecret = Deno.env.get('WEEK1_DISPATCH_SECRET')
  const githubToken = Deno.env.get('GITHUB_WEEK1_TOKEN')
  const githubRepo = Deno.env.get('GITHUB_WEEK1_REPO') ?? 'egger-meow/eng-tutor-saas'
  const wakePrNumber = Deno.env.get('GITHUB_WEEK1_WAKE_PR_NUMBER')

  if (!supabaseUrl || !serviceRoleKey || !dispatchSecret || !githubToken || !wakePrNumber) {
    return json(503, { error: 'server_not_configured' })
  }

  const auth = request.headers.get('authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/iu, '').trim()
  if (!token || token === serviceRoleKey || token !== dispatchSecret) {
    return json(401, { error: 'unauthorized' })
  }

  let mode: 'wake' | 'publish' | 'all' = 'all'
  try {
    const body = await request.json().catch(() => ({})) as { mode?: unknown }
    if (body.mode === 'wake' || body.mode === 'publish' || body.mode === 'all') mode = body.mode
    else if (body.mode !== undefined) return json(400, { error: 'invalid_mode' })
  } catch {
    return json(400, { error: 'invalid_request' })
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const config: Week1GitHubConfig = { token: githubToken, repo: githubRepo, wakePrNumber }

  try {
    const wake = mode === 'publish'
      ? { attempted: 0, sent: 0, failed: 0 }
      : await dispatchWeek1WakeDoorbells(client, config)
    const publish = mode === 'wake'
      ? { attempted: 0, sent: 0, failed: 0 }
      : await dispatchWeek1PublishDoorbells(client, config)
    return json(200, { wake, publish })
  } catch {
    console.error('[week1-fast] dispatch batch failed')
    return json(503, { error: 'temporarily_unavailable' })
  }
})
