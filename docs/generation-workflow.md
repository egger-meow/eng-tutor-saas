# Generation Workflow

## Status

This document is the contract for a future ChatGPT Work scheduled task. Do not create or enable that schedule until the web repository, migrations, private buckets, and a staging end-to-end run are ready.

## Daily Run

1. Check out the current production branch and read `AGENTS.md`, `docs/SPEC.md`, `docs/product-rules.md`, and this runbook.
2. Connect to the authorized Supabase project using worker-only credentials.
3. Read `operational_settings.daily_generation_limit`; use `15` only as the database default for normal capacity.
4. Atomically claim every eligible mandatory job whose `generation_due_at` has passed, even when this exceeds normal capacity. If fewer mandatory jobs exist, fill the remaining capacity with eligible normal jobs.
5. Order mandatory work first, then `generation_due_at`, then `created_at`. Never claim a job still waiting for feedback merely to fill unused capacity.
6. For each claimed job, load only the owning child's required profile, prior materials, qualifying feedback, and entitlement state. Feedback qualifies only when it belongs to `source_material_id` and was submitted by `feedback_cutoff_at`.
7. Generate the student packet and separate parent-answer packet using the recorded rule version. If `feedback_missing` is true, continue from existing learning state without assuming successful completion.
8. Validate structure, answer consistency, identifiers, and printable rendering.
9. Upload both PDFs to private Storage and transactionally record the material and completed job. Create the next job from the existing release anchor with `release_at + 7 days`, `feedback_cutoff_at = release_at - 48 hours`, and `generation_due_at = release_at - 24 hours`.
10. On failure, store a sanitized error, release or expire the lease according to retry policy, and continue with other claimed jobs.
11. End with a concise run report: waiting for feedback, mandatory/overdue, claimed, completed, failed, deferred, and oldest outstanding deadline.

## Guardrails

- Never commit generated PDFs, child data, secrets, or copied database rows.
- Never answer exercises on behalf of the learner in the student packet.
- Never mutate a completed material; create a corrected version with traceability.
- Stop generation for inactive entitlements or missing required context.
- Exceed normal capacity only for mandatory jobs; report the overflow explicitly.
- Do not use feedback submitted after a job's cutoff for that delivery.
- Do not fetch `eng-tutor` at runtime; use only production rules committed here.

## Recovery

Operators may adjust normal capacity in Supabase, manually invoke the same worker procedure, or requeue a reviewed failure. Mandatory work still bypasses normal capacity. A rerun must reuse the idempotency key and detect already-uploaded artifacts. Repeated failures require human review rather than unbounded retries.

## Schedule Activation Checklist

- Staging migration and RLS checks pass.
- A synthetic child completes Week 1 and feedback-driven Week 2.
- Private downloads are ownership-tested.
- Worker credentials are available only to the ChatGPT Work project.
- Manual run and recovery are proven before enabling the daily schedule.
