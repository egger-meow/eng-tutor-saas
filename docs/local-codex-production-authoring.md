# Local Codex & Windows Runner Production Authoring Adapter

This document describes the local Windows adapter for the canonical [production-authoring.md](production-authoring.md) protocol.

## Architecture

The local authoring adapter executes the canonical production authoring protocol using local tools:

```text
Windows Task Scheduler / Interactive Agent / Codex CLI
→ checkActiveLeaseState (collision check)
→ claimProductionBatch / worker_claim_local_authoring_batch
→ privacy-screened generalized live-web research
→ authoritative authoring (GPT-5.6 Sol)
→ validatePreSubmitPackage (Schema 2.4.0, audit floor, inputFingerprint)
→ submitProductionPackage (immutable curriculum submission)
→ read-after-write verification (getSubmissionStatus)
→ GitHub Actions Finisher (deterministic PDFs, storage, materials)
```

The authoring protocol is executor-agnostic. Top-level agents (such as Antigravity or an interactive Codex CLI session), the Codex Desktop Scheduler, and the repository CLI runner all interact with the database using the same helper layer (`packages/worker/src/authoring-helpers.ts`).

## Codex Desktop Scheduler Prompt

When configuring a Codex Desktop scheduled task, use this exact prompt:

```text
Open C:\IDEA\eng-tutor-saas.

Read AGENTS.md and follow its SPEC-reading protocol for curriculum generation.

Then read:
- docs/production-authoring.md
- docs/local-codex-production-authoring.md
- packages/generator/bundles/production-authoring-bundle.md

Treat the current compiled production-authoring bundle as the authoritative curriculum authoring contract.

Execute exactly one production authoring run using the local adapter.

Use the local Supabase credentials and repository-owned claim/submit/validation helpers.
You are the production author: perform planning, privacy-safe web research, grounding, authoring, independent critic, targeted repair, validation, and submission yourself.

Do not spawn another Codex process.
Never claim more than once.
Preserve every server-owned inputFingerprint exactly.
Treat retryContext as authoritative.
Never render or upload PDFs; hand accepted submissions to the deterministic Finisher.
```

## Interactive / Agent Authoring Workflow

When an interactive agent or engineer runs production authoring:

1. **Verify lease status**:
   ```powershell
   pnpm worker production-authoring status --worker <worker-id>
   ```
2. **Claim the batch**:
   ```powershell
   pnpm worker production-authoring claim --worker <worker-id>
   ```
3. **Plan, research, and author** each package according to prompt rules, preserving `inputFingerprint` and applying `retryContext` failure evidence.
4. **Validate package locally**:
   ```powershell
   pnpm worker production-authoring validate --package <path-to-pkg> --context <path-to-context>
   ```
5. **Submit immutably**:
   ```powershell
   pnpm worker production-authoring submit --worker <worker-id> --job <job-id> --package <path-to-pkg>
   ```
6. **Verify read-after-write status**:
   ```powershell
   pnpm worker production-authoring submission-status --worker <worker-id> --job <job-id>
   ```
7. **Run Finisher**:
   ```powershell
   pnpm worker process-submissions --processor github-actions-finisher --limit 15
   ```

## Automated Local Runner (`pnpm worker author-local-codex`)

From `C:\IDEA\eng-tutor-saas`:

```powershell
pnpm worker author-local-codex
```

The worker loads `SUPABASE_URL` and `SUPABASE_SECRET_KEY` from `.env`. One invocation performs exactly one authoritative batch claim. It processes returned jobs in order, preserves server-owned fingerprints and retry context, validates locally, performs at most two surgical repair rounds, and submits immutable canonical JSON. It never renders PDFs.

Private context is available only to planning and authoring stages that set `web_search="disabled"`. Planning receives a bounded topic-only capsule, while authoring receives the complete authoritative context. Inputs are streamed over stdin rather than placed in command-line arguments or delegated to Codex filesystem tools. A separate live-search stage receives only a validated, digit-free generalized brief; the runner rejects identifiers, contact data, personal attributes, profile/feedback language, URLs, and exact sensitive context values before that stage starts.

Private contexts and candidate packages live only under the git-ignored `.runtime/` directory.

## Windows Task Scheduler

Install or update the daily 00:15 task idempotently:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-production-authoring-task.ps1
```

The task uses the current Windows account. It wakes the computer, starts as soon as possible after a missed time, ignores overlapping starts, uses a hidden non-interactive PowerShell process, requires a clean `main`, fetches `origin/main`, and permits only a fast-forward update.

Run the launcher manually:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-production-authoring.ps1
```

Disable the schedule:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-production-authoring-task.ps1 -Disable
```

The local mutex `Local\PaperEnglishProductionAuthoring` prevents overlapping author runs. A nonzero exit code means preflight, Git update, authoring, validation, submission, or recovery failed.
