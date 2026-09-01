import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const bridgeSecret = Deno.env.get('AUTHORING_BRIDGE_SECRET')

  if (!supabaseUrl || !serviceRoleKey) {
    return json(503, { error: 'server_not_configured' })
  }

  // Authorize via Bearer token: either dedicated AUTHORING_BRIDGE_SECRET or serviceRoleKey
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  const isAuthorized = Boolean(
    (bridgeSecret && token === bridgeSecret) ||
    (serviceRoleKey && token === serviceRoleKey)
  )

  if (!isAuthorized) {
    return json(401, {
      error: 'unauthorized',
      message: 'Invalid or missing authoring bridge authorization token',
    })
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const url = new URL(request.url)
  // Strip functions prefix if present
  const path = url.pathname.replace(/^\/(?:functions\/v1\/)?authoring-bridge/, '').replace(/\/$/, '')

  try {
    // 1. Recover Batch: GET /batch?worker_id=...
    if (request.method === 'GET' && (path === '/batch' || path === '')) {
      const workerId = url.searchParams.get('worker_id') ?? url.searchParams.get('workerId')
      if (!workerId) {
        return json(400, { error: 'missing_parameter', message: 'worker_id is required' })
      }
      const { data, error } = await client.rpc('worker_recover_active_authoring_batch', {
        p_generation_worker_id: workerId,
      })
      if (error) {
        return json(500, { error: error.message })
      }
      return json(200, data ?? { claimed: [] })
    }

    // 2. Submit Package: POST /submit
    if (request.method === 'POST' && (path === '/submit' || path === '')) {
      const body = (await request.json()) as {
        jobId?: string
        job_id?: string
        workerId?: string
        worker_id?: string
        package?: unknown
        curriculumPackage?: unknown
        payload?: unknown
      }
      const jobId = body.jobId ?? body.job_id
      const workerId = body.workerId ?? body.worker_id
      const rawPackage = body.package ?? body.curriculumPackage ?? body.payload

      if (!jobId || !workerId || !rawPackage) {
        return json(400, {
          error: 'missing_fields',
          message: 'jobId, workerId, and package are required',
        })
      }

      const payloadText = typeof rawPackage === 'string' ? rawPackage : JSON.stringify(rawPackage)
      const { data, error } = await client.rpc('worker_submit_local_curriculum_package', {
        p_job_id: jobId,
        p_generation_worker_id: workerId,
        p_payload_text: payloadText,
      })

      if (error) {
        return json(500, { error: error.message })
      }
      return json(200, data)
    }

    // 3. Get Status: GET /status?job_id=...&worker_id=...
    if (request.method === 'GET' && path === '/status') {
      const jobId = url.searchParams.get('job_id') ?? url.searchParams.get('jobId')
      const workerId = url.searchParams.get('worker_id') ?? url.searchParams.get('workerId')
      if (!jobId || !workerId) {
        return json(400, { error: 'missing_parameters', message: 'job_id and worker_id are required' })
      }
      const { data, error } = await client.rpc('worker_local_curriculum_submission_status', {
        job_id: jobId,
        worker_id: workerId,
      })
      if (error) {
        return json(500, { error: error.message })
      }
      return json(200, data)
    }

    return json(404, { error: 'not_found', path })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return json(500, { error: message })
  }
})
