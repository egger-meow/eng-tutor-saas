# ChatGPT Work & Online Production Authoring Adapter

This document specifies the ChatGPT Scheduled Work and online authoring adapter for the canonical [production-authoring.md](production-authoring.md) protocol.

## Architecture

The online authoring adapter allows ChatGPT Scheduled Work or manual ChatGPT execution to serve as the curriculum author without local workstation dependencies:

```text
Supabase pg_cron (00:10 UTC daily)
→ private_generation.chatgpt_claim_generation_batch
→ staged claim snapshot in private_generation.generation_claim_snapshots
→ ChatGPT Scheduled Work wakes (00:15 UTC)
→ recovers staged batch via private_generation.chatgpt_recover_claimed_generation_batch
→ authors canonical curriculum package (GPT-5.6 Sol)
→ submits package via private_generation.chatgpt_submit_curriculum_package_v2
→ read-after-write status check via private_generation.chatgpt_curriculum_submission_status
→ GitHub Actions Finisher (deterministic PDFs, storage, materials)
```

## Activating Online Mode

To switch the repository to online scheduler mode:

```powershell
pnpm worker production-authoring mode --set online
```

This invokes `public.worker_set_scheduler_mode('online')`, which:
1. Records `'online'` in `private_generation.production_operational_settings`.
2. Schedules the `paper-english-chatgpt-claim-daily` job in `cron.job` at `10 0 * * *` (00:10 UTC daily).

To switch back to local mode:

```powershell
pnpm worker production-authoring mode --set local
```

## Protocol Invariants Maintained

1. **Single Authoritative Claim**: The 00:10 UTC cron job claims due jobs server-side under worker ID `chatgpt-work-daily`. No second claim can occur while this lease is active.
2. **Read-Only Recovery**: ChatGPT Scheduled Work calls `chatgpt_recover_claimed_generation_batch` with `worker_id: 'chatgpt-work-daily'`. It does not claim new jobs; it recovers the exact staged batch snapshot.
3. **Immutable Submission**: Submitted packages are validated server-side for:
   - Schema version 2.4.0
   - Exact match of `inputFingerprint`, `jobId`, and `childId`
   - Active claim ownership
4. **Read-After-Write Status Recovery**: If submission response is lost, the agent queries `chatgpt_curriculum_submission_status` to confirm persistence before retrying.
5. **No PDF Rendering**: The online author never renders PDFs. The deterministic GitHub Actions Finisher performs rendering, auditing, and storage upload.
