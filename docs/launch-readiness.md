# Production Launch Readiness

This document is the small pre-launch control sheet for 紙屬英文.

It is intentionally not a feature backlog. Launch work should remove real production blockers, prove the customer lifecycle, and avoid last-minute product expansion.

## Current release gate

### Closed

- [x] Paddle server API endpoint selection is production-safe.
  - `PADDLE_API_BASE_URL` is required server-side.
  - Sandbox: `https://sandbox-api.paddle.com`
  - Production: `https://api.paddle.com`
  - Checkout, cancel, and resume use the configured base URL.
  - Missing configuration fails closed instead of silently falling back to Sandbox.
  - Runtime server code must not hardcode the Sandbox API endpoint.

### External / configuration gates before Live testing

- [ ] Paddle Live account approval is complete.
- [ ] Production checkout domain is approved by Paddle.
- [ ] Paddle production default payment link is configured.
- [ ] Live monthly price exists: TWD 499 / month.
- [ ] Live annual price exists: TWD 4,999 / year.
- [ ] Live Founder 30 discount exists: active flat TWD 200, recurring forever (`maximum_recurring_intervals = null`), restricted only to the standard TWD 499 monthly price.
- [ ] Live API key is created and stored only as a server secret.
- [ ] Live client-side token is configured for the production web build.
- [ ] Live webhook destination points to the production `paddle-webhook` Edge Function.
- [ ] `REQUIRED_TERMS_VERSION=2026-08-26-v2` is installed for `paddle-checkout`; Terms v2 is published on 2026-08-26 and does not become effective until 2026-08-29 after the stated three-day review window.
- [ ] `paddle-founder-claim-cleanup` is deployed and invoked with the service-role bearer credential on a five-minute schedule. It may release an expired claim only after Paddle returns `canceled`, accepts removal of the Founder discount from a draft transaction, or accepts cancellation of a ready/billed transaction.
- [ ] Live webhook secret is installed in Supabase Edge Function secrets.
- [ ] Production browser config uses `VITE_PADDLE_ENV=production`.
- [ ] Production server config uses `PADDLE_API_BASE_URL=https://api.paddle.com`.
- [ ] Supabase Auth production Site URL / redirect allow list points to `https://paperbond.jjmowlab.com`.
- [ ] Hosted Auth email templates and production SMTP are verified with real delivered emails.
- [ ] Old test-only Storage objects are cleaned through the Supabase Storage API / Dashboard, not by deleting `storage.objects` through SQL.

Never record API keys, webhook secrets, SMTP passwords, or other credentials in this document or Git.

## Terms v2 and Founder claim rollout order

1. On 2026-08-26, deploy the web build to publish Terms v2 and its review notice. The Billing UI keeps checkout closed and does not offer acceptance before 2026-08-29 00:00 Asia/Taipei.
2. Keep a checkout maintenance gate during the database/Edge cutover. Do not change the NT$499 monthly catalog price.
3. On or after 2026-08-29 00:00 Asia/Taipei, apply `20260826210000_founder_30_lifetime_pricing.sql`. The 13-argument deployed-webhook RPC and the first Founder-revision overload remain available; unsafe Founder/annual legacy events fail closed for Paddle retry.
4. Deploy `paddle-webhook`, then `paddle-checkout`, then `paddle-founder-claim-cleanup`. Install `REQUIRED_TERMS_VERSION=2026-08-26-v2` and retain the verified Founder discount ID.
5. Configure the service-role invocation of `paddle-founder-claim-cleanup` every five minutes. The already-published web build switches from review notice to v2 acceptance at the effective timestamp; remove the checkout gate only after that switch and the backend cutover are verified.
6. Verify Terms-only reacceptance, a standard annual checkout without discount, a Founder monthly claim/bind/activation, and claim cleanup in Paddle/Supabase logs before normal traffic.

## Golden Customer Test

Run this with a brand-new parent email and a brand-new child. Do not reuse load-test or historical test accounts.

The test should behave exactly like a real customer journey:

1. [ ] Open `https://paperbond.jjmowlab.com` as an unfamiliar visitor.
2. [ ] Authentication email arrives and the production-domain login/redirect succeeds.
3. [ ] Legal acceptance is recorded through the normal UI.
4. [ ] Create one child through normal onboarding.
5. [ ] Confirm the child begins with the correct independent subscription / entitlement state.
6. [ ] Start the intended monthly or annual Paddle Live checkout.
7. [ ] Checkout completes and Paddle creates the expected subscription lifecycle.
8. [ ] Production webhook signature verification succeeds.
9. [ ] Exactly one local subscription state is reconciled for that child.
10. [ ] Founder pricing is NT$349 every month while the same monthly subscription remains continuous; annual activation never receives the discount.
11. [ ] A Founder checkout opened immediately before reservation expiry remains counted until its transaction completes or is safely neutralized; a concurrent child cannot become seat 31.
12. [ ] An account that accepted an older Terms version cannot start checkout until it explicitly accepts v2; unchanged Privacy v1 is not reaccepted.
13. [ ] The child receives generation entitlement without manual SQL or admin state repair.
14. [ ] Week 1 generation job exists through the normal product flow.
15. [ ] Scheduled authoring claims/submits the job normally.
14. [ ] Deterministic Finisher completes Student + Parent PDFs.
15. [ ] Material becomes visible only when its release rules permit it.
16. [ ] The owning parent can download both private PDFs from the dashboard.
17. [ ] A different authenticated parent cannot access the child, subscription, material, or PDF.
18. [ ] Parent feedback can be submitted through the normal UI.
19. [ ] Week 2 is scheduled normally and its generation context contains the relevant Week 1 history + feedback.
20. [ ] Week 2 output visibly responds to relevant feedback/state without mutating Week 1.

No step may require knowledge of internal database tables or manual operator repair for the happy path.

## Live payment smoke testing

A dedicated Live 100% discount may be used temporarily to prove production wiring without intentionally charging the operator.

Rules:

- Do not replace or reuse `PADDLE_FOUNDING_DISCOUNT_ID` for this test.
- Keep the smoke-test discount isolated from customer-facing pricing and remove/archive it after testing.
- A zero-value Live transaction proves Live catalog/API/checkout/webhook/entitlement integration.
- It does **not** prove a real non-zero card authorization, issuer decline handling, or 3DS path.

## Go / No-Go

### Soft promotion gate

Small-budget promotion may begin when all of the following are true:

- Paddle Live configuration gates above are complete.
- Golden Customer Test passes through Week 1 delivery and private download.
- There are zero known P0 failures in authentication, checkout, webhook reconciliation, entitlement, ownership/RLS, generation, or delivery.
- The production site can be used without operator explanation.

Start with a small real-parent cohort. Do not jump directly to large traffic.

### Scale promotion gate

Increase promotion only after real users also prove the feedback loop:

- multiple real children complete Week 1;
- real parents successfully submit feedback;
- at least one real child reaches Week 2 normally;
- Week 2 visibly reflects relevant state/feedback;
- no repeated payment, entitlement, ownership, or delivery failures emerge.

## Scope freeze before launch

Unless a new P0/P1 is discovered, do not delay launch for:

- additional curriculum tuning based on one example;
- new engagement features;
- large admin expansions;
- marketing experiments that can be prepared separately;
- convenience features that are not required for the Golden Customer Test.

New ideas may be recorded separately and implemented after the launch-critical path is green.
