# Executor-Agnostic Production Authoring Protocol

## 1. Overview and Core Architectural Rule

Curriculum authoring in Paper English is **executor-agnostic**. The authoring system is not tied to a single proprietary runtime or local machine.

The canonical protocol is designed so that multiple executors can fulfill the authoring stage interchangeably:

1. **Interactive local agents** (e.g. Antigravity, local Codex CLI interactive sessions)
2. **Codex Desktop Scheduler** (scheduled background authoring tasks)
3. **Repository local helper/runner** (CLI batch authoring)
4. **ChatGPT online / manual execution** (staged claims, browser prompt execution)
5. **ChatGPT Scheduled Work** (daily server-side scheduled claims via pg_cron)
6. **ChatGPT Week 1 Fast Lane** (`chatgpt-week1-fast`, event-triggered first-packet authoring)

Local Windows execution is a primary local environment, but it is **one client of the protocol, not the protocol itself**. Database state, claim leases, immutable submissions, and server-owned publication state are the source of truth.

Week 1 has one deliberate primary publication-path exception: it skips the independent normal Finisher semantic/audit pass and goes from an already Author/Critic-approved immutable submission into the objective-integrity-only **Week 1 Fast Publisher**. Week 2+ continues through the normal deterministic Finisher. If and only if the Fast Publisher explicitly records `WEEK1_FAST_PUBLISH_FAILED`, that failed immutable Week 1 submission is handed to the normal Finisher as a recovery path. Fresh pending or live-processing Week 1 submissions remain exclusive to the Fast Publisher, so the fallback cannot race normal fast publication.

```text
               Authoritative Queue & Claim
             (Supabase: generation_jobs)
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
   [Normal Authors]                 [Week 1 Fast Author]
Local / Scheduled / Manual             chatgpt-week1-fast
         │                                 │
         └────────────────┬────────────────┘
                          ▼
            Author / Critic / Targeted Repair
                          │
                          ▼
            Immutable Submission Bridge
       (private_generation.curriculum_submissions)
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
       Week 1 submission          Week 2+ submission
              │                       │
              ▼                       ▼
       Fast Publisher            Deterministic Finisher
  objective integrity only       normal quality/integrity path
              │
              ├─ success ───────────────┐
              │                         │
              └─ explicit fast failure ─┼──> Deterministic Finisher recovery
                                        │
                                        ▼
                           Storage / Private weekly PDFs
```

---

## 2. Mandatory Input: Compiled Production Authoring Bundle

Before performing any curriculum generation or repair work, every authoring executor MUST:
1. **Read `packages/generator/bundles/production-authoring-bundle.md`**: Treat this current compiled bundle as the authoritative, non-negotiable curriculum-generation contract. Do not rely on agents discovering the bundle indirectly through `AGENTS.md` or `SPEC.md`.
2. **Verify and record bundle provenance**: Check and record the current repository Git commit SHA and the bundle frontmatter metadata (`bundleVersion`, `promptVersion`, `schemaVersion`) before claiming any production queue batch.
3. **Strict real data fidelity**: Adhere strictly to the core pedagogical guidelines, CAP alignment, and real data rules in the bundle. Forbid invented learner, private, or source facts, while explicitly authoring the new educational passages and exercises required by the production bundle.

---

### Shared interest exploration and compact context (Prompt 2.13.0)

Every entry point uses the bundle's shared `interest-exploration.md` policy. Privately extract public artists, groups, works, characters and specific questions; screen out learner identity and learning records before research. Choose the evidence-supported angle and information structure together after setting the learning target. A creative process or fictional decision can supply substantive knowledge; neither news nor science is mandatory. Preserve good science explanations when they fit.

Choose response formats for the thinking required: timelines, evidence-to-inference organizers, comparisons, sorting and partial worked examples can use existing Schema 2.5.0 tables/organizers/sequences. Keep useful cues, blank answer spaces, and matching parent answers. There is no table frequency quota. Critic and repair preserve useful formats and judge their educational function.

The bundle routing index uses a lossless dictionary table with explicit decoding instructions; selected CAP shards still come from the same recorded Git SHA. Immutable claim snapshots and fingerprints are unchanged. For repairs, retain the latest complete candidate once, all distinct findings and repair instructions; omit an older candidate only when a newer local candidate is actually present. Fixed schema and quality requirements remain available. This reduces serialization duplication, not the required validation or evidence.

## 3. Queue & Lease Protocol (Collision Prevention)

Normal production authoring must check active authoritative leases before claiming. The dedicated Week 1 Fast Lane is intentionally allowed to start while a normal batch is already in flight; its own advisory lock serializes fast-lane starts and row leases / `FOR UPDATE SKIP LOCKED` prevent duplicate job ownership.

### Normal Lease Checking
- **Helper CLI**: `pnpm worker production-authoring status [--worker <worker_id>]`
- **Database RPC**: `public.worker_get_active_generation_leases()`
- **Rules**:
  - If an active normal lease is held by *another* normal worker (`canClaim: false`, `isOwnedByCaller: false`), the normal executor halts.
  - If an active lease is already held by *this* worker, resume rather than claiming again.
  - If no active normal leases exist, proceed to claim.

### Normal Authoritative Batch Claim
- **Helper CLI**: `pnpm worker production-authoring claim --worker <worker_id>`
- **Database RPC**: `public.worker_claim_local_authoring_batch(worker_id)` (or `private_generation.chatgpt_claim_generation_batch(worker_id)`)
- Claims up to normal capacity.
- Generates and records an immutable `inputFingerprint` in the claim snapshot.

### Week 1 Fast Claim
- **Authoring Bridge**: `POST /week1/start`
- **Recovery**: `GET /week1/batch`
- **Pinned worker**: `chatgpt-week1-fast`
- **Scope**: only jobs with `source_material_id IS NULL`.
- The fast worker may coexist with an already-running normal authoring batch. It must never claim Week 2+.

---

## 4. Authoritative Retry & Targeted Repair Contract

When a claimed job has an existing authoring attempt that failed validation or quality review, the claim payload includes an authoritative `retryContext`.

### Invariants for Authoring & Retries:
1. **Authoritative Curriculum Bundle**: Authoring executors MUST read `packages/generator/bundles/production-authoring-bundle.md` and treat the current compiled production-authoring bundle as the authoritative curriculum authoring contract.
2. **Evidence-Driven**: Targeted repair MUST be guided strictly by `retryContext.findings` and `retryContext.failureEvidence`.
3. **Immutability & Preservation**: Preserve all valid package content, stable IDs, stage ordering, learning objectives, and `inputFingerprint`.
4. **Never Synthesize Fake Data**: Follow the Strict Real Data Rule (`rules/strict-data-fidelity.md`). Never invent placeholder data or bypass author/critic quality requirements.
5. **Writing Space & Schema 2.5.0**:
   - Non-MCQ questions (`translation`, `sentence-production`, `short-response`) require `writingLines >= 1` or a valid `responseLayout` (`lines`, `table`, `organizer`, or `sequence`).
   - Assessment items in `cap-transfer`, `independent` (4 options), and `homework` (4 options) require corresponding internal `cap-plan:<questionId>` checks in `qualityEvidence.criticalChecks`. Intentional grammar/vocabulary recall items outside `cap-transfer` must explicitly declare `"intentionalRecall": true`.
   - Reading-dependent items require an internal `evidence-plan:<questionId>` with canonical `evidenceAnchors` resolving to `studentLesson.reading.blocks`.

Week 1 speed does **not** mean skipping Author, Critic, research, or targeted repair. On the healthy primary path it removes only the second independent publication-time semantic Finisher gate. If Fast Publisher publication itself explicitly fails, the normal Finisher may run that normal audit as the recovery path rather than leaving the immutable submission stranded.

---

## 5. Pre-Submit Validation

Every package must be validated before submitting over the wire.

- **Helper CLI**:
  ```powershell
  pnpm worker production-authoring validate --package <path-to-package.json> --context <path-to-context.json>
  ```
- **Checks performed** include strict Curriculum Package schema, `inputFingerprint`, job/child identity, model/prompt metadata, and current production authoring quality contract.

Submission is blocked unless pre-submit validation succeeds. The healthy Week 1 Fast Publisher path relies on this already-approved immutable source and performs only objective publication integrity checks afterward. An explicit Fast Publisher technical failure may hand the same immutable source to the normal Finisher recovery path.

---

## 6. Immutable Submission & Read-After-Write Verification

### Submission Bridge
- **Helper CLI**:
  ```powershell
  pnpm worker production-authoring submit --worker <worker_id> --job <job_id> --package <path-to-package.json>
  ```
- **Database RPC**:
  `public.worker_submit_local_curriculum_package(p_job_id, p_generation_worker_id, p_payload_text)`
- Stores the canonical package into `private_generation.curriculum_submissions` at `authoring_attempt = job.attempt_count`.
- Idempotent: re-submitting the exact same package for the same attempt returns `deduplicated: true`.

Every Week 1 submission is server-routed to `publication_path = 'week1_fast'` regardless of which approved production author created it. Every Week 2+ submission remains on the normal Finisher path. `publication_path = 'week1_fast'` remains the provenance of a first-packet submission even if an explicit Fast Publisher failure later requires the normal Finisher recovery path.

### Read-After-Write Status Verification
- **Helper CLI**:
  ```powershell
  pnpm worker production-authoring submission-status --worker <worker_id> --job <job_id>
  ```
- **Database RPC**:
  `public.worker_local_curriculum_submission_status(job_id, worker_id)`
- Verifies that the immutable submission exists before the author stops.

---

## 7. Publication Paths

### 7.1 Week 1 Fast Publisher

Week 1 is defined by `generation_jobs.source_material_id IS NULL`.

The Fast Publisher:
1. claims only fresh Week 1 immutable submissions or expired Fast Publisher processing leases;
2. performs strict schema / identity / release / artifact-path integrity checks;
3. **does not call `auditCurriculumPackageForFinisher()` and does not re-author or repair content**;
4. renders deterministic Student and Parent Answer PDFs;
5. inspects the PDF pair and rejects broken/non-matching artifacts;
6. uploads to private Supabase Storage;
7. atomically creates `public.materials`, completes the job/submission, and releases Week 1 immediately;
8. reanchors Week 2 to the actual Week 1 release plus seven days;
9. on an explicit technical publication failure, records `WEEK1_FAST_PUBLISH_FAILED` and yields that immutable submission to the normal Finisher recovery path instead of repeatedly re-claiming it.

GitHub `repository_dispatch` is only a wake signal. Supabase is the authoritative queue. A five-minute workflow schedule is a publication fallback if the immediate publish doorbell is lost. A lost wake or crashed processing lease is still recovered by Fast Publisher; only an explicitly recorded Fast Publisher publication failure crosses into normal Finisher recovery.

### 7.2 Normal Deterministic Finisher (Week 2+ + explicit Week 1 recovery)

`public.worker_claim_curriculum_submissions` normally claims Week 2+ submissions. It must exclude fresh pending and live-processing Week 1 submissions. The only Week 1 exception is an immutable `publication_path = 'week1_fast'` submission in `technical_failed` with `error_code = 'WEEK1_FAST_PUBLISH_FAILED'`, still bound to its actively claimed Week 1 job and original author identity. That explicit failure may be claimed by the normal Finisher as deterministic recovery.

- **Finisher Processor Command**:
  ```powershell
  pnpm worker process-submissions --processor github-actions-finisher --limit 15
  ```
- It runs the current deterministic validation/audit contract, renders/uploads PDFs, creates materials, and completes normal submissions plus the narrowly defined failed-Week-1 fallback.
- A successful Week 1 fallback still uses the existing Week 1 completion semantics: immediate actual release and Week 2 scheduling from that release anchor.

---

## 8. Scheduler Modes: Local vs. Online

Paper English supports switching between local authoring and server-side online authoring without changing the normal Week 2+ schema or product behavior.

### Mode Inspection & Switching
- **View current mode**:
  ```powershell
  pnpm worker production-authoring mode
  ```
- **Set local mode**:
  ```powershell
  pnpm worker production-authoring mode --set local
  ```
- **Set online mode**:
  ```powershell
  pnpm worker production-authoring mode --set online
  ```

The Week 1 Fast Lane is an orthogonal event-triggered path. It does not change the selected normal scheduler mode. The explicit failed-publication Finisher fallback is recovery behavior, not a scheduler mode.

---

## 9. Supported Executor Adapters

| Executor | Documentation / Guide | Claim / Ingestion Path | Submission Path | Publication / Status |
| :--- | :--- | :--- | :--- | :--- |
| **Interactive Codex / Antigravity Agent** | `docs/production-authoring.md` | `pnpm worker production-authoring claim` | `pnpm worker production-authoring submit` | Week 2+ Finisher; Week 1 Fast Publisher with explicit failure fallback |
| **Codex Desktop Scheduler** | `docs/local-codex-production-authoring.md` | Scheduled runner task invoking helper CLI | Helper CLI `submit` | Server-routed by week |
| **Local Batch Runner** | `docs/local-codex-production-authoring.md` | normal queue claim | bridge submission | Server-routed by week |
| **ChatGPT Online Manual** | `docs/chatgpt-work-daily-schedule.md` | Authoring Bridge `POST /start` / `GET /batch` | `POST /submit` | Server-routed by week |
| **ChatGPT Online Scheduled Work** | `docs/chatgpt-work-daily-schedule.md` | scheduled normal batch | bridge submission | Week 2+ Finisher; Week 1 Fast Publisher with explicit failure fallback |
| **ChatGPT Week 1 Fast Lane** | `docs/superpowers/specs/2026-09-05-week1-fast-lane-design.md` | `POST /week1/start` / `GET /week1/batch` | existing immutable bridge | Fast Publisher primary path; normal Finisher only after explicit publish failure |
