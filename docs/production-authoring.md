# Executor-Agnostic Production Authoring Protocol

## 1. Overview and Core Architectural Rule

Curriculum authoring in Paper English is **executor-agnostic**. The authoring system is not tied to a single proprietary runtime or local machine.

The canonical protocol is designed so that multiple executors can fulfill the authoring stage interchangeably:

1. **Interactive local agents** (e.g. Antigravity, local Codex CLI interactive sessions)
2. **Codex Desktop Scheduler** (scheduled background authoring tasks)
3. **Repository local helper/runner** (CLI batch authoring)
4. **ChatGPT online / manual execution** (staged claims, browser prompt execution)
5. **ChatGPT Scheduled Work** (daily server-side scheduled claims via pg_cron)

Local Windows execution is a primary local environment, but it is **one client of the protocol, not the protocol itself**. The database state, claim leases, immutable submission bridge, and the GitHub Actions Finisher are the single source of truth.

```text
               Authoritative Queue & Claim
             (Supabase: generation_jobs)
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
   [Local Mode]                      [Online Mode]
• Local interactive Codex        • ChatGPT Scheduled Work (pg_cron)
• Antigravity agent              • ChatGPT Web / Custom GPT manual
• Codex Desktop Scheduler
• Local worker CLI
         │                                 │
         └────────────────┬────────────────┘
                          ▼
            Targeted Repair & Pre-submit Validation
                          │
                          ▼
            Immutable Submission Bridge
       (private_generation.curriculum_submissions)
                          │
                          ▼
             Deterministic Finisher
          (PDF rendering, Storage, Materials)
```

---

## 2. Mandatory Input: Compiled Production Authoring Bundle

Before performing any curriculum generation or repair work, every authoring executor MUST:
1. **Read `packages/generator/bundles/production-authoring-bundle.md`**: Treat this current compiled bundle as the authoritative, non-negotiable curriculum-generation contract. Do not rely on agents discovering the bundle indirectly through `AGENTS.md` or `SPEC.md`.
2. **Verify and record bundle provenance**: Check and record the current repository Git commit SHA and the bundle frontmatter metadata (`bundleVersion`, `promptVersion`, `schemaVersion`) before claiming any production queue batch.
3. **Strict real data fidelity**: Adhere strictly to the core pedagogical guidelines, CAP alignment, and real data rules in the bundle. Never invent synthetic exercises or mock data.

---

## 3. Queue & Lease Protocol (Collision Prevention)

Before claiming any production work, an executor must never blindly claim. It must check for active authoritative leases.

### Lease Checking
- **Helper CLI**: `pnpm worker production-authoring status [--worker <worker_id>]`
- **Database RPC**: `public.worker_get_active_generation_leases()`
- **Rules**:
  - If an active lease is held by *another* worker (`canClaim: false`, `isOwnedByCaller: false`), the executor MUST halt to avoid dual-executor collisions in production.
  - If an active lease is already held by *this* worker (`isOwnedByCaller: true`), the executor resumes the active batch rather than claiming a duplicate lease.
  - If no active leases exist (`hasActiveClaim: false`), the executor proceeds to claim.

### Authoritative Batch Claim
- **Helper CLI**: `pnpm worker production-authoring claim --worker <worker_id>`
- **Database RPC**: `public.worker_claim_local_authoring_batch(worker_id)` (or `private_generation.chatgpt_claim_generation_batch(worker_id)`)
- Claims up to capacity (default normal limit: 15 jobs).
- Generates and records an immutable `inputFingerprint` in the claim snapshot.
- Returns each job's `GenerationContext` including `jobId`, `childId`, `profile`, `curriculumCapsules`, and any `retryContext`.

---

## 4. Authoritative Retry & Targeted Repair Contract

When a claimed job has an existing authoring attempt that failed validation or quality review, the claim payload includes an authoritative `retryContext`.

### Invariants for Authoring & Retries:
1. **Authoritative Curriculum Bundle**: Authoring executors MUST read `packages/generator/bundles/production-authoring-bundle.md` and treat the current compiled production-authoring bundle as the authoritative curriculum authoring contract.
2. **Evidence-Driven**: Targeted repair MUST be guided strictly by `retryContext.findings` and `retryContext.failureEvidence`.
3. **Immutability & Preservation**: Preserve all valid package content, stable IDs, stage ordering, learning objectives, and `inputFingerprint`.
4. **Never Synthesize Fake Data**: Follow the Strict Real Data Rule (`rules/strict-data-fidelity.md`). Never invent placeholder data or bypass quality checks.
5. **Writing Space & Schema 2.4.0**:
   - Non-MCQ questions (`translation`, `sentence-production`, `short-response`) require `writingLines >= 1` or a valid `responseLayout` (`lines`, `table`, or `organizer`).
   - Assessment items in `cap-transfer`, `independent` (4 options), and `homework` (4 options) require corresponding internal `cap-plan:<questionId>` checks in `qualityEvidence.criticalChecks`. Intentional grammar/vocabulary recall items outside `cap-transfer` must explicitly declare `"intentionalRecall": true`.
   - Reading-dependent items require an internal `evidence-plan:<questionId>` with canonical `evidenceAnchors` resolving to `studentLesson.reading.blocks`.

---

## 5. Pre-Submit Validation

Every package must be validated locally before submitting over the wire.

- **Helper CLI**:
  ```powershell
  pnpm worker production-authoring validate --package <path-to-package.json> --context <path-to-context.json>
  ```
- **Checks performed**:
  - `CurriculumPackageSchema` (Schema 2.4.0) strict validation.
  - `inputFingerprint` exact match against claimed context.
  - `jobId` and `childId` exact match.
  - `model` metadata (must indicate `gpt-5.6-sol`).
  - `promptVersion` (matches active production prompt, e.g. `prompt/2.11.0`).
  - Finisher audit policy (`auditCurriculumPackage` with `applyFinisherAuditPolicy`).

Submission is blocked unless `validatePreSubmitPackage` passes with `valid: true`.

---

## 6. Immutable Submission & Read-After-Write Verification

### Submission Bridge
- **Helper CLI**:
  ```powershell
  pnpm worker production-authoring submit --worker <worker_id> --job <job_id> --package <path-to-package.json>
  ```
- **Database RPC**:
  `public.worker_submit_local_curriculum_package(p_job_id, p_generation_worker_id, p_payload_text)`
  (internally maps to `private_generation.chatgpt_submit_curriculum_package_v2`).
- Stores the canonical package into `private_generation.curriculum_submissions` at `authoring_attempt = job.attempt_count`.
- Idempotent: re-submitting the exact same package for the same attempt returns `deduplicated: true`.

### Read-After-Write Status Verification
- **Helper CLI**:
  ```powershell
  pnpm worker production-authoring submission-status --worker <worker_id> --job <job_id>
  ```
- **Database RPC**:
  `public.worker_local_curriculum_submission_status(job_id, worker_id)`
- Verifies that `submissionFound: true` and `status` is `'pending'` (ready for Finisher).

---

## 7. Deterministic Finisher Execution

PDF rendering and Supabase storage uploads are **never performed by the authoring executor**. They belong exclusively to the deterministic Finisher.

- **Finisher Processor Command**:
  ```powershell
  pnpm worker process-submissions --processor github-actions-finisher --limit 15
  ```
- **Responsibilities of Finisher**:
  1. Claims pending submissions via `worker_claim_curriculum_submissions`.
  2. Runs canonical schema and audit validation.
  3. Uses Playwright to render deterministic Student and Parent Answer PDFs.
  4. Uploads PDFs to private Supabase storage (`materials/<child_id>/<job_id>/...`).
  5. Inserts the completed material into `public.materials`.
  6. Marks `public.generation_jobs` as `status: 'completed'` with `completed_at` and `material_id`.
  7. Updates `private_generation.curriculum_submissions` to `status: 'completed'`.

---

## 8. Scheduler Modes: Local vs. Online

Paper English supports switching between local authoring and server-side online authoring without schema or codebase changes.

### Mode Inspection & Switching
- **View current mode**:
  ```powershell
  pnpm worker production-authoring mode
  ```
- **Set local mode** (disables pg_cron online claim):
  ```powershell
  pnpm worker production-authoring mode --set local
  ```
- **Set online mode** (enables 16:10 UTC / 00:10 Taipei Time pg_cron claim for ChatGPT Scheduled Work):
  ```powershell
  pnpm worker production-authoring mode --set online
  ```

---

## 9. Supported Executor Adapters

| Executor | Documentation / Guide | Claim / Ingestion Path | Submission Path | Status / Release |
| :--- | :--- | :--- | :--- | :--- |
| **Interactive Codex / Antigravity Agent** | `docs/production-authoring.md` | `pnpm worker production-authoring claim` | `pnpm worker production-authoring submit` | `submission-status` / `release` |
| **Codex Desktop Scheduler** | `docs/local-codex-production-authoring.md` | Scheduled runner task invoking helper CLI | Helper CLI `submit` | Helper CLI status |
| **Local Batch Runner** | `docs/local-codex-production-authoring.md` | `pnpm worker generate-claimed` | `worker_submit_local_curriculum_package` | Finisher / Status RPC |
| **ChatGPT Online Manual (Custom GPT)** | `docs/chatgpt-work-daily-schedule.md` | Authoring Bridge `POST /start` (or `GET /batch` recovery) | Authoring Bridge `POST /submit` | `GET /status`, `POST /release` |
| **ChatGPT Online Scheduled Work** | `docs/chatgpt-work-daily-schedule.md` | Server-staged snapshot (16:10 UTC cron) | Connected app bridge submission | Connected app bridge status |
