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

## Memory Boundaries

Stable parent-provided context belongs in `child_profiles`; generator-owned observations belong in the progress and learning-state tables. Weekly history stays compact instead of storing prompt transcripts. Curriculum definitions remain versioned in Git—the database stores only stable curriculum IDs and each child's progress.

Parents may read all records belonging to their children and edit profiles and feedback. Children are archived with `is_active = false`; browser hard deletion is denied so materials and learning history remain intact. Service-role workers maintain progress, learning state, materials, subscriptions, and generation jobs.

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

Use private bucket `weekly-materials` and opaque paths:

```text
<parent-id>/<child-id>/<material-id>/student.pdf
<parent-id>/<child-id>/<material-id>/parent-answer.pdf
```

The owning parent receives short-lived signed URLs. Paths and object metadata are not treated as authorization by themselves.
