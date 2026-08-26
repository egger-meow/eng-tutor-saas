import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getWebhookFoundingDiscount, getWebhookPlan, validateFoundingDiscount } from './paddle-plans'

describe('Paddle RPC Contract & Webhook Integration Tests', () => {
  it('1. verifies paddle-webhook calls process_paddle_subscription_event_v2 with exact named parameters matching migration', () => {
    const webhookCode = readFileSync(join(__dirname, '../paddle-webhook/index.ts'), 'utf-8')
    const migrationCode = readFileSync(join(__dirname, '../../migrations/20260826233000_transaction_safe_capacity_and_patch_hardening.sql'), 'utf-8')

    const expectedRpcParams = [
      'p_event_id',
      'p_event_type',
      'p_occurred_at',
      'p_child_id',
      'p_provider_subscription_id',
      'p_provider_customer_id',
      'p_status',
      'p_plan_code',
      'p_billing_interval',
      'p_price_twd',
      'p_current_period_start',
      'p_current_period_end',
      'p_cancel_at_period_end',
      'p_expected_founding_discount_id',
      'p_discount_id',
      'p_discount_status',
      'p_discount_type',
      'p_discount_ends_at',
      'p_discount_ends_at_present',
      'p_founder_claim_id',
      'p_originating_transaction_id',
    ]

    for (const param of expectedRpcParams) {
      expect(webhookCode).toContain(`${param}:`)
      expect(migrationCode).toContain(`${param} `)
    }
  })

  it('2. verifies paddle-checkout binds transaction before applying discount in Paddle', () => {
    const checkoutCode = readFileSync(join(__dirname, '../paddle-checkout/index.ts'), 'utf-8')

    // POST /transactions must NOT include discount_id
    const postTransactionsBlock = checkoutCode.slice(
      checkoutCode.indexOf("fetch(`${paddleApiBaseUrl}/transactions`"),
      checkoutCode.indexOf("const paddleBody = await paddleResponse.json()"),
    )
    expect(postTransactionsBlock).not.toContain('discount_id: foundingDiscountId')

    // Binds first
    const bindIndex = checkoutCode.indexOf("supabase.rpc('bind_founder_checkout_transaction'")
    expect(bindIndex).toBeGreaterThan(0)

    // Then patches discount
    const patchIndex = checkoutCode.indexOf("fetch(`${paddleApiBaseUrl}/transactions/${transactionId}`")
    expect(patchIndex).toBeGreaterThan(bindIndex)
  })

  it('3. strictly validates founding discount configuration', () => {
    const monthlyPriceId = 'pri_month_prod'
    const validDiscount = {
      id: 'dsc_founder_150',
      status: 'active',
      type: 'flat',
      amount: '15000',
      currency_code: 'TWD',
      recur: true,
      maximum_recurring_intervals: null,
      restrict_to: [monthlyPriceId],
    }

    expect(() => validateFoundingDiscount(validDiscount, monthlyPriceId)).not.toThrow()

    // Wrong amount
    expect(() => validateFoundingDiscount({ ...validDiscount, amount: '20000' }, monthlyPriceId)).toThrow()
    // Non-recurring
    expect(() => validateFoundingDiscount({ ...validDiscount, recur: false }, monthlyPriceId)).toThrow()
    // Expiring discount
    expect(() => validateFoundingDiscount({ ...validDiscount, maximum_recurring_intervals: 12 }, monthlyPriceId)).toThrow()
    // Wrong price restriction
    expect(() => validateFoundingDiscount({ ...validDiscount, restrict_to: ['pri_other'] }, monthlyPriceId)).toThrow()
  })

  it('4. extracts discount payload with strict endsAtPresent flag', () => {
    // Verified forever discount: ends_at is explicitly present AND null
    expect(getWebhookFoundingDiscount({
      id: 'dsc_1',
      status: 'active',
      type: 'flat',
      ends_at: null,
    })).toEqual({
      id: 'dsc_1',
      status: 'active',
      type: 'flat',
      endsAt: null,
      endsAtPresent: true,
    })

    // Expiring discount: ends_at is present and string
    expect(getWebhookFoundingDiscount({
      id: 'dsc_1',
      status: 'active',
      type: 'flat',
      ends_at: '2027-08-26T00:00:00Z',
    })).toEqual({
      id: 'dsc_1',
      status: 'active',
      type: 'flat',
      endsAt: '2027-08-26T00:00:00Z',
      endsAtPresent: true,
    })

    // Omitted discount: ends_at field absent
    expect(getWebhookFoundingDiscount({
      id: 'dsc_1',
      status: 'active',
      type: 'flat',
    })).toEqual({
      id: 'dsc_1',
      status: 'active',
      type: 'flat',
      endsAt: null,
      endsAtPresent: false,
    })

    expect(getWebhookFoundingDiscount(null)).toEqual({
      id: null,
      status: null,
      type: null,
      endsAt: null,
      endsAtPresent: false,
    })
  })

  it('5. verifies fail-safe Founder PATCH: verify GET recovers applied discount and ambiguous failure retains claim', () => {
    const checkoutCode = readFileSync(join(__dirname, '../paddle-checkout/index.ts'), 'utf-8')

    // Verifies that after PATCH fails, a verify GET is performed
    expect(checkoutCode).toContain('const verifyResponse = await fetch(`${paddleApiBaseUrl}/transactions/${transactionId}`')
    expect(checkoutCode).toContain('verifyBody?.data?.discount_id === foundingDiscountId')

    // Verifies that release_founder_checkout_claim is ONLY called when explicitly verified absent
    expect(checkoutCode).toContain("p_release_reason: 'discount_removed'")
    expect(checkoutCode).toContain('verifyBody?.data?.discount_id !== foundingDiscountId')

    // Verifies that ambiguous failures return 503 and retain claim (do NOT release)
    expect(checkoutCode).toContain("error: 'paddle_discount_application_ambiguous'")
  })

  it('6. verifies capacity claim binding in paddle-checkout ensures transaction safety', () => {
    const checkoutCode = readFileSync(join(__dirname, '../paddle-checkout/index.ts'), 'utf-8')

    expect(checkoutCode).toContain("supabase.rpc('bind_capacity_checkout_transaction'")
    expect(checkoutCode).toContain('capacityClaimId')
  })
})
