# Deadline-Aware Generation Queue Design

## Goal

Guarantee each child a rolling seven-day material delivery while preserving the full feedback window and treating the configurable daily limit as normal capacity rather than a delivery cap.

## Schedule Model

Each job represents one promised delivery and is created when the preceding material is successfully delivered. Its `release_at` is exactly seven days after the prior release anchor; generation completion never shifts that cadence. The job records `feedback_cutoff_at = release_at - 48 hours` and `generation_due_at = release_at - 24 hours`.

A pending job is claimable only when feedback for its `source_material_id` was submitted by the cutoff, or the cutoff has passed. Spare daily capacity never consumes jobs still waiting for feedback. Feedback submitted after the cutoff is excluded from this job and remains available to the following cycle.

## Capacity and Priority

Eligible jobs at or beyond `generation_due_at` are mandatory. A run claims every mandatory job even when their count exceeds `daily_generation_limit`. If mandatory jobs are fewer than the configured limit, normal eligible jobs fill the remaining capacity. Ordering is mandatory first, then earliest `generation_due_at`, then creation time.

When a job is claimed without qualifying feedback, the worker records `feedback_missing = true` and continues from the child's existing learning state. Missing feedback is not evidence that the previous week was completed successfully.

## Reliability

Claiming remains atomic with `FOR UPDATE SKIP LOCKED`, active entitlement checks, leases, retry limits, and idempotency keys. Queue reports must expose overdue, mandatory, waiting-for-feedback, failed, and deferred counts. Operators may change normal capacity without weakening the deadline override.

