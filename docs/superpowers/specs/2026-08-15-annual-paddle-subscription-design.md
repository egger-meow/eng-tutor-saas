# Annual Paddle Subscription Design

## Goal

Add a per-child annual Paddle Sandbox subscription at NT$4,999 alongside the existing NT$499 monthly subscription, while keeping entitlement changes server-authoritative and preserving the Founding 30 offer for monthly checkout only.

## Product decisions

- Monthly remains NT$499 per child. Founding 30 may reduce only the first paid monthly period to NT$299.
- Annual is a fixed NT$4,999 per child per year, equivalent to about NT$417 per month and NT$989 (16.5%) less than twelve monthly payments.
- A parent chooses monthly or annual before checkout for trialing or canceled children.
- Existing active, past-due, or paused subscriptions cannot switch billing interval in this phase. Cancellation remains effective at the end of the paid billing period.
- Paddle tax calculation and payment handling remain authoritative.

## Architecture

Use one Paddle product with two recurring prices. The browser sends only a semantic `monthly` or `annual` plan key. The checkout Edge Function maps that key through a server-side allowlist to `PADDLE_STANDARD_PRICE_ID` or `PADDLE_ANNUAL_PRICE_ID`; clients never choose an arbitrary Paddle price ID.

Checkout custom data records the child, parent, and selected plan. The signed Paddle subscription webhook derives the canonical plan from the recurring item's price ID and validates its billing interval and TWD unit price before calling the database RPC. Unknown or mismatched prices fail closed and do not grant entitlement.

The database stores the canonical `plan_code`, `billing_interval`, and TWD price. The RPC remains service-role-only, idempotent by Paddle event ID, stale-event-aware, and one-subscription-per-child.

## Frontend experience

The public pricing section shows monthly and annual choices without implying that annual receives the Founding 30 discount. The billing card presents an accessible plan selector for subscribable children and explains the annual savings. The inline checkout summary reflects the exact selected plan, while active subscription cards use the stored interval instead of hardcoded monthly copy.

## Verification

- Unit-test pricing math, plan labels, and checkout request payloads.
- Extend database smoke coverage for monthly and annual webhook persistence, founding redemption rules, invalid plan metadata, duplicate events, and RPC permissions.
- Typecheck, lint, unit-test, build, and run the local Supabase database suite.
- Verify the Paddle Sandbox setup against current Paddle documentation and provide an operator checklist for product/price, API key, client token, webhook destination, secrets, and a sandbox checkout/webhook test.
