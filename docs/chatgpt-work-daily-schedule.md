# ChatGPT Work & Online Production Authoring Adapters

This document specifies the online authoring adapters for the canonical [production-authoring.md](production-authoring.md) protocol.

## 1. Delineation: Online Manual vs. Online Scheduled Capabilities

Because of current OpenAI product architecture and constraints, online execution is split into two distinct adapters:

```text
                               Online Execution
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
        [Online Manual Adapter]               [Online Scheduled Adapter]
    • Custom GPT / Interactive Chat        • ChatGPT Scheduled Work
    • Narrow OpenAPI Action schema         • Daily server-side claim staging
    • Zero generic SQL capability          • Connected app / bridge RPC recovery
    • Pinned server-side identity          • Current OpenAI product compatibility
```

### Current OpenAI Product Constraint
OpenAI Scheduled Tasks currently do **not** support Custom GPTs or Custom GPT Actions. Consequently, an OpenAPI Action integration cannot be assumed to function inside automated ChatGPT Scheduled Work.

Therefore:
- **Online Manual Adapter**: Uses the narrow `authoring-bridge` Edge Function via the OpenAPI specification ([`docs/authoring-bridge-openapi.yaml`](authoring-bridge-openapi.yaml)) where Custom GPTs / manual Actions are supported by the account.
- **Online Scheduled Adapter**: Maintains the compatible server-side staged claim (`16:10 UTC` pg_cron) and recovered batch via the existing Scheduled Work connected-app bridge until OpenAI natively supports narrow scheduled OpenAPI actions.
- Neither adapter is retired or deleted; both remain supported within their operational scope.

---

## 2. Online Manual Adapter: Narrow Authoring Bridge API

To remove generic SQL/database querying capability and minimize the externally exposed write surface, the online manual adapter interacts exclusively with a dedicated Supabase Edge Function:

`https://ykzszjrqynrhgdhoeovo.supabase.co/functions/v1/authoring-bridge`

Documented via [`docs/authoring-bridge-openapi.yaml`](authoring-bridge-openapi.yaml), this endpoint provides exactly four business operations:

1. `GET /batch` (`recoverActiveBatch`): Recovers the server-staged snapshot without mutating jobs.
2. `POST /submit` (`submitCurriculumPackage`): Submits the authored and locally validated canonical JSON package.
3. `GET /status?job_id=...` (`getSubmissionStatus`): Read-after-write verification.
4. `POST /release` (`releaseUnsubmittedClaim`): Releases an unsubmitted claim back to pending only after verifying no immutable submission exists.

### Security Invariants
- **No Generic SQL**: The model receives no SQL query tools, database schema inspectors, or arbitrary table manipulation permissions.
- **Pinned Worker Identity**: Worker identity is hardcoded server-side to `chatgpt-work-daily`. Callers cannot supply or spoof an arbitrary worker ID.
- **Dedicated Bridge Secret**: Incoming external requests MUST authenticate using `Authorization: Bearer <AUTHORING_BRIDGE_SECRET>`. The internal `SUPABASE_SERVICE_ROLE_KEY` is strictly forbidden as an incoming external credential and will be rejected with HTTP 401. If `AUTHORING_BRIDGE_SECRET` is missing from the server environment, the bridge fails closed with HTTP 503.

---

## 3. Online Scheduled Adapter: ChatGPT Scheduled Work

The automated daily schedule functions via server-side batch staging:

```text
Supabase pg_cron (16:10 UTC / 00:10 Taipei Time daily, '10 16 * * *')
→ private_generation.chatgpt_claim_generation_batch
→ staged claim snapshot in private_generation.generation_claim_snapshots
→ ChatGPT Scheduled Work wakes (16:15 UTC / 00:15 Taipei Time)
→ recovers staged batch via chatgpt_recover_claimed_generation_batch
→ authors canonical curriculum package (GPT-5.6 Sol)
→ submits package via chatgpt_submit_curriculum_package_v2
→ read-after-write status check via chatgpt_curriculum_submission_status
→ GitHub Actions Finisher (deterministic PDFs, storage, materials)
```

### Protocol Invariants Maintained
1. **Single Authoritative Claim**: The 16:10 UTC (00:10 Taipei Time) cron job claims due jobs server-side under worker ID `chatgpt-work-daily`. No second claim can occur while this lease is active.
2. **Read-Only Recovery**: ChatGPT Scheduled Work wakes at 16:15 UTC (00:15 Taipei Time) and recovers the exact staged batch snapshot. It does not claim new jobs.
3. **Immutable Submission**: Submitted packages are validated server-side for:
   - Schema version 2.4.0
   - Exact match of `inputFingerprint`, `jobId`, and `childId`
   - Active claim ownership
4. **Read-After-Write Status Recovery**: If submission response is lost, the agent checks status before retrying.
5. **Deterministic Finisher Boundary**: The online author never renders PDFs. PDF rendering and Storage writes belong exclusively to the GitHub Actions Finisher.

---

## 4. Activating Online Mode

To switch the operational scheduler mode:

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
