# Local Codex Production Authoring

The sole production curriculum author is the repository-owned local Windows runner:

```text
Windows Task Scheduler
→ pnpm worker author-local-codex
→ service-role-only authoritative Supabase claim bridge
→ private no-web Codex planning
→ privacy-screened generalized live-web research
→ private no-web Codex authoring (ChatGPT login)
→ repository validation and bounded repair
→ immutable curriculum submission
→ existing GitHub Actions Finisher
→ deterministic PDFs, private Storage, completion
```

It does not use the OpenAI API, `OPENAI_API_KEY`, the Responses API, ChatGPT apps/plugins, or the Supabase ChatGPT connector. Codex CLI must be at least 0.144.0, report `Logged in using ChatGPT`, and support non-interactive `codex exec`. Production uses `gpt-5.6-sol` with `model_reasoning_effort="low"`.

## Manual run

From `C:\IDEA\eng-tutor-saas`:

```powershell
pnpm worker author-local-codex
```

The worker loads `SUPABASE_URL` and `SUPABASE_SECRET_KEY` from the existing root `.env` without printing them. One invocation performs exactly one authoritative batch claim. It processes returned jobs in order, preserves server-owned fingerprints and retry context, validates locally, performs at most two surgical repair rounds, and submits immutable canonical JSON. It never renders PDFs.

Private context is available only to planning and authoring stages that set `web_search="disabled"`. Planning receives a bounded topic-only capsule, while authoring receives the complete authoritative context. A separate live-search stage receives only a validated, digit-free generalized brief; the runner rejects identifiers, contact data, personal attributes, profile/feedback language, URLs, and exact sensitive context values before that stage starts. Planning and public research run from separate isolated OS temporary directories, preventing repository instruction discovery and keeping the public stage away from the private context path.

Private contexts and candidate packages live only under the git-ignored `.runtime/private-generation/` directory. Isolated planning/research temporary directories are removed immediately after their stage. Successful and failed job directories are removed; abandoned private directories older than 24 hours are cleaned at startup. Privacy-safe daily logs are written under `.runtime/logs/`.

## Windows Task Scheduler

Install or update the daily 00:15 task idempotently:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-production-authoring-task.ps1
```

The task uses the current Windows account so the existing ChatGPT Codex login is available. It wakes the computer, starts as soon as possible after a missed time, ignores overlapping starts, uses a hidden non-interactive PowerShell process, requires a clean `main`, fetches `origin/main`, and permits only a fast-forward update.

Run the launcher manually:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-production-authoring.ps1
```

Disable the schedule:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-production-authoring-task.ps1 -Disable
```

The local mutex `Local\PaperEnglishProductionAuthoring` prevents overlapping author runs. A nonzero exit code means preflight, Git update, authoring, validation, submission, or recovery failed.

## Cutover contract

Migration `20260901050000_local_codex_authoring_bridge.sql` unschedules `paper-english-chatgpt-claim-daily` and grants only four narrow public RPC wrappers to `service_role`: claim, submit, status recovery, and confirmed-unsubmitted release. The private authoritative claim and immutable submission implementations remain unchanged.

The old ChatGPT Scheduled Work task must remain disabled. The first production smoke must use the manual command, verify retry context and targeted repair for normal reclaimed quality failures, then observe the existing `Finish curriculum submissions` GitHub Actions workflow before installing the daily task.
