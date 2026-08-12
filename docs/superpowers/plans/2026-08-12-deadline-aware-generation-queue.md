# Deadline-Aware Generation Queue Implementation Plan

> **For agentic workers:** Execute these tasks sequentially in the current session and verify each deliverable before continuing.

**Goal:** Make generation jobs feedback-aware and guarantee deadline work can exceed normal daily capacity.

**Architecture:** Store the delivery, feedback cutoff, generation deadline, and preceding material directly on each job. Derive waiting-for-feedback from those fields, and atomically claim all mandatory work plus enough normal work to reach the configured daily capacity.

**Tech Stack:** PostgreSQL 17, Supabase CLI, SQL smoke tests, Markdown runbooks.

## Global Constraints

- Each child follows an independent seven-day cadence anchored to first delivery.
- Feedback closes 48 hours before delivery; generation is mandatory 24 hours before delivery.
- `daily_generation_limit` defaults to 15 and limits normal throughput only.
- Do not generate a waiting-for-feedback job merely to fill unused capacity.
- Late feedback applies to the following cycle.

---

### Task 1: Database queue contract

**Files:**
- Create: `supabase/migrations/<generated>_add_deadline_aware_generation_queue.sql`
- Modify: `supabase/tests/smoke.sql`

- [x] Add the source material and three scheduling timestamps with ordering constraints.
- [x] Replace the claim function with eligibility, mandatory overflow, deadline ordering, and `feedback_missing` recording.
- [x] Add a partial index matching the claim predicate and preserve service-role-only execution.
- [x] Test waiting jobs, feedback-unlocked jobs, cutoff-unlocked jobs, the 15-job normal limit, and mandatory overflow.
- [x] Reset the local database and run the SQL smoke test.

### Task 2: Product and worker documentation

**Files:**
- Modify: `docs/SPEC.md`
- Modify: `docs/generation-workflow.md`
- Modify: `docs/data-model.md`
- Modify: `docs/product-rules.md`

- [x] Document the rolling cadence and exact 48/24-hour boundaries.
- [x] Document claim eligibility, late-feedback handling, capacity overflow, and reporting.
- [x] Check terminology and specification cross-references for consistency.

### Task 3: Hosted verification and delivery

**Files:**
- Modify only the generated migration if verification reveals a defect.

- [x] Run lint, unit tests, typecheck, build, migration reset, and database smoke tests.
- [x] Apply the migration to project `ykzszjrqynrhgdhoeovo` and run focused verification queries.
- [x] Run Supabase security and performance advisors.
- [x] Commit the coherent change and push `main` without force.
