import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getWebhookFoundingDiscount, getWebhookPlan, validateFoundingDiscount } from './paddle-plans'

describe('Paddle RPC Contract & Webhook Integration Tests', () => {
  it('1. verifies paddle-webhook calls process_paddle_subscription_event_v2 with exact named parameters matching migration', () => {
    const webhookCode = readFileSync(join(__dirname, '../paddle-webhook/index.ts'), 'utf-8')
    const migrationCode = readFileSync(join(__dirname, '../../migrations/20260827133000_restore_capacity_claim_authority_and_keep_discount_fix.sql'), 'utf-8')

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
    const patchIndex = checkoutCode.indexOf("discount_id: foundingDiscountId")
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

  it('7. verifies capacity claim retention on Founder bind failure unless Paddle cancellation is confirmed', () => {
    const checkoutCode = readFileSync(join(__dirname, '../paddle-checkout/index.ts'), 'utf-8')

    // Verifies capacityBound flag tracks bound state
    expect(checkoutCode).toContain('let capacityBound = false')
    expect(checkoutCode).toContain('capacityBound = true')

    // Verifies releaseUnboundClaims skips bound capacity claims
    expect(checkoutCode).toContain('!capacityBound')

    // Verifies that after founder bind failure, release_capacity_checkout_claim requires canceled status and transactionId
    expect(checkoutCode).toContain("cancelBody?.data?.status === 'canceled'")
    expect(checkoutCode).toContain("p_transaction_id: transactionId")
    expect(checkoutCode).toContain("p_release_reason: 'transaction_canceled'")
  })

  it('8. verifies capacity claim retention on capacity bind failure unless Paddle cancellation is confirmed', () => {
    const checkoutCode = readFileSync(join(__dirname, '../paddle-checkout/index.ts'), 'utf-8')

    // On capacity bind failure, attempts cancellation and only releases if transactionCanceled is true
    expect(checkoutCode).toContain('if (capBindError)')
    expect(checkoutCode).toContain("body: JSON.stringify({ status: 'canceled' })")
    expect(checkoutCode).toContain('if (transactionCanceled)')
    expect(checkoutCode).toContain('await releaseUnboundClaims()')
  })

  it('9. verifies paddle-checkout does not contain terms effective waiting gate', () => {
    const checkoutCode = readFileSync(join(__dirname, '../paddle-checkout/index.ts'), 'utf-8')

    expect(checkoutCode).not.toContain('TERMS_EFFECTIVE_AT')
    expect(checkoutCode).not.toContain('terms_not_yet_effective')
    expect(checkoutCode).not.toContain('三日審閱期間')
  })

  it('10. verifies paddle-checkout passes REQUIRED_TERMS_VERSION to prepare_paddle_checkout_v2 and handles legal error', () => {
    const checkoutCode = readFileSync(join(__dirname, '../paddle-checkout/index.ts'), 'utf-8')

    expect(checkoutCode).toContain('p_required_terms_version: requiredTermsVersion')
    expect(checkoutCode).toContain("errorMessage(error).includes('Current Terms acceptance is required')")
    expect(checkoutCode).toContain("error: 'legal_acceptance_required'")
  })

  it('11. verifies process_paddle_subscription_event_v2 ACL migration revokes browser execution and grants only to service_role', () => {
    const aclMigrationCode = readFileSync(
      join(__dirname, '../../migrations/20260827150000_lock_paddle_subscription_event_v2_acl.sql'),
      'utf-8',
    )

    expect(aclMigrationCode).toContain('revoke all on function public.process_paddle_subscription_event_v2(')
    expect(aclMigrationCode).toContain('from public, anon, authenticated;')
    expect(aclMigrationCode).toContain('grant execute on function public.process_paddle_subscription_event_v2(')
    expect(aclMigrationCode).toContain('to service_role;')
  })
})

describe('Paddle Webhook Authority & Regression Contract Tests (6 Scenarios)', () => {
  const migrationCode = readFileSync(join(__dirname, '../../migrations/20260827133000_restore_capacity_claim_authority_and_keep_discount_fix.sql'), 'utf-8')

  // Exact JavaScript simulation function of process_paddle_subscription_event_v2_base
  function evaluateWebhookEvent(params: {
    eventType: string
    status: 'trialing' | 'active' | 'past_due' | 'paused' | 'canceled'
    planCode: 'standard_monthly' | 'standard_annual'
    cancelAtPeriodEnd: boolean
    expectedDiscountId: string
    discountId: string | null
    discountStatus?: string | null
    discountType?: string | null
    discountEndsAt?: string | null
    discountEndsAtPresent?: boolean
    founderClaim?: { id: string; childId: string; status: string; paddleTransactionId: string | null } | null
    capacityClaim?: { id: string; childId: string; status: string; paddleTransactionId: string | null } | null
    originatingTransactionId: string | null
    existingSubscription?: { id?: string; provider?: string; status?: string; foundingStatus?: string; currentPeriodEnd?: string } | null
    waitlistStatus?: string | null
  }) {
    // 1. Capacity claim authority check
    const isExpiredBeta = params.existingSubscription?.provider === 'beta'
      && params.existingSubscription.currentPeriodEnd
      && new Date(params.existingSubscription.currentPeriodEnd).getTime() <= Date.now()
    const needsCapacityClaim = ['trialing', 'active'].includes(params.status)
      && params.waitlistStatus !== 'released'
      && (!params.existingSubscription?.id || isExpiredBeta)

    if (needsCapacityClaim) {
      if (!params.originatingTransactionId) {
        throw new Error('Paddle subscription activation for expired-beta child requires originating transaction ID')
      }
      if (!params.capacityClaim
        || params.capacityClaim.status !== 'bound'
        || params.capacityClaim.paddleTransactionId !== params.originatingTransactionId) {
        throw new Error(`No matching bound capacity claim found for transaction ${params.originatingTransactionId}`)
      }
    }

    // 2. Founder discount validation (v2 schema: no required status/type from webhook, requires expected ID and no ends_at)
    const founderDiscountValid = Boolean(
      params.expectedDiscountId
      && params.discountId
      && params.discountId === params.expectedDiscountId
      && (params.discountStatus ? params.discountStatus === 'active' : true)
      && (params.discountType ? params.discountType === 'flat' : true)
      && (!params.discountEndsAtPresent || params.discountEndsAt === null)
      && params.discountEndsAt === null
    )

    let nextFoundingStatus = params.existingSubscription?.foundingStatus ?? 'none'

    if (['none', 'eligible', 'expired'].includes(nextFoundingStatus)
      && params.planCode === 'standard_monthly'
      && ['trialing', 'active'].includes(params.status)) {
      if (params.eventType === 'subscription.created'
        && params.founderClaim
        && params.founderClaim.status === 'bound'
        && params.founderClaim.paddleTransactionId
        && params.originatingTransactionId
        && params.founderClaim.paddleTransactionId === params.originatingTransactionId
        && founderDiscountValid) {
        nextFoundingStatus = 'redeemed'
      }
    } else if (nextFoundingStatus === 'redeemed' && ['trialing', 'active', 'past_due', 'paused'].includes(params.status)) {
      if (!founderDiscountValid) {
        throw new Error('Founder billing integrity failure: expected discount is missing or mismatched')
      }
    } else if (nextFoundingStatus === 'redeemed' && params.status === 'canceled') {
      nextFoundingStatus = 'forfeited'
    }

    return {
      status: params.status,
      foundingStatus: nextFoundingStatus,
      capacityClaimCompleted: needsCapacityClaim ? Boolean(params.capacityClaim) : false,
      seatConsumed: ['redeemed', 'forfeited'].includes(nextFoundingStatus),
    }
  }

  it('1. Founder valid + exact capacity txn -> PASS', () => {
    // Migration SQL check: verifies matching capacity claim check exists
    expect(migrationCode).toContain('v_matching_capacity_claim')
    expect(migrationCode).toContain('paddle_transaction_id = p_originating_transaction_id')

    const result = evaluateWebhookEvent({
      eventType: 'subscription.created',
      status: 'active',
      planCode: 'standard_monthly',
      cancelAtPeriodEnd: false,
      expectedDiscountId: 'dsc_founder_expected',
      discountId: 'dsc_founder_expected',
      discountEndsAt: null,
      discountEndsAtPresent: true,
      founderClaim: { id: 'claim-1', childId: 'child-1', status: 'bound', paddleTransactionId: 'txn-100' },
      capacityClaim: { id: 'cap-1', childId: 'child-1', status: 'bound', paddleTransactionId: 'txn-100' },
      originatingTransactionId: 'txn-100',
      existingSubscription: { id: 'sub-1', provider: 'beta', status: 'trialing', currentPeriodEnd: '2026-08-01T00:00:00Z', foundingStatus: 'none' },
    })

    expect(result.foundingStatus).toBe('redeemed')
    expect(result.capacityClaimCompleted).toBe(true)
    expect(result.seatConsumed).toBe(true)
  })

  it('2. Founder valid + wrong capacity txn -> FAIL', () => {
    expect(() => evaluateWebhookEvent({
      eventType: 'subscription.created',
      status: 'active',
      planCode: 'standard_monthly',
      cancelAtPeriodEnd: false,
      expectedDiscountId: 'dsc_founder_expected',
      discountId: 'dsc_founder_expected',
      discountEndsAt: null,
      discountEndsAtPresent: true,
      founderClaim: { id: 'claim-1', childId: 'child-1', status: 'bound', paddleTransactionId: 'txn-100' },
      capacityClaim: { id: 'cap-1', childId: 'child-1', status: 'bound', paddleTransactionId: 'txn-100' },
      originatingTransactionId: 'txn-WRONG',
      existingSubscription: { id: 'sub-1', provider: 'beta', status: 'trialing', currentPeriodEnd: '2026-08-01T00:00:00Z', foundingStatus: 'none' },
    })).toThrow('No matching bound capacity claim found')
  })

  it('3. Founder valid + no capacity claim when required -> FAIL', () => {
    expect(() => evaluateWebhookEvent({
      eventType: 'subscription.created',
      status: 'active',
      planCode: 'standard_monthly',
      cancelAtPeriodEnd: false,
      expectedDiscountId: 'dsc_founder_expected',
      discountId: 'dsc_founder_expected',
      discountEndsAt: null,
      discountEndsAtPresent: true,
      founderClaim: { id: 'claim-1', childId: 'child-1', status: 'bound', paddleTransactionId: 'txn-100' },
      capacityClaim: null,
      originatingTransactionId: 'txn-100',
      existingSubscription: { id: 'sub-1', provider: 'beta', status: 'trialing', currentPeriodEnd: '2026-08-01T00:00:00Z', foundingStatus: 'none' },
    })).toThrow('No matching bound capacity claim found')
  })

  it('4. Founder discount schema v2 -> PASS (works without status/type payload in webhook)', () => {
    // Verifies that when Paddle webhook payload only delivers { id, starts_at, ends_at: null }
    // (with status = null and type = null), the discount is validated as valid and redeems Founder
    expect(migrationCode).toContain("coalesce(p_discount_status, 'active') = 'active'")
    expect(migrationCode).toContain("coalesce(p_discount_type, 'flat') = 'flat'")

    const result = evaluateWebhookEvent({
      eventType: 'subscription.created',
      status: 'active',
      planCode: 'standard_monthly',
      cancelAtPeriodEnd: false,
      expectedDiscountId: 'dsc_founder_expected',
      discountId: 'dsc_founder_expected',
      discountStatus: null,
      discountType: null,
      discountEndsAt: null,
      discountEndsAtPresent: true,
      founderClaim: { id: 'claim-1', childId: 'child-1', status: 'bound', paddleTransactionId: 'txn-100' },
      originatingTransactionId: 'txn-100',
      existingSubscription: { id: 'sub-1', provider: 'paddle', status: 'trialing', foundingStatus: 'none' },
    })

    expect(result.foundingStatus).toBe('redeemed')
    expect(result.seatConsumed).toBe(true)
  })

  it('5. wrong Founder discount -> FAIL', () => {
    // 5a. Mismatched discount ID does not redeem Founder
    const wrongIdResult = evaluateWebhookEvent({
      eventType: 'subscription.created',
      status: 'active',
      planCode: 'standard_monthly',
      cancelAtPeriodEnd: false,
      expectedDiscountId: 'dsc_founder_expected',
      discountId: 'dsc_wrong_discount',
      discountEndsAt: null,
      discountEndsAtPresent: true,
      founderClaim: { id: 'claim-1', childId: 'child-1', status: 'bound', paddleTransactionId: 'txn-100' },
      originatingTransactionId: 'txn-100',
      existingSubscription: { id: 'sub-1', provider: 'paddle', status: 'trialing', foundingStatus: 'none' },
    })
    expect(wrongIdResult.foundingStatus).toBe('none')

    // 5b. Expiring discount (endsAt is present) does not redeem Founder
    const expiringResult = evaluateWebhookEvent({
      eventType: 'subscription.created',
      status: 'active',
      planCode: 'standard_monthly',
      cancelAtPeriodEnd: false,
      expectedDiscountId: 'dsc_founder_expected',
      discountId: 'dsc_founder_expected',
      discountEndsAt: '2027-08-01T00:00:00Z',
      discountEndsAtPresent: true,
      founderClaim: { id: 'claim-1', childId: 'child-1', status: 'bound', paddleTransactionId: 'txn-100' },
      originatingTransactionId: 'txn-100',
      existingSubscription: { id: 'sub-1', provider: 'paddle', status: 'trialing', foundingStatus: 'none' },
    })
    expect(expiringResult.foundingStatus).toBe('none')

    // 5c. Already redeemed Founder with wrong discount on update throws integrity failure
    expect(() => evaluateWebhookEvent({
      eventType: 'subscription.updated',
      status: 'active',
      planCode: 'standard_monthly',
      cancelAtPeriodEnd: false,
      expectedDiscountId: 'dsc_founder_expected',
      discountId: 'dsc_wrong_discount',
      discountEndsAt: null,
      originatingTransactionId: 'txn-100',
      existingSubscription: { id: 'sub-1', provider: 'paddle', status: 'active', foundingStatus: 'redeemed' },
    })).toThrow('Founder billing integrity failure')
  })

  it('6. cancel_at_period_end -> still redeemed + seat remains consumed', () => {
    // 6a. scheduled cancellation (cancel_at_period_end = true) preserves redeemed status and consumed seat
    const cancelScheduledResult = evaluateWebhookEvent({
      eventType: 'subscription.updated',
      status: 'active',
      planCode: 'standard_monthly',
      cancelAtPeriodEnd: true,
      expectedDiscountId: 'dsc_founder_expected',
      discountId: 'dsc_founder_expected',
      discountEndsAt: null,
      originatingTransactionId: 'txn-100',
      existingSubscription: { id: 'sub-1', provider: 'paddle', status: 'active', foundingStatus: 'redeemed' },
    })

    expect(cancelScheduledResult.foundingStatus).toBe('redeemed')
    expect(cancelScheduledResult.seatConsumed).toBe(true)

    // 6b. resumed subscription continues redeemed status
    const resumedResult = evaluateWebhookEvent({
      eventType: 'subscription.resumed',
      status: 'active',
      planCode: 'standard_monthly',
      cancelAtPeriodEnd: false,
      expectedDiscountId: 'dsc_founder_expected',
      discountId: 'dsc_founder_expected',
      discountEndsAt: null,
      originatingTransactionId: 'txn-100',
      existingSubscription: { id: 'sub-1', provider: 'paddle', status: 'active', foundingStatus: 'redeemed' },
    })

    expect(resumedResult.foundingStatus).toBe('redeemed')
    expect(resumedResult.seatConsumed).toBe(true)

    // 6c. actual cancellation (status = 'canceled') transitions to forfeited, but seat remains consumed (monotonic)
    const canceledResult = evaluateWebhookEvent({
      eventType: 'subscription.canceled',
      status: 'canceled',
      planCode: 'standard_monthly',
      cancelAtPeriodEnd: false,
      expectedDiscountId: 'dsc_founder_expected',
      discountId: null,
      discountEndsAt: null,
      originatingTransactionId: null,
      existingSubscription: { id: 'sub-1', provider: 'paddle', status: 'active', foundingStatus: 'redeemed' },
    })

    expect(canceledResult.foundingStatus).toBe('forfeited')
    expect(canceledResult.seatConsumed).toBe(true)
  })
})



