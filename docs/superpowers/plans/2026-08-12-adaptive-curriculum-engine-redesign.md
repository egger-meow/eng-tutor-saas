# Adaptive Curriculum Engine Redesign Implementation Plan

**Goal:** Replace the weak proof-of-concept generator with a self-study-first, CAP-oriented, feedback-adaptive production pipeline whose outputs are taught, validated, rendered, and tracked as one versioned system.

**Architecture:** Expand the canonical lesson into a learning plan, Student lesson, Parent answer projection, and proposed tracking delta. Assemble compact child context from Supabase, generate in stages, reject or repair drafts through deterministic and pedagogical gates, then render and publish immutable PDF revisions.

**Execution rule:** Implement directly and verify after each coherent slice. Do not run the current Kobe Week 2 job through the legacy lesson schema.

## Phase 1 — Product and Data Foundations

- Update the product/curriculum documentation to make incoming junior-high, junior-high, CAP direction, and self-study scaffolding explicit.
- Replace generic interest chips with optional guided free-text lists and support `incoming_grade_7` without falsifying the child's current grade.
- Add versioned profile/preference fields and a migration that preserves existing child records.
- Normalize weekly feedback into learner, personalization, and packet-quality signals while retaining the original parent submission for audit.
- Add material revision and structured quality-observation storage without mutating already published PDFs.

**Verification:** profile migration/backfill, ownership/RLS checks, onboarding desktop/mobile flow, and context-builder fixtures for sparse and detailed profiles.

## Phase 2 — Curriculum Contract and Assets

- Replace the v1 schema with the four-part curriculum package defined in the design.
- Add curriculum identifiers for vocabulary, grammar, reading skills, CAP item types, difficulty bands, prerequisites, and spaced review.
- Port intentionally reviewed principles and minimum-quality checks from `eng-tutor`; record source commit/files and production differences.
- Create representative regression fixtures: incoming Grade 7, Grades 7–9, sparse feedback, repeated mistakes, school-progress conflict, changed interest, too-easy, too-hard, and missing-feedback cases.

**Verification:** schema/type checks and fixture validation proving target coverage, exact answer mapping, tracking provenance, and no private history leakage.

## Phase 3 — Generation and Quality Engine

- Implement compact context assembly with explicit evidence and token budgets.
- Add versioned prompts for diagnostic planning, lesson authoring, answer/tracking projection, independent critique, and targeted repair.
- Implement deterministic educational validators and critical-failure classification.
- Add capped repair orchestration, structured attempt logs, token/cost telemetry, and fail-closed review status.
- Ensure product-quality comments alter the appropriate rubric/presentation decisions rather than masquerading as learner mistakes.

**Verification:** run the regression corpus through validation; inject deliberately weak drafts and prove the gates reject all-English instruction, shallow passages, missing scaffolding, ambiguous answers, hidden vocabulary, and fake personalization.

## Phase 4 — Student and Parent PDF System

- Redesign Student PDF sections for bilingual instruction, gradual release, CAP transfer, useful visual rhythm, and printer-safe A4 pagination.
- Keep the Parent PDF compact: answers, acceptable variants, reasoning, likely misconceptions, and short follow-up checks.
- Render both from one validated source and add curriculum/version identity without exposing internal prompts.
- Add artifact checks for clipping, blank/sparse pages, density, glyphs, headers/footers, writing space, and answer leakage.

**Verification:** render every regression packet to PDF and PNG; inspect all pages at desktop resolution and print dimensions; extract text to validate Student/Parent separation.

## Phase 5 — Production Worker and Memory Closure

- Update worker claim/complete flow to consume the new context, quality result, revision metadata, and tracking delta.
- Apply proposed memory changes only through evidence-aware completion/feedback rules.
- Preserve deadline-aware queue semantics: feedback-ready jobs use normal capacity, waiting jobs remain untouched until cutoff, and mandatory jobs may exceed the daily limit.
- Add admin-visible failure and quality summaries suitable for the future ChatGPT Work schedule.

**Verification:** local/Supabase end-to-end run from claimed job through private PDFs, completed material, next job, feedback, normalized signals, and next context.

## Phase 6 — Kobe Real Acceptance Run

- Build Kobe's generation context from current hosted data and submitted feedback.
- Generate through the new engine, never by hand-authoring a showcase PDF.
- Compare against both the rejected Week 1 artifact and supplied `eng-tutor` Week 2 worksheet using the full rubric.
- Inspect every Student and Parent page, then publish only if all critical gates pass.
- Walk the result through feedback intake and prove Week 3 context contains the correct compact learning and quality history.

## Phase 7 — Continuous Improvement Loop

- Add aggregate, privacy-safe rubric trend reporting and repeated-feedback detection.
- Add a scheduled adversarial audit command that proposes—but never automatically deploys—prompt, rubric, curriculum, renderer, and token-efficiency changes.
- Require versioned Git review and regression comparison before promotion.
- Document how real `eng-tutor` teaching observations are reviewed and intentionally ported.

**Final gates:** repository lint, tests, typecheck, production build, migration checks, PDF corpus inspection, hosted parent journey, queue idempotency, storage privacy, and `git diff --check`; then commit and push coherent milestones to `main`.
