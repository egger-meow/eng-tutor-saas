# Generation Workflow

## Status

This document is the contract for a future ChatGPT Work scheduled task. Do not create or enable that schedule until the web repository, migrations, private buckets, and a staging end-to-end run are ready.

## Canonical Generation and PDF Boundary

ChatGPT Work must produce JSON matching `WeeklyLessonSchema` in `packages/generator/src/lesson-schema.ts`; it must not generate or edit PDF layout directly. The repository validates the canonical lesson, creates separate Student and Parent HTML projections, and uses `@paper-english/pdf` to render the pair with Chromium. Both PDFs must succeed before either may be uploaded or recorded as complete.

Use `pnpm generate:synthetic` to test this boundary without Supabase or private credentials. The command writes only synthetic, git-ignored files under `output/pdf/`. It is a development proof, not a replacement for the scheduled worker, queue claiming, entitlement checks, private Storage upload, or transactional completion.

## Worker Commands

The future ChatGPT Work schedule calls the repository worker instead of reimplementing queue or Storage logic. Configure `SUPABASE_URL` and the server-only `SUPABASE_SECRET_KEY`; never use the browser publishable key.

```powershell
pnpm worker claim --worker chatgpt-work-daily
pnpm worker context --worker chatgpt-work-daily --job <job-id>
pnpm worker complete --worker chatgpt-work-daily --job <job-id> --lesson <lesson.json> --prompt-version <git-version> --generator-version <git-sha> --model <model-id>
```

`claim` prints generation contexts as JSON. ChatGPT Work creates one canonical lesson JSON per context and passes it to `complete`. Completion validates job identity, renders both PDFs, uploads them under `weekly-materials/<child-id>/<job-id>/`, and calls a transactional completion RPC. A rendering, upload, or completion failure removes staged paths and records a sanitized job failure.

## Daily Run

1. Check out the current production branch and read `AGENTS.md`, `docs/SPEC.md`, `docs/product-rules.md`, and this runbook.
2. Connect to the authorized Supabase project using worker-only credentials.
3. Read `operational_settings.daily_generation_limit`; use `15` only as the database default for normal capacity.
4. Atomically claim every eligible mandatory job whose `generation_due_at` has passed, even when this exceeds normal capacity. If fewer mandatory jobs exist, fill the remaining capacity with eligible normal jobs.
5. Order mandatory work first, then `generation_due_at`, then `created_at`. Never claim a job still waiting for feedback merely to fill unused capacity.
6. For each claimed job, load only the owning child's required profile, prior materials, qualifying feedback, and entitlement state. Feedback qualifies only when it belongs to `source_material_id` and was submitted by `feedback_cutoff_at`.
7. Generate canonical lesson JSON using the recorded rule version. If `feedback_missing` is true, continue from existing learning state without assuming successful completion.
8. Validate the JSON with `WeeklyLessonSchema`, render the separate Student and Parent PDFs, and reject the pair on any structure, answer-consistency, identifier, or rendering failure.
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

Run `pnpm test:e2e` against the local Supabase stack for the repeatable synthetic proof. It covers queue claim, canonical validation, PDF rendering, private upload, parent-owned signed download, feedback submission, and Week 2 context propagation. A hosted staging/manual run is still required before the ChatGPT Work schedule is enabled.
