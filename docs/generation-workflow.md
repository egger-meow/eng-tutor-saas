# Generation Workflow

## Status

The cloud Scheduled task is the sole curriculum author. It reads versioned rules through the connected GitHub app and uses the private Supabase bridge to claim work, receive controlled context, and submit canonical JSON. It never depends on a local checkout, local environment variables, or an open computer.

## Canonical Generation and PDF Boundary

ChatGPT Work must produce JSON matching `CurriculumPackageSchema` in `packages/generator/src/curriculum-package-schema.ts`; it must not generate or edit PDF layout directly. The repository validates the learning plan, self-study Student lesson, Parent answer projection, tracking delta, and quality evidence, then creates separate bilingual HTML projections and uses `@paper-english/pdf` to render the pair with Chromium. Both PDFs must succeed before either may be uploaded or recorded as complete. The legacy `WeeklyLessonSchema` path remains only for existing synthetic compatibility and must not be used for new child deliveries.

Use `pnpm generate:synthetic` to test this boundary without Supabase or private credentials. The command writes only synthetic, git-ignored files under `output/pdf/`. It is a development proof, not a replacement for the scheduled worker, queue claiming, entitlement checks, private Storage upload, or transactional completion.

## Deterministic Finisher Commands

The Scheduled task does not execute repository commands. After it submits canonical JSON to `private_generation.curriculum_submissions`, GitHub Actions uses server-only repository secrets to run the deterministic finisher:

```powershell
pnpm worker process-submissions --processor github-actions-finisher --limit 5
```

The finisher claims only packages already submitted by ChatGPT Work. It validates all relationships and critical quality checks, renders and inspects both PDFs, uploads them under `weekly-materials/<child-id>/<job-id>/`, and calls the transactional completion RPC. A rendering, upload, or completion failure records a sanitized failure. A package that has not passed independent critique and repository-owned audit is never publishable.

## Daily Run

1. ChatGPT Scheduled Work reads the current production branch through the GitHub app and the required versioned rules.
2. It connects to the authorized Supabase project through the Supabase app and only the `private_generation.chatgpt_*` bridge functions.
3. Read `operational_settings.daily_generation_limit`; use `15` only as the database default for normal capacity.
4. Atomically claim every eligible mandatory job whose `generation_due_at` has passed, even when this exceeds normal capacity. If fewer mandatory jobs exist, fill the remaining capacity with eligible normal jobs.
5. Order mandatory work first, then `generation_due_at`, then `created_at`. Never claim a job still waiting for feedback merely to fill unused capacity.
6. For each claimed job, load only the owning child's required profile, prior materials, qualifying feedback, and entitlement state. Feedback qualifies only when it belongs to `source_material_id` and was submitted by `feedback_cutoff_at`.
   The context also includes privacy-safe quality trends for this child over the last 90 days. These are evidence for the critic and rubric review, not automatic prompt mutation.
7. Generate canonical lesson JSON using the recorded rule version. If `feedback_missing` is true, continue from existing learning state without assuming successful completion.
8. Submit the canonical JSON to the private bridge. GitHub Actions independently validates it with `CurriculumPackageSchema` and repository-owned quality gates, renders and inspects the separate Student and Parent PDFs, and rejects the pair on any structure, answer-consistency, identifier, learning-stage, hidden-difficulty, critique, or rendering failure.
9. GitHub Actions uploads both PDFs to private Storage and transactionally records the material and completed job. Completion creates the next job from the existing release anchor with `release_at + 7 days`, `feedback_cutoff_at = release_at - 48 hours`, and `generation_due_at = release_at - 24 hours`.
10. After completion, call `worker_record_curriculum_observations` with the canonical package. It records vocabulary exposure, grammar targets, compact weekly history, verification hypotheses, and critic observations. This write-back must never silently claim mastery.
11. On deterministic quality rejection, preserve the immutable submission plus structured findings. If authoring attempts remain, return the job to the Scheduled task with the prior package and exact repair context; otherwise mark it HUMAN_REVIEW_REQUIRED. On rendering, upload, or completion failure, retry the same submission in the deterministic finisher without spending another LLM authoring attempt.
12. End with a concise run report: waiting for feedback, mandatory/overdue, claimed, completed, failed, deferred, observation-write failures, and oldest outstanding deadline.

## Guardrails

- Never commit generated PDFs, child data, secrets, or copied database rows.
- Never answer exercises on behalf of the learner in the student packet.
- Do not treat `trackingDelta` as proven mastery; it contains hypotheses to verify through future evidence.
- Keep learner-performance feedback separate from packet-quality feedback. Repeated packet-quality signals become reviewed rubric candidates rather than silently mutating prompts in production.
- Preserve prompt, rubric, curriculum, renderer, model, and input-fingerprint versions with every material.
- Never mutate a completed material; create a corrected version with traceability.
- Stop generation for inactive entitlements or missing required context.
- Exceed normal capacity only for mandatory jobs; report the overflow explicitly.
- Do not use feedback submitted after a job's cutoff for that delivery.
- Do not fetch `eng-tutor` at runtime; use only production rules committed here.

## Recovery

Operators may adjust normal capacity in Supabase, manually invoke the same worker procedure, or requeue a reviewed failure. Mandatory work still bypasses normal capacity. A rerun must reuse the idempotency key and detect already-uploaded artifacts. Repeated failures require human review rather than unbounded retries.

## Schedule Activation Checklist

- Staging migration and RLS checks pass.
- A synthetic child completes a v2 Week 1 and feedback-driven v2 Week 2 package.
- Private downloads are ownership-tested.
- GitHub Actions has `SUPABASE_URL` and server-only `SUPABASE_SECRET_KEY`; ChatGPT Scheduled Work has neither and uses the connected Supabase app bridge.
- Manual run and recovery are proven before enabling the daily schedule.

Run `pnpm test:e2e` against the local Supabase stack for the repeatable synthetic proof. It covers queue claim, canonical validation, PDF rendering, private upload, parent-owned signed download, feedback submission, and Week 2 context propagation. A hosted staging/manual run is still required before the ChatGPT Work schedule is enabled.
