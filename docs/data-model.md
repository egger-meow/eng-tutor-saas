# Data Model

## Ownership Graph

`auth.users → profiles → children → subscriptions/materials/feedback/generation_jobs`

`profiles.id` equals the authenticated parent's user ID. Every child belongs to exactly one profile. Child-scoped records reference `child_id`; RLS verifies ownership through `children.parent_id = auth.uid()`.

## Core Records

- `profiles`: parent identity and service preferences.
- `children`: grade, learning preferences, timezone, and weekly delivery configuration.
- `subscriptions`: one entitlement per child, with provider identifiers and status.
- `feedback`: structured reaction to a completed material; immutable source material plus timestamps.
- `materials`: one weekly edition, its input/rule versions, and private artifact paths.
- `generation_jobs`: scheduled, claimed, completed, or failed work with an idempotency key and retry metadata.
- `operational_settings`: privileged configuration such as `daily_generation_limit = 15`.

## Queue Invariants

- A unique idempotency key prevents duplicate work for the same child/week/rule version.
- A job can be claimed only when pending, due, and not already leased.
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
