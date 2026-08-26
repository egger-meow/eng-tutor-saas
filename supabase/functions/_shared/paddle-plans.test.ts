import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { getCheckoutPlan, getFounderClaimNeutralizationAction, getPaddleApiBaseUrl, getWebhookFoundingDiscount, getWebhookPlan, validateFoundingDiscount } from './paddle-plans'

const priceIds = { monthly: 'pri_monthly', annual: 'pri_annual' }

describe('Paddle plan allowlist', () => {
  it('neutralizes abandoned Founder transactions only through safe Paddle states', () => {
    expect(getFounderClaimNeutralizationAction('draft', 'dsc_founder', 'dsc_founder')).toBe('remove_discount')
    expect(getFounderClaimNeutralizationAction('ready', 'dsc_founder', 'dsc_founder')).toBe('cancel')
    expect(getFounderClaimNeutralizationAction('billed', 'dsc_founder', 'dsc_founder')).toBe('cancel')
    expect(getFounderClaimNeutralizationAction('canceled', 'dsc_founder', 'dsc_founder')).toBe('release_canceled')
    expect(getFounderClaimNeutralizationAction('paid', 'dsc_founder', 'dsc_founder')).toBe('retain')
    expect(getFounderClaimNeutralizationAction('completed', 'dsc_founder', 'dsc_founder')).toBe('retain')
  })
  it('maps semantic checkout plans to canonical server plans', () => {
    expect(getCheckoutPlan('monthly', priceIds)).toMatchObject({ planCode: 'standard_monthly', billingInterval: 'month', priceTwd: 499 })
    expect(getCheckoutPlan('annual', priceIds)).toMatchObject({ planCode: 'standard_annual', billingInterval: 'year', priceTwd: 4999 })
    expect(() => getCheckoutPlan('pri_attacker', priceIds)).toThrow('Unsupported billing plan')
  })

  it('accepts only the configured annual price with matching recurring details', () => {
    expect(getWebhookPlan([{
      quantity: 1,
      price: {
        id: 'pri_annual',
        unit_price: { amount: '499900', currency_code: 'TWD' },
        billing_cycle: { interval: 'year', frequency: 1 },
      },
    }], priceIds)).toMatchObject({ key: 'annual', planCode: 'standard_annual', priceTwd: 4999 })
  })

  it('rejects unknown prices and mismatched amounts or intervals', () => {
    expect(() => getWebhookPlan([{ quantity: 1, price: { id: 'pri_unknown' } }], priceIds)).toThrow('Unknown')
    expect(() => getWebhookPlan([{
      quantity: 1,
      price: {
        id: 'pri_annual',
        unit_price: { amount: '49900', currency_code: 'TWD' },
        billing_cycle: { interval: 'month', frequency: 1 },
      },
    }], priceIds)).toThrow('do not match')
  })

  it('accepts only a forever-recurring TWD 150 founding discount restricted to monthly', () => {
    expect(() => validateFoundingDiscount({
      status: 'active', type: 'flat', amount: '15000', currency_code: 'TWD',
      recur: true, maximum_recurring_intervals: null, restrict_to: ['pri_monthly'],
    }, 'pri_monthly')).not.toThrow()
    expect(() => validateFoundingDiscount({
      status: 'active', type: 'flat', amount: '15000', currency_code: 'TWD',
      recur: true, maximum_recurring_intervals: 1, restrict_to: ['pri_monthly'],
    }, 'pri_monthly')).toThrow('forever-recurring')
    expect(() => validateFoundingDiscount({
      status: 'active', type: 'flat', amount: '15000', currency_code: 'TWD',
      recur: true, maximum_recurring_intervals: null, restrict_to: ['pri_annual'],
    }, 'pri_monthly')).toThrow('standard monthly price')
  })

  it('normalizes the webhook subscription discount for authoritative reconciliation', () => {
    expect(getWebhookFoundingDiscount({ id: 'dsc_founder', status: 'active', type: 'recurring', ends_at: null })).toEqual({
      id: 'dsc_founder', status: 'active', type: 'recurring', endsAt: null, endsAtPresent: true,
    })
    expect(getWebhookFoundingDiscount({ id: 'dsc_founder', type: 'recurring' })).toMatchObject({
      id: 'dsc_founder', endsAt: null, endsAtPresent: false,
    })
  })
})

describe('Paddle API Base URL configuration & regression', () => {
  it('resolves sandbox and production base URLs with trailing slash normalization', () => {
    expect(getPaddleApiBaseUrl('https://sandbox-api.paddle.com')).toBe('https://sandbox-api.paddle.com')
    expect(getPaddleApiBaseUrl('https://api.paddle.com')).toBe('https://api.paddle.com')
    expect(getPaddleApiBaseUrl('https://api.paddle.com/')).toBe('https://api.paddle.com')
  })

  it('fails closed when PADDLE_API_BASE_URL is missing or empty and does not fall back to sandbox', () => {
    expect(() => getPaddleApiBaseUrl(undefined)).toThrow('PADDLE_API_BASE_URL is not configured')
    expect(() => getPaddleApiBaseUrl('')).toThrow('PADDLE_API_BASE_URL is not configured')
    expect(() => getPaddleApiBaseUrl('   ')).toThrow('PADDLE_API_BASE_URL is not configured')
  })

  it('ensures no server-side edge function hardcodes sandbox-api.paddle.com in runtime code', () => {
    const functionsDir = join(__dirname, '..')
    const findTsFiles = (dir: string): string[] => {
      const files: string[] = []
      for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry)
        if (statSync(fullPath).isDirectory()) {
          files.push(...findTsFiles(fullPath))
        } else if (fullPath.endsWith('.ts') && !fullPath.endsWith('.test.ts') && !fullPath.endsWith('.d.ts')) {
          files.push(fullPath)
        }
      }
      return files
    }

    const runtimeFiles = findTsFiles(functionsDir)
    expect(runtimeFiles.length).toBeGreaterThan(0)

    for (const file of runtimeFiles) {
      const content = readFileSync(file, 'utf-8')
      expect(
        content.includes('sandbox-api.paddle.com'),
        `Found hardcoded sandbox-api.paddle.com in server runtime file: ${file}`,
      ).toBe(false)
    }
  })

  it('ensures all paddle server functions use getPaddleApiBaseUrl for runtime resolution', () => {
    const targetFunctions = [
      'paddle-checkout/index.ts',
      'paddle-cancel-subscription/index.ts',
      'paddle-update-subscription/index.ts',
      'paddle-founder-claim-cleanup/index.ts',
    ]

    for (const relPath of targetFunctions) {
      const fullPath = join(__dirname, '..', relPath)
      const content = readFileSync(fullPath, 'utf-8')
      expect(
        content.includes("getPaddleApiBaseUrl(Deno.env.get('PADDLE_API_BASE_URL'))"),
        `Expected ${relPath} to call getPaddleApiBaseUrl(Deno.env.get('PADDLE_API_BASE_URL'))`,
      ).toBe(true)
    }
  })

  it('binds discounted checkout and webhook redemption to the same durable Founder claim', () => {
    const checkout = readFileSync(join(__dirname, '../paddle-checkout/index.ts'), 'utf-8')
    const webhook = readFileSync(join(__dirname, '../paddle-webhook/index.ts'), 'utf-8')
    const cleanup = readFileSync(join(__dirname, '../paddle-founder-claim-cleanup/index.ts'), 'utf-8')

    expect(checkout).toContain("rpc('prepare_paddle_checkout_v2'")
    expect(checkout).toContain("rpc('bind_founder_checkout_transaction'")
    expect(checkout).toContain('founder_claim_id: foundingClaimId')
    expect(webhook).toContain("rpc('process_paddle_subscription_event_v2'")
    expect(webhook).toContain('p_founder_claim_id: founderClaimId ?? null')
    expect(webhook).toContain('p_originating_transaction_id: subscription?.transaction_id ?? null')
    expect(cleanup).toContain("rpc('claim_expired_founder_checkouts'")
    expect(cleanup).toContain("rpc('release_founder_checkout_claim'")
  })
})
