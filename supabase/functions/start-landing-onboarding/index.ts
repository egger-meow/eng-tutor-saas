import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'
import { startLandingOnboarding } from '../_shared/landing-onboarding-start.ts'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
}

const allowedRedirectOrigins = [
  'https://paperbond.jjmowlab.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  })
}

function requiredString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') throw new Error(`invalid_${field}`)
  const clean = value.trim()
  if (!clean || clean.length > maxLength) throw new Error(`invalid_${field}`)
  return clean
}

function optionalString(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === '') return null
  return requiredString(value, field, maxLength)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return json(503, { error: 'server_not_configured' })

  try {
    const body = await request.json() as Record<string, unknown>
    const draft = body.draft
    if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
      return json(400, { error: 'invalid_request' })
    }

    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const result = await startLandingOnboarding({
      email: requiredString(body.email, 'email', 320),
      draft: draft as Record<string, unknown>,
      termsVersion: requiredString(body.termsVersion, 'terms_version', 100),
      privacyVersion: requiredString(body.privacyVersion, 'privacy_version', 100),
      anonymousId: requiredString(body.anonymousId, 'anonymous_id', 64),
      sessionId: optionalString(body.sessionId, 'session_id', 64),
      redirectOrigin: requiredString(body.redirectOrigin, 'redirect_origin', 512),
    }, {
      allowedRedirectOrigins,
      prepare: async (input) => {
        const { data, error } = await client.rpc('prepare_landing_onboarding', {
          p_email: input.email,
          p_draft: input.draft,
          p_terms_version: input.termsVersion,
          p_privacy_version: input.privacyVersion,
          p_anonymous_id: input.anonymousId,
          p_session_id: input.sessionId,
        })
        if (error) throw error
        if (typeof data !== 'string' || !data.trim()) throw new Error('prepare_failed')
        return data
      },
      sendMagicLink: async ({ email, redirectTo }) => {
        const { error } = await client.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo,
            shouldCreateUser: true,
          },
        })
        if (error) throw error
      },
      activate: async (token) => {
        const { data, error } = await client.rpc('activate_landing_onboarding', { p_token: token })
        if (error) throw error
        return data
      },
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    })

    return json(200, result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const clientError = message.startsWith('invalid_') || message.includes('Invalid ')
    if (!clientError) console.error('Landing onboarding start failed')
    return json(clientError ? 400 : 503, { error: clientError ? 'invalid_request' : 'temporarily_unavailable' })
  }
})
