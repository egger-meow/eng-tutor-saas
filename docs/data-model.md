# Data Model

## Ownership Graph

`auth.users → profiles → children → subscriptions/materials/feedback/learning memory`

`profiles.id` equals the authenticated parent's user ID. Every child belongs to exactly one profile. Child-scoped records reference `child_id`; RLS verifies ownership through `children.parent_id = auth.uid()`.

## Core Records

- `profiles`: parent identity and service preferences.
- `children`: identity, grade, textbook version, timezone, delivery day, next generation time, and archive state.
- `child_profiles`: parent-editable baseline, current levels, goals, school progress, expectations, and preferences.
- `child_vocab_progress` and `child_grammar_progress`: dynamic mastery keyed by stable text IDs from the Git-owned curriculum.
- `child_learning_state`: compact weekly history, recurring mistakes, comprehension accuracy, and difficulty trend.
- `subscriptions`: one entitlement per child, including provider/customer IDs, plan, TWD price, founding status, and billing period state.
- `feedback`: structured completion, difficulty, weak area, mistakes, and parent/child updates. Its `child_id` and `material_id` are immutable.
- `materials`: one weekly edition, canonical source, generation summary, prompt/generator/model versions, input snapshot, and private artifact paths.
- `generation_jobs`: private worker queue with a source material, promised release, 48-hour feedback cutoff, 24-hour generation deadline, idempotency, leases, retries, and sanitized errors. Browser roles cannot read raw jobs.
- `operational_settings`: privileged configuration such as `daily_generation_limit = 15`.
- `enrollment_settings`: typed public capacity state (`open`, `waitlist`, or `closed`) with capacity and founding limits.
- `material_email_deliveries`: one independent notification row per material, with account-email snapshot, bounded attempts, lease state, provider result, sent time, hashed 90-day scoped token, expiry, and revocation. Browser roles have no table or RPC access.

## Memory Boundaries

Stable parent-provided context belongs in `child_profiles`; generator-owned observations belong in the progress and learning-state tables. Weekly history stays compact instead of storing prompt transcripts. Each new history entry preserves the reading theme, measurable targets, a stable question/stage evidence map, next-review candidates, applied feedback, and concrete week-over-week improvements. This lets a later generator compare supported, independent, transfer, and delayed-retrieval evidence without reopening old PDFs. Curriculum definitions remain versioned in Git—the database stores only stable curriculum IDs and each child's progress.

Parents may read all records belonging to their children and edit profiles and feedback. Children are archived with `is_active = false`; browser hard deletion is denied so materials and learning history remain intact. Service-role workers maintain progress, learning state, materials, subscriptions, and generation jobs.

## Permanent Student Library

Longitudinal memory has three layers:

1. `child_weekly_learning_snapshots` stores one immutable, canonical completion-time snapshot per material. Its `sequence_number` is the one-based delivery-chain authority shown as `Week N`; `material_week` is only the source package label.
2. `child_learning_evidence` stores append-only learner observations. Packet targets, questions, answer keys, hypotheses, and intended assessment opportunities stay in the snapshot and never become learner results by themselves.
3. vocabulary, grammar, and communication progress tables are rebuildable current projections. Generation receives these distilled facts plus bounded recent history, not the lifetime packet archive.

Feedback processing is revisioned through `feedback_memory_processing`. Identical fingerprints reuse the effective revision. An edit supersedes the prior effective revision, appends evidence linked by both `feedback_id` and `feedback_processing_id`, and excludes superseded evidence from current projections without deleting its audit trail.

Evidence policy `evidence-v1` requires correct assessed evidence on two distinct materials, with the later result at least seven days after the first, before a target is evidence-mastered. A later explicit incorrect result moves it to reviewing with `regression_after_mastery`. Partial increments assessed/partial only; unknown changes no result count. Exposure, answer keys, missing feedback, and vague prose cannot prove mastery.

Parents may select owned library rows under RLS and use only the parent-safe timeline and summary RPCs. Browser roles cannot mutate snapshots, evidence, or processing revisions. Service functions are `SECURITY DEFINER`, use an empty search path, and are granted only to `service_role` unless explicitly parent-facing.

## Queue Invariants

- A unique idempotency key prevents duplicate work for the same child/week/rule version.
- A delivered material immediately creates the next job on the child's unchanged seven-day release anchor.
- A job with a source material is waiting for feedback until qualifying feedback arrives or its 48-hour cutoff passes.
- Waiting jobs never consume spare normal capacity. Feedback after the cutoff applies to the following cycle.
- Every eligible job at its 24-hour generation deadline is mandatory and may exceed normal capacity; otherwise eligible jobs fill the configured limit in deadline order.
- Claiming without qualifying feedback records `feedback_missing = true` and does not imply successful completion.
- A lease records worker identity and expiry so abandoned work can be recovered.
- Completion requires both artifact paths and a material record.
- Failures preserve a sanitized diagnostic and increment attempts.
- Operational settings are not readable or writable by browser roles.

## Storage Layout

Scoped email access is resolved only in the server-side Edge Function. A valid, unexpired, unrevoked token hash must resolve through the recorded parent, child, material, completed job, and elapsed `release_at` before the server mints five-minute URLs for the two exact objects. Possession never becomes an authenticated session.

Use private bucket `weekly-materials` and opaque paths:

```text
<child-id>/<generation-job-id>/student.pdf
<child-id>/<generation-job-id>/parent-answer.pdf
```

The owning parent receives short-lived signed URLs. Storage RLS verifies that the exact object path is recorded on a material owned through `material → child → parent`; paths and object metadata are not treated as authorization by themselves.
