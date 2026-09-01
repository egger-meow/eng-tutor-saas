# Executor-Agnostic Production Authoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish an executor-agnostic production curriculum authoring protocol and repository helper layer executable interchangeably by local agents (interactive Codex, Codex Desktop Scheduler, Antigravity) and online ChatGPT, safely complete the interrupted production smoke without nested Codex, and document/test the architecture.

**Architecture:** Decouple deterministic database mechanics and package validation from LLM reasoning. The repository helper layer (`production-authoring`) owns active-lease safety checks, authoritative claiming, pre-submit validation (including `writingLines`), immutable submission, read-after-write recovery, and operational mode switching (`local` vs `online`). The active reasoning agent (Antigravity/Codex/ChatGPT) acts as the top-level executor running the canonical production protocol directly without spawning nested child LLM processes.

**Tech Stack:** TypeScript, Node.js, Supabase JS Client, PostgreSQL, `@paper-english/generator`, `@paper-english/worker`, Playwright PDF Finisher.

**Spec:** `docs/SPEC.md` (Sections 114–132, 204, 205, 206, 210), `docs/production-authoring.md`.

## Global Constraints
- Preserve strict data fidelity: never mock data, fake records, or bypass schema rules.
- Check active claims/leases before claiming; never allow overlapping executors to collide.
- Submissions must be immutable; read-after-write verification is required before considering a submission done.
- Preserved `retryContext` and server-owned `inputFingerprint` must be used for surgical repair of quality rejections.
- Maintain online ChatGPT adapter alongside local Codex adapter.
- After completing each task part, commit and push.

---

### Task 1: Repository Authoring Helper Infrastructure & Tests

**Files:**
- Create: `packages/worker/src/authoring-helpers.ts`
- Create: `packages/worker/src/authoring-helpers.test.ts`
- Modify: `packages/worker/src/cli.ts`
- Modify: `package.json`
- Modify: `packages/worker/package.json`

**Interfaces:**
- Produces:
  - `checkActiveLeaseState(client: WorkerClient, workerId?: string): Promise<LeaseStatus>`
  - `claimProductionBatch(client: WorkerClient, workerId: string, options?: { force?: boolean }): Promise<ClaimBatchResult>`
  - `validatePreSubmitPackage(rawPackage: unknown, context: Record<string, unknown>): { valid: boolean; issues: string[] }`
  - `submitProductionPackage(client: WorkerClient, jobId: string, workerId: string, payload: unknown): Promise<{ submitted: boolean; status: string }>`
  - `getSubmissionStatus(client: WorkerClient, jobId: string, workerId: string): Promise<SubmissionStatusResult>`
  - `releaseUnsubmittedClaim(client: WorkerClient, jobId: string, workerId: string, code: string, message: string): Promise<void>`
  - `setSchedulerMode(client: WorkerClient, mode: 'local' | 'online'): Promise<{ mode: string }>`

- [ ] **Step 1: Write the failing unit tests for authoring helpers**
  Test lease checking, claim safety (preventing claim if active lease held by other worker), pre-submit validation (verifying `writingLines >= 1` for short responses/translations without options and fingerprint match), and submission recovery.
- [ ] **Step 2: Run tests to verify failure**
- [ ] **Step 3: Implement `packages/worker/src/authoring-helpers.ts`**
  Implement the deterministic DB and validation helpers.
- [ ] **Step 4: Expose CLI commands in `packages/worker/src/cli.ts` & `package.json`**
  Add commands: `production-authoring status`, `production-authoring claim`, `production-authoring validate`, `production-authoring submit`, `production-authoring submission-status`, `production-authoring release`, `production-authoring mode`.
- [ ] **Step 5: Run tests and verify they pass**
- [ ] **Step 6: Commit**
  `git commit -m "feat(worker): add executor-agnostic production authoring helpers"`

---

### Task 2: Canonical Protocol & Adapters Documentation

**Files:**
- Create: `docs/production-authoring.md`
- Modify: `docs/local-codex-production-authoring.md`
- Modify: `docs/chatgpt-work-daily-schedule.md`
- Modify: `docs/SPEC.md`
- Modify: `docs/SPEC-TOC.md`

**Interfaces:**
- Produces:
  - Canonical run protocol: `current Git SHA → authoritative claim → ordered context processing → research → plan → author → critic → repair → validate → submit → Finisher handoff`
  - Local adapter specifications (interactive agent, Codex Desktop Scheduler, Windows Task Scheduler fallback)
  - Online adapter specifications (ChatGPT interactive, ChatGPT Scheduled Work, narrow-action safety)
  - Updated SPEC Sections 117, 120, 121, 204, 206

- [ ] **Step 1: Draft `docs/production-authoring.md`**
  Document the complete executor-independent production protocol.
- [ ] **Step 2: Update `docs/local-codex-production-authoring.md`**
  Reflect that interactive Codex / Codex Desktop Scheduler executes the canonical protocol directly via repository helpers without nested `codex exec`. Keep nested execution only as an optional headless runner fallback. Include small Codex Desktop Scheduler prompt.
- [ ] **Step 3: Restore active online adapter in `docs/chatgpt-work-daily-schedule.md`**
  Restore ChatGPT online manual and scheduled run specifications with minimized safety surface.
- [ ] **Step 4: Synchronize `SPEC.md` and `SPEC-TOC.md`**
  Update Sections 117, 120, 121, 204, 206 to specify multi-executor architecture and mode switching.
- [ ] **Step 5: Run documentation/contract tests**
  `pnpm test scripts/local-authoring-contract.test.ts`
- [ ] **Step 6: Commit**
  `git commit -m "docs: establish canonical production authoring protocol and multi-executor adapters"`

---

### Task 3: Execute Real Production Smoke via Direct-Agent Protocol

**Files:**
- Output/DB: Supabase `generation_jobs`, `curriculum_submissions`, `materials`
- Generated PDFs: `output/pdf/` (git-ignored)

- [ ] **Step 1: Verify no active claim/lease exists**
  Run `pnpm production-authoring status` to confirm `canClaim: true` and 0 active claims.
- [ ] **Step 2: Claim exactly one authoritative batch**
  Run `pnpm production-authoring claim --worker antigravity-agent`.
  Confirm 2 jobs claimed: `28b9908e-6a4e-4184-b6ee-15ddacf4ed6f` and `c701d4ff-fec8-47f1-a71c-40956bd03589`.
- [ ] **Step 3: Read authoritative `retryContext` from claimed snapshot**
  Inspect the previous canonical packages and failure evidence:
  `questions.q2-p1.writingLines: Written responses require writing space`
  `questions.q-p2.writingLines: Written responses require writing space`
- [ ] **Step 4: Perform targeted surgical repair**
  Preserve all valid content, question IDs, mappings, and `inputFingerprint`. Add `writingLines: 2` (or >= 1) to `q2-p1` and `q-p2`.
- [ ] **Step 5: Pre-submit validate both packages**
  Run `pnpm production-authoring validate` on each package to ensure zero validation or audit findings.
- [ ] **Step 6: Submit packages immutably**
  Run `pnpm production-authoring submit` for both jobs.
- [ ] **Step 7: Verify read-after-write submission status**
  Run `pnpm production-authoring submission-status` for both jobs, confirming status `SUBMITTED_AWAITING_FINISHER`.
- [ ] **Step 8: Run the deterministic Finisher**
  Run `pnpm worker process-submissions --processor github-actions-finisher --limit 15`.
- [ ] **Step 9: Verify final database state**
  Confirm in Supabase:
  - Both jobs are `status = 'completed'`
  - Both submissions in `curriculum_submissions` are `status = 'completed'`
  - Both materials created in `materials` table with valid PDF URLs and zero duplicate rows.
- [ ] **Step 10: Commit any smoke-related state / logs**
  `git commit -m "chore(worker): verify production smoke repair and finisher completion"`

---

### Task 4: Operational Scheduler Mode Switcher & Verification

**Files:**
- Create/Modify: `supabase/migrations/20260901060000_production_scheduler_modes.sql` (if operational settings / pg_cron toggle migration needed)
- Modify: `packages/worker/src/authoring-helpers.ts`

- [ ] **Step 1: Implement database operational settings / RPC for mode switching**
  Create RPC `worker_set_scheduler_mode(mode text)` that cleanly toggles between `local` (unscheduling online pg_cron) and `online` (scheduling online claim staging).
- [ ] **Step 2: Add migration and verify remote DB execution**
- [ ] **Step 3: Test `production-authoring mode local` and `production-authoring mode online`**
- [ ] **Step 4: Run full repository regression test suite**
  `pnpm lint`
  `pnpm test`
  `pnpm typecheck`
  `pnpm build`
- [ ] **Step 5: Commit and push**
  `git commit -m "feat(worker): add operational scheduler mode switching and verify complete protocol"`
  `git push origin main`
