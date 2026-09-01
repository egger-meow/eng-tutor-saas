import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
}

export const PINNED_ONLINE_MANUAL_WORKER_ID = 'chatgpt-online-manual'
export const PINNED_SCHEDULED_WORKER_ID = 'chatgpt-work-daily'

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

async function resolveJobWorkerId(
  client: ReturnType<typeof createClient>,
  jobId: string
): Promise<string> {
  const { data } = await client
    .from('generation_jobs')
    .select('claimed_by')
    .eq('id', jobId)
    .maybeSingle()

  if (data?.claimed_by === PINNED_SCHEDULED_WORKER_ID) {
    return PINNED_SCHEDULED_WORKER_ID
  }
  return PINNED_ONLINE_MANUAL_WORKER_ID
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const bridgeSecret = Deno.env.get('AUTHORING_BRIDGE_SECRET')

  // Requirement 2: If AUTHORING_BRIDGE_SECRET is absent, fail closed with 503
  if (!supabaseUrl || !serviceRoleKey || !bridgeSecret) {
    return json(503, {
      error: 'server_not_configured',
      message: 'Authoring bridge secret or database service configuration is missing.',
    })
  }

  // Requirement 2: SUPABASE_SERVICE_ROLE_KEY must NEVER be accepted as an incoming Bearer credential.
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!token) {
    return json(401, {
      error: 'unauthorized',
      message: 'Missing Authorization Bearer header.',
    })
  }

  if (token === serviceRoleKey) {
    return json(401, {
      error: 'unauthorized',
      message: 'Service role key is forbidden as external incoming credential.',
    })
  }

  if (token !== bridgeSecret) {
    return json(401, {
      error: 'unauthorized',
      message: 'Invalid authoring bridge authorization token.',
    })
  }

  // Service role is used strictly internally within the Edge Function
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/(?:functions\/v1\/)?authoring-bridge/, '').replace(/\/$/, '')

  try {
    // 1. Start Authoring Batch: POST /start
    // Requirement 1-3: Shared transaction-scoped advisory lock serializes start across all executors.
    // Atomically verifies zero conflicting active authoring leases,
    // then performs exactly one authoritative production batch claim under pinned online manual identity.
    if (request.method === 'POST' && path === '/start') {
      const { data, error } = await client.rpc('worker_start_authoring_batch', {
        worker_id: PINNED_ONLINE_MANUAL_WORKER_ID,
      })
      if (error) {
        const isConflict =
          error.message?.includes('ACTIVE_AUTHORING_LEASE_CONFLICT') ||
          error.message?.includes('CONFLICT')
        return json(isConflict ? 409 : 500, {
          error: isConflict ? 'lease_conflict' : 'database_error',
          message: error.message,
        })
      }
      return json(200, data ?? { claimed: [], claimedCount: 0 })
    }

    // 2. Recover Active Batch: GET /batch
    // Recovers an already-claimed active batch without triggering a new claim.
    if (request.method === 'GET' && (path === '/batch' || path === '')) {
      let { data, error } = await client.rpc('worker_recover_active_authoring_batch', {
        worker_id: PINNED_ONLINE_MANUAL_WORKER_ID,
      })
      if (!error && (!data || data.claimedCount === 0)) {
        const scheduled = await client.rpc('worker_recover_active_authoring_batch', {
          worker_id: PINNED_SCHEDULED_WORKER_ID,
        })
        if (!scheduled.error && scheduled.data && scheduled.data.claimedCount > 0) {
          data = scheduled.data
        }
      }
      if (error) {
        return json(500, { error: error.message })
      }
      return json(200, data ?? { claimed: [], claimedCount: 0 })
    }

    // 3. Submit Package: POST /submit
    // Worker identity is pinned server-side to the reviewed online author identities.
    if (request.method === 'POST' && path === '/submit') {
      const body = (await request.json()) as {
        jobId?: string
        job_id?: string
        package?: unknown
        curriculumPackage?: unknown
        payload?: unknown
      }
      const jobId = body.jobId ?? body.job_id
      const rawPackage = body.package ?? body.curriculumPackage ?? body.payload

      if (!jobId || !rawPackage) {
        return json(400, {
          error: 'missing_fields',
          message: 'jobId and package are required',
        })
      }

      const workerId = await resolveJobWorkerId(client, jobId)
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

    // 4. Get Status: GET /status?job_id=...
    if (request.method === 'GET' && path === '/status') {
      const jobId = url.searchParams.get('job_id') ?? url.searchParams.get('jobId')
      if (!jobId) {
        return json(400, { error: 'missing_parameter', message: 'job_id is required' })
      }
      const workerId = await resolveJobWorkerId(client, jobId)
      const { data, error } = await client.rpc('worker_local_curriculum_submission_status', {
        job_id: jobId,
        worker_id: workerId,
      })
      if (error) {
        return json(500, { error: error.message })
      }
      return json(200, data)
    }

    // 5. Release Unsubmitted Claim: POST /release
    // Narrow release operation that verifies no submission exists before releasing
    if (request.method === 'POST' && path === '/release') {
      const body = (await request.json()) as {
        jobId?: string
        job_id?: string
        errorCode?: string
        error_code?: string
        errorMessage?: string
        error_message?: string
      }
      const jobId = body.jobId ?? body.job_id
      if (!jobId) {
        return json(400, { error: 'missing_parameter', message: 'jobId is required' })
      }

      const errorCode = body.errorCode ?? body.error_code ?? 'SUBMIT_TRANSPORT_FAILED'
      const errorMessage =
        body.errorMessage ?? body.error_message ?? 'Unsubmitted claim released via authoring bridge'
      const workerId = await resolveJobWorkerId(client, jobId)

      const { data, error } = await client.rpc('worker_release_local_unsubmitted_claim', {
        job_id: jobId,
        worker_id: workerId,
        error_code: errorCode,
        error_message: errorMessage,
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
