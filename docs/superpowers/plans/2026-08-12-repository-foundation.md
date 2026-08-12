# Repository Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a documented, verifiable project foundation for the paper-first English tutoring service and its future ChatGPT Work generator.

**Architecture:** A pnpm workspace hosts a static React/Vite client plus focused generator and PDF packages. Supabase owns authentication, tenant data, a private artifact catalog, and an idempotent generation queue; the external scheduled worker is documented now and enabled later.

**Tech Stack:** Node.js 24, pnpm, React, TypeScript, Vite, Vitest, ESLint, Supabase/PostgreSQL, GitHub Actions.

## Global Constraints

- Default `daily_generation_limit` is `15` and is editable in Supabase.
- GitHub Actions is CI/deployment only; ChatGPT Work performs future scheduled generation.
- Never commit credentials, real child data, or private generated PDFs.
- `eng-tutor` is reference upstream, never a runtime dependency.
- Do not use TDD; verify after implementation.

---

### Task 1: Establish recoverable repository history

**Files:** Existing `AGENTS.md`, `docs/SPEC.md`, and approved design/plan documents.

- [ ] Initialize Git on `main` and commit the specification-first baseline.
- [ ] Confirm the worktree is clean before structural edits.

### Task 2: Replace the fragmented specification with focused contracts

**Files:** Modify `docs/SPEC.md`; create `docs/architecture.md`, `docs/data-model.md`, `docs/generation-workflow.md`, `docs/product-rules.md`, `docs/eng-tutor-upstream.md`, and `docs/roadmap.md`.

- [ ] Preserve all MVP-defining decisions while removing repetition and obsolete implementation speculation.
- [ ] Make acceptance criteria, non-goals, ownership, and operational boundaries explicit.
- [ ] Search headings and key terms to verify coverage.

### Task 3: Scaffold the pnpm workspace and web application

**Files:** Create root workspace/config files and `apps/web/**`.

- [ ] Scaffold the current React TypeScript Vite template.
- [ ] Add repository-level `dev`, `lint`, `test`, `typecheck`, and `build` commands.
- [ ] Add a minimal product shell and Supabase browser-client boundary.
- [ ] Add focused configuration tests, then run lint, test, type-check, and build.

### Task 4: Define generator and PDF boundaries

**Files:** Create `packages/generator/**` and `packages/pdf/**`.

- [ ] Define typed job/context/result contracts without implementing AI generation.
- [ ] Define PDF artifact names and rendering interface without committing private output.
- [ ] Verify packages through workspace type-check and tests.

### Task 5: Add the initial Supabase contract

**Files:** Create `supabase/config.toml`, `supabase/migrations/*_initial_schema.sql`, and seed documentation.

- [ ] Use the Supabase CLI to create the migration filename.
- [ ] Add profiles, children, subscriptions, feedback, materials, settings, and generation jobs.
- [ ] Add explicit grants, RLS ownership policies, private Storage buckets, idempotency constraints, and a safe claim function for the privileged worker.
- [ ] Verify locally when Docker/Supabase CLI is available; otherwise run static SQL checks and document the remaining environment-dependent verification.

### Task 6: Add CI and future worker runbook

**Files:** Create `.github/workflows/ci.yml`, `.github/workflows/deploy-pages.yml`, `.env.example`, and update `AGENTS.md`/`README.md`.

- [ ] Configure CI for frozen install, lint, test, type-check, and build.
- [ ] Configure GitHub Pages deployment only; do not add lesson-generation cron.
- [ ] Document how a future ChatGPT Work task claims jobs, obtains secrets, uploads artifacts, reports failures, and is manually rerun.
- [ ] Run final repository verification and commit the coherent foundation.
