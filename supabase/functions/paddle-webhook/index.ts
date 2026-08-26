import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'
import { getWebhookFoundingDiscount, getWebhookPlan, type PaddleSubscriptionDiscount, type PaddleSubscriptionItem } from '../_shared/paddle-plans.ts'

const SIGNATURE_TOLERANCE_SECONDS = 300
const SUBSCRIPTION_EVENTS = new Set([
  'subscription.created',
  'subscription.activated',
  'subscription.trialing',
  'subscription.updated',
  'subscription.past_due',
  'subscription.canceled',
  'subscription.paused',
  'subscription.resumed',
])

type PaddleEvent = {
  event_id?: string
  event_type?: string
  occurred_at?: string
  data?: {
    id?: string
    customer_id?: string
    status?: string
    custom_data?: Record<string, unknown> | null
    items?: PaddleSubscriptionItem[]
    current_billing_period?: { starts_at?: string; ends_at?: string } | null
    scheduled_change?: { action?: string } | null
    discount?: PaddleSubscriptionDiscount | null
  }
}

const encoder = new TextEncoder()

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function parseSignature(header: string) {
  const values = new Map<string, string[]>()
  for (const part of header.split(';')) {
    const [key, value] = part.split('=', 2)
    if (!key || !value) continue
    values.set(key, [...(values.get(key) ?? []), value])
  }
  return { timestamp: values.get('ts')?.[0], signatures: values.get('h1') ?? [] }
}

async function verifySignature(rawBody: string, header: string, secret: string) {
  const { timestamp, signatures } = parseSignature(header)
  if (!timestamp || signatures.length === 0 || !/^\d+$/.test(timestamp)) return false

  const age = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (age > SIGNATURE_TOLERANCE_SECONDS) return false

  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
  )
  const payload = encoder.encode(`${timestamp}:${rawBody}`)

  for (const signature of signatures) {
    if (!/^[0-9a-f]{64}$/i.test(signature)) continue
    const bytes = new Uint8Array(signature.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)))
    if (await crypto.subtle.verify('HMAC', key, bytes, payload)) return true
  }
  return false
}

function mapStatus(status: string | undefined) {
  if (status === 'trialing' || status === 'active' || status === 'past_due' || status === 'paused' || status === 'canceled') return status
  throw new Error(`Unsupported Paddle subscription status: ${status ?? 'missing'}`)
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' })

  const webhookSecret = Deno.env.get('PADDLE_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const monthlyPriceId = Deno.env.get('PADDLE_STANDARD_PRICE_ID')
  const annualPriceId = Deno.env.get('PADDLE_ANNUAL_PRICE_ID')
  const foundingDiscountId = Deno.env.get('PADDLE_FOUNDING_DISCOUNT_ID')
  if (!webhookSecret || !supabaseUrl || !serviceRoleKey || !monthlyPriceId || !annualPriceId || !foundingDiscountId) {
    console.error('Paddle webhook server configuration is incomplete')
    return jsonResponse(503, { error: 'server_not_configured' })
  }

  const signature = request.headers.get('paddle-signature')
  const rawBody = await request.text()
  if (!signature || !(await verifySignature(rawBody, signature, webhookSecret))) {
    return jsonResponse(401, { error: 'invalid_signature' })
  }

  let event: PaddleEvent
  try {
    event = JSON.parse(rawBody)
  } catch {
    return jsonResponse(400, { error: 'invalid_json' })
  }

  if (!event.event_id || !event.event_type || !event.occurred_at) {
    return jsonResponse(400, { error: 'invalid_event' })
  }
  if (!SUBSCRIPTION_EVENTS.has(event.event_type)) {
    return jsonResponse(200, { received: true, ignored: true })
  }

  try {
    const subscription = event.data
    const childId = subscription?.custom_data?.child_id
    if (typeof childId !== 'string') throw new Error('Missing custom_data.child_id')
    const plan = getWebhookPlan(subscription?.items, { monthly: monthlyPriceId, annual: annualPriceId })
    const foundingDiscount = getWebhookFoundingDiscount(subscription?.discount)

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.rpc('process_paddle_subscription_event', {
      p_event_id: event.event_id,
      p_event_type: event.event_type,
      p_occurred_at: event.occurred_at,
      p_child_id: childId,
      p_provider_subscription_id: subscription?.id,
      p_provider_customer_id: subscription?.customer_id,
      p_status: mapStatus(subscription?.status),
      p_plan_code: plan.planCode,
      p_billing_interval: plan.billingInterval,
      p_price_twd: plan.priceTwd,
      p_current_period_start: subscription?.current_billing_period?.starts_at ?? null,
      p_current_period_end: subscription?.current_billing_period?.ends_at ?? null,
      p_cancel_at_period_end: subscription?.scheduled_change?.action === 'cancel',
      p_expected_founding_discount_id: foundingDiscountId,
      p_discount_id: foundingDiscount.id,
      p_discount_status: foundingDiscount.status,
      p_discount_type: foundingDiscount.type,
      p_discount_ends_at: foundingDiscount.endsAt,
      p_discount_ends_at_present: foundingDiscount.endsAtPresent,
    })
    if (error) throw error

    return jsonResponse(200, { received: true, result: data?.[0] ?? null })
  } catch (error) {
    console.error('Paddle webhook processing failed', error instanceof Error ? error.message : error)
    return jsonResponse(500, { error: 'processing_failed' })
  }
})
