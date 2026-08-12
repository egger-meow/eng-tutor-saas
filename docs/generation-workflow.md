# Generation Workflow

## Status

This document is the contract for a future ChatGPT Work scheduled task. Do not create or enable that schedule until the web repository, migrations, private buckets, and a staging end-to-end run are ready.

## Daily Run

1. Check out the current production branch and read `AGENTS.md`, `docs/SPEC.md`, `docs/product-rules.md`, and this runbook.
2. Connect to the authorized Supabase project using worker-only credentials.
3. Read `operational_settings.daily_generation_limit`; use `15` only as the database default.
4. Atomically claim that many due jobs ordered by `scheduled_for`, then `created_at`.
5. For each claimed job, load only the owning child's required profile, prior materials, feedback, and entitlement state.
6. Generate the student packet and separate parent-answer packet using the recorded rule version.
7. Validate structure, answer consistency, identifiers, and printable rendering.
8. Upload both PDFs to private Storage and transactionally record the material and completed job.
9. On failure, store a sanitized error, release or expire the lease according to retry policy, and continue with other claimed jobs.
10. End with a concise run report: claimed, completed, failed, deferred, and oldest outstanding due time.

## Guardrails

- Never commit generated PDFs, child data, secrets, or copied database rows.
- Never answer exercises on behalf of the learner in the student packet.
- Never mutate a completed material; create a corrected version with traceability.
- Stop generation for inactive entitlements or missing required context.
- Do not silently exceed the configured limit.
- Do not fetch `eng-tutor` at runtime; use only production rules committed here.

## Recovery

Operators may adjust the limit in Supabase, manually invoke the same worker procedure, or requeue a reviewed failure. A rerun must reuse the idempotency key and detect already-uploaded artifacts. Repeated failures require human review rather than unbounded retries.

## Schedule Activation Checklist

- Staging migration and RLS checks pass.
- A synthetic child completes Week 1 and feedback-driven Week 2.
- Private downloads are ownership-tested.
- Worker credentials are available only to the ChatGPT Work project.
- Manual run and recovery are proven before enabling the daily schedule.
