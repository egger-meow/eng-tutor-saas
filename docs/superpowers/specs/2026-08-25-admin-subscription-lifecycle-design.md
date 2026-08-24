# Admin Traditional Chinese and Subscription Lifecycle Design

## Scope

Refine the existing operator Admin without adding unrelated operational features:

- localize the primary Admin UI to Traditional Chinese;
- add a dedicated `訂閱與營收` page;
- add append-only subscription lifecycle event truth;
- correct Engine Inspector status semantics and visual hierarchy.

Raw identifiers such as engine versions, schema versions, prompt versions, provider event types, and error codes remain in English when that improves technical diagnosis.

## Product Truth

`subscriptions` remains authoritative for each child's current subscription state. `billing_webhook_events` remains the authoritative receipt and idempotency input for Paddle webhooks. A new append-only `subscription_lifecycle_events` table records observable lifecycle transitions for historical reporting.

The system does not reconstruct or fabricate events from the current subscription row. Historical charts begin when lifecycle instrumentation begins. Empty earlier periods are presented as unavailable historical evidence, not zero activity inferred from current state.

Internal-test children are excluded from paid subscriber, conversion, churn, and revenue calculations. Their production lifecycle remains otherwise unchanged.

## Lifecycle Event Model

Each event records:

- subscription and child identifiers;
- normalized lifecycle event type;
- effective event timestamp;
- source (`paddle_webhook` or an explicit internal transition source);
- source event identifier when available;
- observed subscription status, plan, interval, price, and period boundaries;
- cancellation state;
- creation timestamp and minimal diagnostic metadata.

Supported normalized event types are:

- `trial_started`;
- `activated`;
- `renewed`;
- `cancel_scheduled`;
- `resumed`;
- `past_due`;
- `paused`;
- `canceled`;
- `expired`.

Rows are immutable after insertion. Paddle events use `occurred_at` as the effective timestamp. Internal beta/trial transitions use their actual transaction timestamp. Uniqueness constraints make repeated delivery idempotent without suppressing distinct renewals or transitions.

The Paddle processing RPC updates the current subscription and inserts the normalized event in the same database transaction. Event classification compares the incoming authoritative Paddle state and event type with the locked current row. A scheduled cancellation is recorded separately from final cancellation. Renewal is recorded only when authoritative period advancement or an equivalent Paddle renewal signal exists.

The beta subscription creation path records `trial_started` in the same transaction that creates the subscription. Other internal transitions must call a focused database helper rather than writing synthetic Paddle-like records.

## Admin Subscription and Revenue Read Model

The Admin server reads current rows and lifecycle events with service-role access; the browser receives only the sanitized Admin contract.

The new page provides:

1. Current state counts: `體驗中`, `付費訂閱中`, `已排定取消`, `扣款異常`, `暫停`, and `已退訂`.
2. A selectable time range with daily or appropriately bucketed series for active paid subscriptions, trials, new paid subscriptions, cancellations/churn, net subscriber growth, and trial-to-paid conversion.
3. Subscription and cancellation funnels only for steps supported by authoritative events. Unsupported stages are labeled as unavailable rather than estimated.
4. A subscription table containing child pseudonym, localized status, plan, price, start date, renewal/current-period end, and cancellation state.
5. A row drill-down showing that subscription's immutable lifecycle timeline.

Active paid history is calculated as an event-derived state over time from observed lifecycle transitions. New paid, cancellation, net growth, and conversion use event counts. Revenue visibility uses authoritative subscription price and lifecycle evidence; it does not claim recognized revenue or fabricate transaction history where payment events are absent.

## Traditional Chinese Admin UI

All primary navigation, headings, controls, empty states, pipeline labels, attempt labels, date labels, status labels, and operator-facing explanations are localized to Traditional Chinese. Existing debug payloads and engineering identifiers stay unchanged when translation would reduce diagnostic precision.

The operations pipeline uses:

- `服務中孩子`;
- `等候名單`;
- `總需求`;
- `等待生成`;
- `等待品質審核`;
- `審核完成`;
- `首次嘗試`, `第 N 次嘗試`, and explicit Chinese retry states.

Pipeline membership and production-truth semantics are unchanged.

## Engine Inspector

The version hierarchy is rendered as:

- `引擎 1.1.0` as the umbrella production engine;
- `提示詞 2.5.0` as the prompt subsystem;
- `標準資料結構 2.3.0` as the canonical schema subsystem.

Alignment states are strictly separated:

- `aligned`: green, `版本一致`;
- `unobservable`: neutral gray or muted amber, `尚無可驗證版本資料`;
- `version_drift`: red, `版本不一致`.

Only actual mismatches receive drift styling. Unobservable component rows use a neutral missing-evidence style and remain inside the expanded manifest.

## Security and Privacy

The lifecycle table has RLS enabled because it is in the exposed `public` schema. It is not granted to browser roles unless a parent-facing use case exists; Admin access remains server-side through service role. Free-text cancellation reasons and provider payloads are not copied wholesale into lifecycle metadata. Child display names are masked before reaching the Admin browser contract.

## Verification

Regression coverage includes:

- Paddle webhook idempotency and exact event timestamps;
- atomic current-state update plus lifecycle insertion;
- scheduled cancellation distinct from terminal cancellation;
- renewal and resume classification;
- beta trial event creation;
- no fabricated backfill;
- internal-test exclusion from every paid, conversion, churn, and revenue metric;
- current-state mapping and all chart series;
- subscription table and timeline drill-down;
- complete Traditional Chinese primary navigation and operations labels;
- Engine Inspector aligned, unobservable, and drift styling, including neutral unobservable rows.

Focused Admin, Edge Function, and database tests run first, followed by repository typecheck, test, build, database reset/tests, and migration verification.

## Delivery

The coherent implementation is committed and pushed to the current upstream branch. New migrations are applied to the linked production database and remote migration history is verified. Changed Paddle Edge Functions are deployed and their deployed version is verified.
