import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'
import { getFounderClaimNeutralizationAction, getPaddleApiBaseUrl } from '../_shared/paddle-plans.ts'

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' })
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const paddleApiKey = Deno.env.get('PADDLE_API_KEY')
  let paddleApiBaseUrl: string
  try {
    paddleApiBaseUrl = getPaddleApiBaseUrl(Deno.env.get('PADDLE_API_BASE_URL'))
  } catch {
    return jsonResponse(503, { error: 'server_not_configured' })
  }
  const foundingDiscountId = Deno.env.get('PADDLE_FOUNDING_DISCOUNT_ID')
  if (!supabaseUrl || !serviceRoleKey || !paddleApiKey || !foundingDiscountId) {
    return jsonResponse(503, { error: 'server_not_configured' })
  }
  if (request.headers.get('authorization') !== `Bearer ${serviceRoleKey}`) {
    return jsonResponse(401, { error: 'authentication_required' })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: claims, error } = await supabase.rpc('claim_expired_founder_checkouts', { p_limit: 20 })
  if (error) {
    console.error('Unable to claim expired Founder checkouts', error.message)
    return jsonResponse(500, { error: 'claim_failed' })
  }

  let released = 0
  let retained = 0
  for (const claim of claims ?? []) {
    const transactionId = claim.paddle_transaction_id
    if (typeof transactionId !== 'string') continue
    try {
      const getResponse = await fetch(`${paddleApiBaseUrl}/transactions/${transactionId}`, {
        headers: { authorization: `Bearer ${paddleApiKey}` },
      })
      const getBody = await getResponse.json()
      if (!getResponse.ok) throw new Error(`Paddle GET failed: ${getResponse.status}`)
      const transaction = getBody?.data
      const action = getFounderClaimNeutralizationAction(
        transaction?.status,
        transaction?.discount_id,
        foundingDiscountId,
      )

      let releaseReason: 'discount_removed' | 'transaction_canceled' | null = null
      if (action === 'remove_discount') {
        const response = await fetch(`${paddleApiBaseUrl}/transactions/${transactionId}`, {
          method: 'PATCH',
          headers: {
            authorization: `Bearer ${paddleApiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ discount_id: null }),
        })
        const body = await response.json()
        if (response.ok && body?.data?.discount_id !== foundingDiscountId) releaseReason = 'discount_removed'
      } else if (action === 'cancel') {
        const response = await fetch(`${paddleApiBaseUrl}/transactions/${transactionId}`, {
          method: 'PATCH',
          headers: {
            authorization: `Bearer ${paddleApiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ status: 'canceled' }),
        })
        const body = await response.json()
        if (response.ok && body?.data?.status === 'canceled') releaseReason = 'transaction_canceled'
      } else if (action === 'release_canceled') {
        releaseReason = 'transaction_canceled'
      }

      if (releaseReason) {
        const { error: releaseError } = await supabase.rpc('release_founder_checkout_claim', {
          p_claim_id: claim.claim_id,
          p_transaction_id: transactionId,
          p_release_reason: releaseReason,
        })
        if (releaseError) throw releaseError
        released += 1
      } else {
        retained += 1
      }
    } catch (claimError) {
      retained += 1
      console.error('Founder checkout claim retained after cleanup failure', transactionId, claimError)
    }
  }

  // Also reconcile expired capacity checkouts
  const { data: capClaims } = await supabase.rpc('claim_expired_capacity_checkouts', { p_limit: 20 })
  for (const capClaim of capClaims ?? []) {
    const transactionId = capClaim.paddle_transaction_id
    if (typeof transactionId !== 'string') continue
    try {
      const getResponse = await fetch(`${paddleApiBaseUrl}/transactions/${transactionId}`, {
        headers: { authorization: `Bearer ${paddleApiKey}` },
      })
      const getBody = await getResponse.json()
      if (!getResponse.ok) throw new Error(`Paddle GET failed: ${getResponse.status}`)
      const transaction = getBody?.data
      if (transaction?.status === 'canceled') {
        await supabase.rpc('release_capacity_checkout_claim', {
          p_claim_id: capClaim.claim_id,
          p_transaction_id: transactionId,
          p_release_reason: 'transaction_canceled',
        })
      } else if (['draft', 'ready'].includes(transaction?.status)) {
        const cancelResponse = await fetch(`${paddleApiBaseUrl}/transactions/${transactionId}`, {
          method: 'PATCH',
          headers: {
            authorization: `Bearer ${paddleApiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ status: 'canceled' }),
        })
        const cancelBody = await cancelResponse.json()
        if (cancelResponse.ok && cancelBody?.data?.status === 'canceled') {
          await supabase.rpc('release_capacity_checkout_claim', {
            p_claim_id: capClaim.claim_id,
            p_transaction_id: transactionId,
            p_release_reason: 'transaction_canceled',
          })
        }
      }
    } catch (capError) {
      console.error('Capacity checkout claim retained after cleanup failure', transactionId, capError)
    }
  }

  return jsonResponse(200, { examined: claims?.length ?? 0, released, retained })
})
