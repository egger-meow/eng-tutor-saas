import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' })

  const authHeader = request.headers.get('authorization')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const paddleApiKey = Deno.env.get('PADDLE_API_KEY')
  const priceId = Deno.env.get('PADDLE_STANDARD_PRICE_ID')
  const foundingDiscountId = Deno.env.get('PADDLE_FOUNDING_DISCOUNT_ID')

  if (!authHeader?.startsWith('Bearer ')) return jsonResponse(401, { error: 'authentication_required' })
  if (!supabaseUrl || !serviceRoleKey || !paddleApiKey || !priceId || !foundingDiscountId) {
    console.error('Paddle checkout server configuration is incomplete')
    return jsonResponse(503, { error: 'server_not_configured' })
  }

  try {
    const token = authHeader.slice('Bearer '.length)
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) return jsonResponse(401, { error: 'invalid_session' })

    const body = await request.json() as { child_id?: unknown }
    if (typeof body.child_id !== 'string') return jsonResponse(400, { error: 'child_id_required' })

    const { data: eligibility, error: eligibilityError } = await supabase
      .rpc('prepare_paddle_checkout', { p_user_id: user.id, p_child_id: body.child_id })
      .single()
    if (eligibilityError) throw eligibilityError

    const foundingApplies = eligibility.founding_applies === true
    const paddleResponse = await fetch('https://sandbox-api.paddle.com/transactions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${paddleApiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        collection_mode: 'automatic',
        custom_data: { child_id: body.child_id, parent_id: user.id },
        ...(foundingApplies ? { discount_id: foundingDiscountId } : {}),
      }),
    })
    const paddleBody = await paddleResponse.json()
    if (!paddleResponse.ok) {
      console.error('Paddle transaction creation failed', paddleResponse.status, paddleBody)
      if (paddleBody?.error?.code === 'transaction_default_checkout_url_not_set') {
        return jsonResponse(503, { error: 'paddle_checkout_url_missing' })
      }
      return jsonResponse(502, { error: 'paddle_transaction_failed' })
    }

    return jsonResponse(200, {
      transaction_id: paddleBody?.data?.id,
      founding_applies: foundingApplies,
      first_month_price_twd: foundingApplies ? 299 : 499,
    })
  } catch (error) {
    console.error('Paddle checkout preparation failed', errorMessage(error))
    return jsonResponse(400, { error: 'checkout_not_available' })
  }
})
