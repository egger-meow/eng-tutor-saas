# Student Memory Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the MVP child-learning memory model, close current RLS gaps, and keep parent-facing child management safe.

**Architecture:** Add one forward-only Supabase migration for child profiles, curriculum progress, compact learning state, richer feedback/material metadata, subscription lifecycle fields, and typed enrollment settings. Keep curriculum identifiers as stable Git-owned text IDs, keep generation workers server-only, and archive children instead of deleting them.

**Tech Stack:** PostgreSQL 15, Supabase Auth/RLS/Storage, TypeScript, React, Vitest, pnpm.

## Global Constraints

- Preserve parent → child ownership and one subscription per child.
- Keep `daily_generation_limit = 15` configurable in `operational_settings`.
- Do not alter already-applied migrations or expose private job internals to browser roles.
- Do not add a billing ledger, mastery engine, or duplicated curriculum catalog.
- Implement first, then run focused and final verification; TDD is not requested.

---

### Task 1: Forward-only schema and security migration

**Files:**
- Create: `supabase/migrations/<timestamp>_complete_student_memory.sql`

- [x] Add `child_profiles`, `child_vocab_progress`, `child_grammar_progress`, and `child_learning_state` with ownership RLS, checks, foreign keys, timestamps, and useful indexes.
- [x] Add `children.textbook_version` and `children.next_generation_at`.
- [x] Expand feedback, material provenance, and subscription lifecycle metadata without breaking existing rows.
- [x] Add singleton typed `enrollment_settings`; retain operational integer settings for worker limits.
- [x] Replace broad child CRUD policy with select/insert/update policies and revoke browser deletion.
- [x] Make feedback source links immutable and require material/child ownership consistency on update.
- [x] Remove browser access to raw `generation_jobs`; add missing foreign-key indexes.

### Task 2: Parent-facing archive behavior

**Files:**
- Modify: `apps/web/src/lib/children.ts`
- Modify: `apps/web/src/App.tsx`

- [x] Replace hard deletion with `is_active = false` archival.
- [x] List only active children in the current MVP screen and use archive-specific UI copy.

### Task 3: Contract documentation and database verification

**Files:**
- Modify: `docs/data-model.md`
- Modify: `supabase/tests/smoke.sql`

- [x] Document stable versus dynamic child memory, provenance, enrollment settings, and browser/server boundaries.
- [x] Extend smoke coverage for new records/defaults, cross-family RLS, feedback integrity, child delete denial, and the 15-job limit.
- [x] Run local reset/database tests, lint, unit tests, typecheck, build, and `git diff --check`.
- [x] Push the migration to the linked hosted Supabase project and run advisors.
- [x] Commit and push the repository branch.
