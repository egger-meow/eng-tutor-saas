import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const corsHeaders = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type' }
function jsonResponse(status: number, body: Record<string, unknown>) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } }) }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' })
  const authHeader = request.headers.get('authorization')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const paddleApiKey = Deno.env.get('PADDLE_API_KEY')
  const paddleApiBaseUrl = Deno.env.get('PADDLE_API_BASE_URL')
  if (!authHeader?.startsWith('Bearer ')) return jsonResponse(401, { error: 'authentication_required' })
  if (!supabaseUrl || !serviceRoleKey || !paddleApiKey || !paddleApiBaseUrl) return jsonResponse(503, { error: 'server_not_configured' })
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.slice('Bearer '.length))
    if (userError || !user) return jsonResponse(401, { error: 'invalid_session' })
    const body = await request.json() as { child_id?: unknown; reason?: unknown }
    if (typeof body.child_id !== 'string') return jsonResponse(400, { error: 'child_id_required' })
    if (body.reason !== undefined && body.reason !== null && typeof body.reason !== 'string') return jsonResponse(400, { error: 'invalid_reason' })
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) || null : null
    const { data: child, error: childError } = await supabase.from('children').select('id').eq('id', body.child_id).eq('parent_id', user.id).eq('is_active', true).maybeSingle()
    if (childError) throw childError
    if (!child) return jsonResponse(404, { error: 'child_not_found' })
    const { data: subscription, error: subscriptionError } = await supabase.from('subscriptions').select('id, provider, provider_subscription_id, status, current_period_end, cancel_at_period_end').eq('child_id', body.child_id).maybeSingle()
    if (subscriptionError) throw subscriptionError
    if (subscription.cancel_at_period_end) return jsonResponse(200, { cancel_at_period_end: true, current_period_end: subscription.current_period_end, reconciliation_pending: false })
    const paddleResponse = await fetch(`${paddleApiBaseUrl}/subscriptions/${subscription.provider_subscription_id}/cancel`, { method: 'POST', headers: { authorization: `Bearer ${paddleApiKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ effective_from: 'next_billing_period' }) })
    const paddleBody = await paddleResponse.json()
    if (!paddleResponse.ok) { console.error('Paddle subscription cancellation failed', paddleResponse.status, paddleBody); return jsonResponse(502, { error: 'paddle_cancellation_failed' }) }
    const { error: updateError } = await supabase.from('subscriptions').update({ cancel_at_period_end: true, cancellation_reason: reason }).eq('id', subscription.id)
    if (updateError) {
      console.warn('Local database update failed after Paddle cancel succeeded. Webhook will reconcile state.', updateError)
    }
    return jsonResponse(200, {
      cancel_at_period_end: true,
      current_period_end: subscription.current_period_end,
      paddle_status: paddleBody?.data?.status ?? null,
      reconciliation_pending: Boolean(updateError),
    })
  } catch (error) { console.error('Paddle subscription cancellation failed', error instanceof Error ? error.message : error); return jsonResponse(400, { error: 'cancellation_not_available' }) }
})
