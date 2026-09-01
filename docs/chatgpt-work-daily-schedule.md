# ChatGPT Work & Online Production Authoring Adapter

This document specifies the ChatGPT Scheduled Work and online authoring adapter for the canonical [production-authoring.md](production-authoring.md) protocol.

## 1. Architecture

The online authoring adapter allows ChatGPT Scheduled Work or manual ChatGPT execution to serve as the curriculum author without local workstation dependencies:

```text
Supabase pg_cron (16:10 UTC / 00:10 Taipei Time daily, '10 16 * * *')
→ private_generation.chatgpt_claim_generation_batch
→ staged claim snapshot in private_generation.generation_claim_snapshots
→ ChatGPT Scheduled Work wakes (16:15 UTC / 00:15 Taipei Time)
→ recovers staged batch via narrow Authoring Bridge (/batch)
→ authors canonical curriculum package (GPT-5.6 Sol)
→ submits package via narrow Authoring Bridge (/submit)
→ read-after-write status check via narrow Authoring Bridge (/status)
→ GitHub Actions Finisher (deterministic PDFs, storage, materials)
```

## 2. Eliminating the Generic SQL / Database Connector Safety Gate

### The Problem
Connecting ChatGPT directly to Supabase through the generic Supabase database connector requires broad PostgreSQL permissions. This exposes SQL query execution tools to OpenAI's tool scanner and model prompt, triggering safety review warnings, permission friction, and unpredictable review rejections.

### The Solution: Purpose-Built Edge Function & Narrow OpenAPI Action
Instead of a database connector, online authoring interacts with a dedicated Supabase Edge Function:
`https://<project-ref>.supabase.co/functions/v1/authoring-bridge`

This exposes **only three narrow business operations** via the OpenAPI 3.0 specification ([`docs/authoring-bridge-openapi.yaml`](authoring-bridge-openapi.yaml)):
1. `GET /batch?worker_id=...` (`recoverActiveBatch`): Recovers the staged snapshot.
2. `POST /submit` (`submitCurriculumPackage`): Submits the authored JSON package.
3. `GET /status?job_id=...&worker_id=...` (`getSubmissionStatus`): Read-after-write verification.

### Key Safety Invariants:
- **Zero generic SQL tools**: ChatGPT has no ability to query tables, inspect schemas, or execute raw SQL.
- **Dedicated Bearer Auth**: Authenticates using `AUTHORING_BRIDGE_SECRET` or scoped token.
- **Zero Safety Review Gate**: OpenAI treats the Custom GPT action as a standard REST service, completely bypassing database-connector policies.

## 3. Activating Online Mode

To switch the repository to online scheduler mode:

```powershell
pnpm worker production-authoring mode --set online
```

This invokes `public.worker_set_scheduler_mode('online')`, which:
1. Records `'online'` in `private_generation.production_operational_settings`.
2. Schedules the `paper-english-chatgpt-claim-daily` job in `cron.job` at `10 16 * * *` (16:10 UTC / 00:10 Taipei Time daily).

To switch back to local mode:

```powershell
pnpm worker production-authoring mode --set local
```

## 4. Protocol Invariants Maintained

1. **Single Authoritative Claim**: The 16:10 UTC (00:10 Taipei Time) cron job claims due jobs server-side under worker ID `chatgpt-work-daily`. No second claim can occur while this lease is active.
2. **Read-Only Recovery**: ChatGPT Scheduled Work wakes at 16:15 UTC (00:15 Taipei Time) and calls `GET /batch?worker_id=chatgpt-work-daily`. It does not claim new jobs; it recovers the exact staged batch snapshot.
3. **Immutable Submission**: Submitted packages are validated server-side for:
   - Schema version 2.4.0
   - Exact match of `inputFingerprint`, `jobId`, and `childId`
   - Active claim ownership
4. **Read-After-Write Status Recovery**: If submission response is lost, the agent queries `GET /status?job_id=...&worker_id=...` to confirm persistence before retrying.
5. **No PDF Rendering**: The online author never renders PDFs. The deterministic GitHub Actions Finisher performs rendering, auditing, and storage upload.
