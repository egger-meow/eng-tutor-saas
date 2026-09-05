import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'
import { dispatchWeek1PublishDoorbells } from '../_shared/week1-fast-dispatch.ts'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
}

export const PINNED_ONLINE_MANUAL_WORKER_ID = 'chatgpt-online-manual'
export const PINNED_SCHEDULED_WORKER_ID = 'chatgpt-work-daily'
export const PINNED_WEEK1_FAST_WORKER_ID = 'chatgpt-week1-fast'

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

  if (data?.claimed_by === PINNED_WEEK1_FAST_WORKER_ID) return PINNED_WEEK1_FAST_WORKER_ID
  if (data?.claimed_by === PINNED_SCHEDULED_WORKER_ID) return PINNED_SCHEDULED_WORKER_ID
  return PINNED_ONLINE_MANUAL_WORKER_ID
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const bridgeSecret = Deno.env.get('AUTHORING_BRIDGE_SECRET')

  if (!supabaseUrl || !serviceRoleKey || !bridgeSecret) {
    return json(503, {
      error: 'server_not_configured',
      message: 'Authoring bridge secret or database service configuration is missing.',
    })
  }

  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!token) {
    return json(401, { error: 'unauthorized', message: 'Missing Authorization Bearer header.' })
  }
  if (token === serviceRoleKey) {
    return json(401, { error: 'unauthorized', message: 'Service role key is forbidden as external incoming credential.' })
  }
  if (token !== bridgeSecret) {
    return json(401, { error: 'unauthorized', message: 'Invalid authoring bridge authorization token.' })
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const url = new URL(request.url)
  const path = url.pathname.replace(/^\/(?:functions\/v1\/)?authoring-bridge/, '').replace(/\/$/, '')

  try {
    // Normal production authoring start remains unchanged.
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

    // Week 1 Fast Lane has a separate, pinned, Week-1-only claim boundary.
    if (request.method === 'POST' && path === '/week1/start') {
      const { data, error } = await client.rpc('worker_start_week1_fast_batch', {
        worker_id: PINNED_WEEK1_FAST_WORKER_ID,
      })
      if (error) {
        const isConflict = error.message?.includes('ACTIVE_AUTHORING_LEASE_CONFLICT') ?? false
        return json(isConflict ? 409 : 500, {
          error: isConflict ? 'lease_conflict' : 'database_error',
          message: error.message,
        })
      }
      return json(200, data ?? { claimed: [], claimedCount: 0 })
    }

    if (request.method === 'GET' && path === '/week1/batch') {
      const { data, error } = await client.rpc('worker_recover_week1_fast_batch', {
        worker_id: PINNED_WEEK1_FAST_WORKER_ID,
      })
      if (error) return json(500, { error: error.message })
      return json(200, data ?? { claimed: [], claimedCount: 0 })
    }

    if (request.method === 'GET' && (path === '/batch' || path === '')) {
      let { data, error } = await client.rpc('worker_recover_active_authoring_batch', {
        worker_id: PINNED_ONLINE_MANUAL_WORKER_ID,
      })
      if (!error && (!data || data.claimedCount === 0)) {
        const scheduled = await client.rpc('worker_recover_active_authoring_batch', {
          worker_id: PINNED_SCHEDULED_WORKER_ID,
        })
        if (!scheduled.error && scheduled.data && scheduled.data.claimedCount > 0) data = scheduled.data
      }
      if (error) return json(500, { error: error.message })
      return json(200, data ?? { claimed: [], claimedCount: 0 })
    }

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
        return json(400, { error: 'missing_fields', message: 'jobId and package are required' })
      }

      const workerId = await resolveJobWorkerId(client, jobId)
      const payloadText = typeof rawPackage === 'string' ? rawPackage : JSON.stringify(rawPackage)
      const { data, error } = await client.rpc('worker_submit_local_curriculum_package', {
        p_job_id: jobId,
        p_generation_worker_id: workerId,
        p_payload_text: payloadText,
      })
      if (error) return json(500, { error: error.message })

      // Submission durability is authoritative. GitHub dispatch is best-effort and never changes
      // submit success; the DB outbox remains available for retry if this immediate doorbell fails.
      if (workerId === PINNED_WEEK1_FAST_WORKER_ID) {
        const githubToken = Deno.env.get('GITHUB_WEEK1_TOKEN')
        const wakePrNumber = Deno.env.get('GITHUB_WEEK1_WAKE_PR_NUMBER')
        if (githubToken && wakePrNumber) {
          try {
            await dispatchWeek1PublishDoorbells(client, {
              token: githubToken,
              repo: Deno.env.get('GITHUB_WEEK1_REPO') ?? 'egger-meow/eng-tutor-saas',
              wakePrNumber,
            })
          } catch {
            console.warn('[week1-fast] immediate publish doorbell failed; outbox retained')
          }
        }
      }
      return json(200, data)
    }

    if (request.method === 'GET' && path === '/status') {
      const jobId = url.searchParams.get('job_id') ?? url.searchParams.get('jobId')
      if (!jobId) return json(400, { error: 'missing_parameter', message: 'job_id is required' })
      const workerId = await resolveJobWorkerId(client, jobId)
      const { data, error } = await client.rpc('worker_local_curriculum_submission_status', {
        job_id: jobId,
        worker_id: workerId,
      })
      if (error) return json(500, { error: error.message })
      return json(200, data)
    }

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
      if (!jobId) return json(400, { error: 'missing_parameter', message: 'jobId is required' })
      const errorCode = body.errorCode ?? body.error_code ?? 'SUBMIT_TRANSPORT_FAILED'
      const errorMessage = body.errorMessage ?? body.error_message ?? 'Unsubmitted claim released via authoring bridge'
      const workerId = await resolveJobWorkerId(client, jobId)
      const { data, error } = await client.rpc('worker_release_local_unsubmitted_claim', {
        job_id: jobId,
        worker_id: workerId,
        error_code: errorCode,
        error_message: errorMessage,
      })
      if (error) return json(500, { error: error.message })
      return json(200, data)
    }

    return json(404, { error: 'not_found', path })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return json(500, { error: message })
  }
})
