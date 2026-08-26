import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'
import { getCheckoutPlan, getPaddleApiBaseUrl, validateFoundingDiscount } from '../_shared/paddle-plans.ts'

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
  const monthlyPriceId = Deno.env.get('PADDLE_STANDARD_PRICE_ID')
  const annualPriceId = Deno.env.get('PADDLE_ANNUAL_PRICE_ID')
  const foundingDiscountId = Deno.env.get('PADDLE_FOUNDING_DISCOUNT_ID')
  const requiredTermsVersion = Deno.env.get('REQUIRED_TERMS_VERSION')

  let paddleApiBaseUrl: string
  try {
    paddleApiBaseUrl = getPaddleApiBaseUrl(Deno.env.get('PADDLE_API_BASE_URL'))
  } catch {
    paddleApiBaseUrl = ''
  }

  if (!authHeader?.startsWith('Bearer ')) return jsonResponse(401, { error: 'authentication_required' })
  if (!supabaseUrl || !serviceRoleKey || !paddleApiKey || !paddleApiBaseUrl || !monthlyPriceId || !annualPriceId || !foundingDiscountId || !requiredTermsVersion) {
    console.error('Paddle checkout server configuration is incomplete')
    return jsonResponse(503, { error: 'server_not_configured' })
  }

  const termsEffectiveAt = Deno.env.get('TERMS_EFFECTIVE_AT') || '2026-08-29T00:00:00+08:00'
  if (Date.now() < new Date(termsEffectiveAt).getTime()) {
    return jsonResponse(403, {
      error: 'terms_not_yet_effective',
      message: '新版服務條款仍在三日審閱期間，2026 年 8 月 29 日生效後才會重新開放付款。',
    })
  }

  try {
    const token = authHeader.slice('Bearer '.length)
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) return jsonResponse(401, { error: 'invalid_session' })

    const body = await request.json() as { child_id?: unknown; plan?: unknown }
    if (typeof body.child_id !== 'string') return jsonResponse(400, { error: 'child_id_required' })
    let plan
    try {
      plan = getCheckoutPlan(body.plan, { monthly: monthlyPriceId, annual: annualPriceId })
    } catch {
      return jsonResponse(400, { error: 'invalid_plan' })
    }

    const { data: eligibility, error: eligibilityError } = await supabase
      .rpc('prepare_paddle_checkout_v2', {
        p_user_id: user.id,
        p_child_id: body.child_id,
        p_plan_code: plan.planCode,
        p_required_terms_version: requiredTermsVersion,
      })
      .single()
    if (eligibilityError) throw eligibilityError

    const foundingApplies = eligibility.founding_applies === true
    const foundingClaimId = typeof eligibility.founding_claim_id === 'string'
      ? eligibility.founding_claim_id
      : null
    const existingTransactionId = typeof eligibility.founding_transaction_id === 'string'
      ? eligibility.founding_transaction_id
      : null

    async function releaseUnboundClaim() {
      if (!foundingClaimId || existingTransactionId) return
      const { error } = await supabase.rpc('release_founder_checkout_claim', {
        p_claim_id: foundingClaimId,
        p_transaction_id: null,
        p_release_reason: 'not_created',
      })
      if (error) console.error('Unable to release unbound Founder claim', error.message)
    }

    if (foundingApplies) {
      const discountResponse = await fetch(`${paddleApiBaseUrl}/discounts/${foundingDiscountId}`, {
        headers: { authorization: `Bearer ${paddleApiKey}` },
      })
      const discountBody = await discountResponse.json()
      if (!discountResponse.ok) {
        console.error('Paddle founding discount lookup failed', discountResponse.status, discountBody)
        await releaseUnboundClaim()
        return jsonResponse(503, { error: 'paddle_discount_not_verifiable' })
      }
      try {
        validateFoundingDiscount(discountBody?.data, monthlyPriceId)
      } catch (error) {
        console.error('Paddle founding discount is misconfigured', errorMessage(error))
        await releaseUnboundClaim()
        return jsonResponse(503, { error: 'paddle_discount_misconfigured' })
      }
    }

    if (foundingApplies && existingTransactionId) {
      const existingResponse = await fetch(`${paddleApiBaseUrl}/transactions/${existingTransactionId}`, {
        headers: { authorization: `Bearer ${paddleApiKey}` },
      })
      const existingBody = await existingResponse.json()
      const transaction = existingBody?.data
      if (!existingResponse.ok || !['draft', 'ready'].includes(transaction?.status)
        || transaction?.discount_id !== foundingDiscountId) {
        console.error('Existing Founder transaction is not safely reusable', existingResponse.status, transaction?.status)
        return jsonResponse(409, { error: 'founder_checkout_reconciliation_required' })
      }
      return jsonResponse(200, {
        transaction_id: existingTransactionId,
        plan: plan.key,
        billing_interval: plan.billingInterval,
        price_twd: plan.priceTwd,
        founding_applies: true,
        checkout_price_twd: 349,
      })
    }

    const paddleResponse = await fetch(`${paddleApiBaseUrl}/transactions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${paddleApiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ price_id: plan.priceId, quantity: 1 }],
        collection_mode: 'automatic',
        custom_data: {
          child_id: body.child_id,
          parent_id: user.id,
          plan: plan.key,
          ...(foundingClaimId ? { founder_claim_id: foundingClaimId } : {}),
        },
        ...(foundingApplies ? { discount_id: foundingDiscountId } : {}),
      }),
    })
    const paddleBody = await paddleResponse.json()
    if (!paddleResponse.ok) {
      console.error('Paddle transaction creation failed', paddleResponse.status, paddleBody)
      await releaseUnboundClaim()
      if (paddleBody?.error?.code === 'transaction_default_checkout_url_not_set') {
        return jsonResponse(503, { error: 'paddle_checkout_url_missing' })
      }
      if (paddleResponse.status === 403 && paddleBody?.error?.code === 'forbidden') {
        return jsonResponse(503, { error: 'paddle_api_key_forbidden' })
      }
      return jsonResponse(502, { error: 'paddle_transaction_failed' })
    }

    const transactionId = paddleBody?.data?.id
    if (foundingClaimId) {
      if (typeof transactionId !== 'string') {
        console.error('Paddle returned a Founder transaction without an id')
        return jsonResponse(502, { error: 'paddle_transaction_failed' })
      }
      const { error: bindError } = await supabase.rpc('bind_founder_checkout_transaction', {
        p_user_id: user.id,
        p_child_id: body.child_id,
        p_claim_id: foundingClaimId,
        p_transaction_id: transactionId,
      })
      if (bindError) {
        console.error('Founder transaction binding failed', bindError.message)
        const neutralizeResponse = await fetch(`${paddleApiBaseUrl}/transactions/${transactionId}`, {
          method: 'PATCH',
          headers: {
            authorization: `Bearer ${paddleApiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ discount_id: null }),
        })
        if (neutralizeResponse.ok) {
          const neutralizeBody = await neutralizeResponse.json()
          if (neutralizeBody?.data?.discount_id !== foundingDiscountId) {
            await supabase.rpc('release_founder_checkout_claim', {
              p_claim_id: foundingClaimId,
              p_transaction_id: transactionId,
              p_release_reason: 'discount_removed',
            })
          }
        }
        return jsonResponse(503, { error: 'founder_checkout_binding_failed' })
      }
    }

    return jsonResponse(200, {
      transaction_id: transactionId,
      plan: plan.key,
      billing_interval: plan.billingInterval,
      price_twd: plan.priceTwd,
      founding_applies: foundingApplies,
      checkout_price_twd: foundingApplies ? 349 : plan.priceTwd,
    })
  } catch (error) {
    console.error('Paddle checkout preparation failed', errorMessage(error))
    if (errorMessage(error).includes('Current Terms acceptance is required')) {
      return jsonResponse(409, { error: 'legal_acceptance_required' })
    }
    return jsonResponse(400, { error: 'checkout_not_available' })
  }
})
