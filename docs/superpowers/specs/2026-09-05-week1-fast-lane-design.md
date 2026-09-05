# Week 1 Fast Lane Design

Date: 2026-09-05  
Status: Proposed, user-approved in chat; implementation begins only after this written design is reviewed.  
Scope: First-material authoring latency, event wake-up, fast publication, parent-visible live progress, and truthful Week 1 messaging.  
Production repo: `egger-meow/eng-tutor-saas`

## 1. Goal

A newly admitted child should feel as if Paper English starts making the first personalized packet immediately after the parent finishes onboarding.

Week 1 is acquisition-critical. Optimize **time-to-first-material** without weakening privacy, ownership, artifact integrity, idempotency, or the Author/Critic quality process.

The parent-facing progression is:

```text
✓ 資料已收到
● 已排入教材製作
● 正在製作內容
● 品質檢查與排版
✓ 教材可以下載
```

The active step is animated and visibly alive. Progress is backed by authoritative database state. Never fabricate percentages, countdowns, or fake completion estimates.

Week 2 and later stay on the existing rolling weekly pipeline.

## 2. Permanent Architectural Split

```text
Week 1
explicit job
→ near-real-time wake
→ Author/Critic/repair
→ immutable submission
→ Week 1 Fast Publisher
→ render/inspect/upload/complete
→ immediate release

Week 2+
explicit job
→ normal authoring
→ immutable submission
→ deterministic Finisher
→ normal release lifecycle
```

The Week 1 Fast Publisher is **not the normal Finisher**.

For Week 1, skip the independent Finisher semantic/audit publication gate after Author/Critic. The authoring stage remains responsible for real production quality and keeps:

- current production-authoring bundle;
- public research;
- planning;
- authoring;
- Critic review;
- targeted repair;
- pre-submit validation;
- immutable submission;
- read-after-write verification.

The Fast Publisher keeps only non-bypassable publication integrity needed to safely create a real artifact:

- canonical structure parses;
- job/package/child/release identities agree;
- required question/answer relationships are not corrupt;
- deterministic Student and Parent PDFs render;
- PDF pair inspection succeeds;
- artifact paths belong to the correct job;
- private Storage upload/recovery succeeds;
- material/job/submission completion is atomic and idempotent;
- Week 2 is scheduled from actual Week 1 release.

The Fast Publisher must **not** call `auditCurriculumPackageForFinisher()` or introduce another semantic/pedagogical Critic after Author/Critic.

If Week 1 teaching quality is poor, fix the authoring pipeline. Do not hide authoring defects behind a slow second semantic gate.

## 3. Non-Goals

This change does not:

- change Week 2+ authoring cadence;
- add OpenAI Responses API, Gemini API, or any paid model API;
- generate because arbitrary rows changed;
- make profile edits trigger immediate regeneration;
- expose prompts, reasoning, raw jobs, raw submissions, or technical errors to parents;
- replace explicit `generation_jobs`;
- make GitHub the source of truth;
- add fake progress percentages.

## 4. Existing Invariants to Preserve

1. Every packet starts from an explicit `generation_jobs` row.
2. A worker claims before authoring.
3. Production authoring reads the current Git SHA and compiled production-authoring bundle.
4. Child/private data stays in Supabase and never enters GitHub comments.
5. Public research uses generalized topic queries only.
6. Canonical package source is immutable per authoring attempt.
7. Released materials remain immutable historical artifacts.
8. Week 2+ continues through normal Submission → Finisher.
9. Completed Week 1 may release early, and Week 2 cadence follows actual Week 1 release.
10. Existing historical migrations are immutable audit history. Do not edit old migrations merely because their comments describe the former next-day design; add forward-only migrations and update current SPEC/code/tests instead.

## 5. Fast-Lane Eligibility

A fast-lane job must:

- be entitled and active;
- represent the child’s first canonical packet;
- have `source_material_id IS NULL`;
- have no completed material already attached;
- not be canceled or terminally failed;
- not already be completed through the fast or normal path.

Dedicated authoring identity:

```text
chatgpt-week1-fast
```

Add a server-owned atomic claim/start path that claims **only** eligible Week 1 jobs, conceptually:

```text
public.worker_start_week1_fast_batch('chatgpt-week1-fast')
```

Browser roles have no execution privilege.

The claim path must coexist safely with normal workers:

- never steal a live lease;
- resume a live lease already owned by `chatgpt-week1-fast` rather than claiming twice;
- allow a later normal daily worker to act as fallback if the fast path never acquires the job;
- never fast-claim Week 2+.

## 6. Wake Architecture Without Model API

GitHub acts only as a **doorbell**. Supabase remains the sole job truth.

### 6.1 Permanent Wake PR

Create one permanent draft PR dedicated to Week 1 wake activity. Mark it clearly as operational and never intended for merge.

Wake comments contain only an opaque event ID:

```text
week1-wake:v1:<wake_event_uuid>
```

Never include Email, child name, school, grade, interests, feedback, profile prose, generation context, or other private data. Avoid job ID because the agent does not need it.

ChatGPT Work is configured externally to run an event-triggered task for comment activity on this PR. On wake, Work ignores the comment as generation input, reads current main + production Supabase, and invokes the dedicated Week 1 claim path.

Operational prerequisite as of 2026-09-05: eligible ChatGPT Work users can create webhook-triggered tasks for supported GitHub pull-request activity, including comments depending on trigger configuration. Re-verify this external capability before enablement because product capabilities can change.

### 6.2 Transactional Wake Outbox

Creating an eligible Week 1 job also creates one idempotent private wake-outbox row:

```text
private_generation.week1_wake_outbox

id uuid primary key
job_id uuid unique not null
status pending | sent | failed
attempt_count integer not null
last_error_code text null
created_at timestamptz not null
sent_at timestamptz null
updated_at timestamptz not null
```

No browser role can read it.

For landing first-child onboarding, after trusted activation succeeds, the server attempts the GitHub wake immediately. Failure must not roll back child/job activation. The outbox remains retryable, parent UI stays calm, and the normal daily worker remains the final fallback.

A cheap retry mechanism handles unsent wake rows. Repeated dispatch is safe because authoring claim is authoritative and atomic.

## 7. Week 1 Authoring Contract

The fast author still performs:

```text
claim exactly once
→ record current main SHA + bundle metadata
→ load claimed Week 1 context
→ public research with generalized queries
→ plan
→ author
→ critic
→ targeted repair if needed
→ pre-submit validation
→ immutable submission
→ read-after-write verify
```

Speed does not mean omitting Critic work or knowingly producing a generic worksheet.

The author stops after confirmed immutable submission. It never renders/uploads PDFs itself.

## 8. Immediate Publisher Dispatch

A confirmed Week 1 submission must wake publication immediately instead of waiting for the hourly Finisher schedule.

### 8.1 Publish Outbox

Add a second private outbox keyed by immutable authoring attempt:

```text
private_generation.week1_publish_outbox

id uuid primary key
job_id uuid not null
authoring_attempt integer not null
status pending | sent | failed
attempt_count integer not null
last_error_code text null
created_at timestamptz not null
sent_at timestamptz null
updated_at timestamptz not null
unique(job_id, authoring_attempt)
```

The outbox row is created only after the curriculum submission is durably stored. Dispatch loss can therefore never lose the submission.

### 8.2 Repository Dispatch

After durable submission, the server sends a GitHub `repository_dispatch` event such as:

```text
week1-fast-publish
```

The event carries **no child/job/package payload**. It is only a bell saying "claim pending Week 1 fast submissions now".

The GitHub workflow claims authoritative pending work from Supabase. Duplicate repository-dispatch events are harmless.

If dispatch fails, the publish outbox remains retryable and the immutable submission remains intact.

The server-side GitHub credential must be a repository-scoped GitHub App token or minimum-scope fine-grained token. It must never enter frontend configuration.

## 9. Week 1 Fast Publisher

Add a dedicated workflow, conceptually:

```text
.github/workflows/publish-week1-fast.yml
```

Triggers:

```text
repository_dispatch: week1-fast-publish
workflow_dispatch: operator recovery only
```

Use a concurrency policy that prevents overlapping fast-publisher batches from processing the same submissions. The workflow may claim a small batch of pending Week 1 submissions; it does not need an identity in the dispatch payload.

Fast Publisher flow:

1. checkout current/required production release;
2. install deterministic PDF dependencies;
3. claim only eligible Week 1 fast submissions through a dedicated server-owned RPC;
4. load immutable canonical source;
5. run objective package integrity validation only;
6. stamp deterministic renderer/worker metadata;
7. render Student and Parent Answer PDFs;
8. run deterministic PDF pair inspection;
9. upload/recover canonical private artifacts idempotently;
10. atomically complete material + job + submission;
11. immediately release Week 1;
12. schedule Week 2 from actual Week 1 release;
13. succeed idempotently if work was already completed.

### 9.1 Explicitly Forbidden in Fast Publisher

Fast Publisher must not:

- call `auditCurriculumPackageForFinisher()`;
- run another semantic Critic;
- reject on warning-only pedagogical heuristics;
- author or repair curriculum itself;
- mutate the immutable package;
- substitute another package;
- act on Week 2+;
- publish structurally corrupt, misbound, unrenderable, wrong-child, or unsafe artifacts.

### 9.2 Dedicated Atomic Completion RPC

Do not pretend the publisher is the original authoring worker just to reuse the existing completion lease.

Prefer an explicit RPC such as:

```text
public.worker_complete_week1_fast_submission(...)
```

It verifies:

- current immutable submission attempt;
- valid fast-publisher processor lease;
- `source_material_id IS NULL`;
- no conflicting completed material;
- canonical artifact paths;
- package/job identities;
- idempotency.

One transaction must:

- insert/recover material identity;
- mark generation job `completed`;
- set actual Week 1 release to successful publication time;
- mark curriculum submission completed with an explicit Week 1 fast publication outcome/path;
- schedule/re-anchor Week 2 exactly seven days after actual Week 1 release, honoring existing entitlement and defensive future rules;
- update child next-generation time.

## 10. Parent Progress Projection

Public stages are a **projection** of existing authoritative rows, not a second competing workflow machine:

```text
received
queued
authoring
publishing
ready
```

Use authoritative timestamps for `stage_updated_at` where possible:

- `received`: trusted activation/admission timestamp;
- `queued`: Week 1 job creation timestamp;
- `authoring`: active job claim/start timestamp;
- `publishing`: immutable submission creation / publisher processing timestamp;
- `ready`: job completion/material timestamp.

### `received`

```text
✓ 資料已收到
正在把孩子的程度與學習資料整理成第一份教材需求。
```

### `queued`

`generation_jobs.status = pending` and no later state exists.

```text
● 已排入教材製作
加速通道已啟動，第一份專屬教材正在安排製作。
```

### `authoring`

An active Week 1 claim exists and no immutable submission has advanced the job to publication.

```text
● 正在製作內容
正在依孩子的程度、興趣與學習目標編寫第一週教材。
```

This mapping also works if the normal daily worker becomes the fallback author.

### `publishing`

Current immutable submission exists in `pending`/`processing`, or Fast Publisher holds the active publication lease.

```text
● 品質檢查與排版
內容已經成形，正在整理學生教材與家長解答。
```

The copy may say quality check because Author/Critic has already run and deterministic artifact checks are in progress. It must not imply a second semantic Finisher gate.

### `ready`

Job is completed with a material ID.

```text
✓ 教材可以下載
第一週教材已完成，可以開始使用了。
```

Waitlisted children never show fake production progress.

## 11. Parent-Safe Progress Access

### 11.1 Authenticated

Add an owner-scoped RPC/view exposing only:

```text
stage
stage_updated_at
ready
material_id when normally authorized
```

Never expose raw error fields, worker/processor IDs, canonical source, submission payload, prompts, reasoning, or new private profile data.

### 11.2 Pre-Auth Landing

Anonymous browser roles must not gain general read access to `generation_jobs` or private submissions.

After trusted first-time activation, issue a separate short-lived opaque **progress token**. Store only its hash server-side. Suggested expiry: 2 hours.

Return the raw token only to that browser after successful activation; store it in `sessionStorage`, never analytics metadata or public URL.

A public Edge Function accepts the token and returns the single sanitized Week 1 projection only.

The token:

- is random/unguessable;
- is hashed at rest;
- is single-purpose;
- is short-lived;
- cannot authenticate an account;
- cannot download a PDF;
- cannot reveal Email or profile;
- is scrubbed/revoked after authenticated binding or expiry.

Do not reuse the onboarding handoff token unless a security review proves scope independence. Separate token is the default.

## 12. Live Progress UI

Show the live progress component immediately after successful first-time onboarding and on authenticated child/dashboard surfaces until Week 1 is ready.

### Visual behavior

Completed step:

- solid check icon;
- filled connector through that step;
- calm completed state.

Active step:

- rotating ring around the icon;
- subtle breathing/pulse;
- gentle connector shimmer toward the next step;
- short active copy such as `正在製作中…`.

Future steps remain visible but subdued.

When a stage advances, transition the previous active circle into a checkmark and advance the connector. The visual should feel like the packet is actively taking shape, not like a fake game progress bar.

Honor `prefers-reduced-motion`: static active emphasis and text replace rotation/shimmer.

Prefer existing UI/CSS capabilities; do not add a heavy animation dependency solely for this component.

### Refresh cadence

Pre-auth polling may start fast and back off:

```text
0–30 sec: every 2 sec
30 sec–3 min: every 5 sec
thereafter: every 10 sec
```

Stop on `ready`, `waitlisted`, token expiry, or page teardown.

Authenticated pages may use simple polling or existing Supabase refresh patterns. Realtime is optional, not required.

## 13. Remove Next-Day Parent Promise

All **current parent-facing Week 1** copy must stop promising `隔天` / `明天` / a next-day date.

Preferred truth:

```text
完成孩子資料後，系統會立即開始製作第一份專屬教材；完成後直接開放下載。
```

or:

```text
第一份教材會在資料完成後立即進入製作，你可以在畫面上看到目前進度。
```

Apply to:

- landing FAQ;
- onboarding success;
- pre-Week-1 dashboard/child state;
- help/instruction copy;
- current SPEC and tests describing parent expectation.

Do not mechanically replace unrelated `預計`, such as estimated study duration.

Historical migration files remain untouched.

### Internal fallback release anchor

The legacy next-day `release_at` may remain as an internal fallback anchor if it materially simplifies compatibility with the normal daily worker. While Fast Lane is active, parent Week 1 UI must ignore that fallback timestamp as a promised delivery date.

Successful fast publication immediately advances actual Week 1 release and Week 2 cadence from that real timestamp.

## 14. Failure and Recovery

### Wake dispatch fails
Parent remains `queued`; no GitHub/provider error is shown. Wake outbox retries. Normal daily worker remains fallback.

### Authoring fails before submission
Use existing retry semantics. Parent stays in an authoring/recovery presentation such as `正在重新整理教材內容`, never raw error codes.

### Publisher dispatch fails
Immutable submission and publish outbox remain. Redispatch idempotently.

### Fast Publisher technical failure
Keep submission recoverable and parent in `publishing` with calm copy such as `正在重新整理教材檔案`.

### Structural/integrity failure
Fail closed. Do not publish corruption for speed. Return the submission to established repair/retry/operator recovery with sanitized evidence.

### Long-running packet
After a presentation-only threshold, soften the copy without inventing time:

```text
這份教材比平常多需要一點整理，我們仍在處理中；完成後會直接出現在這裡。
```

## 15. Analytics

Add/reuse first-party events without child data:

```text
week1_fast_queued
week1_fast_authoring_started
week1_fast_submission_ready
week1_fast_publish_started
week1_fast_ready
```

Measure:

- activation → claim;
- activation → immutable submission;
- submission → material completion;
- activation → ready;
- fast-path completion rate vs daily fallback;
- wake dispatch failures;
- publisher dispatch/technical failures.

Never put Email, child name, school, interests, job context, or canonical source in analytics payloads.

## 16. Security Requirements

- No real child data in GitHub comments, dispatch payloads, workflow logs, or repo files.
- Wake IDs are opaque.
- Repository dispatch carries no job payload.
- GitHub credential is server-only and minimally scoped.
- Browser cannot invoke claim/publish RPCs.
- Browser cannot read wake/publish outbox or submissions.
- Pre-auth progress token is hashed, narrow, short-lived, and non-downloadable.
- Parent RLS remains authoritative after login.
- Signed PDF download rules remain unchanged.
- Technical errors stay operator-side.
- Fast Publisher is hard-scoped to first packets and cannot become a Week 2+ bypass.

## 17. Required SPEC Changes

Implementation must intentionally change the product contract rather than silently violate it.

At minimum review/update:

- 25 — Week 1 as Calibration;
- 116 — Next Generation Time;
- 117 — Executor-Agnostic Generation Worker;
- 120 — Scheduled Worker and GitHub Actions;
- 121 — Future Worker Migration;
- 126 — Quality Failure vs Technical Failure;
- 158 — PDF Rendering Architecture;
- 160 — Parent Dashboard;
- 168 — Analytics and Early Funnel;
- 172 — Operational Admin Needs;
- 178 — CI / Deployment;
- 179 — Testing Requirements;
- 193 — Definition of Done: First Material;
- 199 — Definition of Done: Generation Reliability;
- 204 — Agent Instructions if needed;
- 205 — Curriculum Agent Instructions;
- 206 — Core Architectural Summary.

Canonical exception to encode:

> Week 1 Fast Lane skips the independent normal Finisher semantic publication gate and publishes through the dedicated Fast Publisher after successful Author/Critic/pre-submit validation. Week 2+ retains immutable Submission → deterministic Finisher. Structural integrity, privacy, rendering correctness, and wrong-child/artifact protections are never bypassable.

## 18. Testing Strategy

Implementation is test-driven.

### Database

Prove:

- only first-packet jobs enter fast claim;
- Week 2+ cannot fast-claim or fast-publish;
- wake outbox is unique/idempotent per job;
- publish outbox is unique/idempotent per authoring attempt;
- concurrent claims cannot duplicate work;
- progress token reveals only one safe projection;
- another token/account cannot read another child’s progress;
- fast completion is atomic/idempotent;
- Week 2 schedules exactly once from actual Week 1 release;
- normal Finisher cannot double-complete fast-published Week 1;
- normal daily fallback can still complete Week 1 when fast path never claims.

### Worker / publisher

Prove:

- Fast Publisher never calls Finisher semantic audit;
- structural/package identity corruption still fails;
- both PDFs render and inspect;
- canonical private paths are used;
- existing identical artifacts recover safely;
- dedicated completion RPC is used atomically;
- redispatch is idempotent.

### Web

Prove:

- onboarding success immediately renders live Week 1 progress;
- stage comes from server state, not timers;
- active step animates and completed steps settle;
- reduced-motion works;
- ready returns to normal authorized material access;
- waitlist never shows fake progress;
- current parent-facing Week 1 copy does not promise next-day delivery;
- estimated study-duration copy remains intact;
- raw backend errors cannot appear.

### End-to-end smoke

With internal/synthetic data only:

```text
onboarding
→ Week 1 job
→ wake outbox
→ GitHub wake
→ fast claim
→ immutable submission
→ publish outbox
→ repository dispatch
→ Fast Publisher
→ material ready
→ Week 2 scheduled normally
```

## 19. Deployment Order

1. Add forward-only DB schema/RPCs with Fast Lane disabled.
2. Add Fast Publisher code/workflow and prove operator/manual synthetic dispatch.
3. Add parent-safe progress projection/token endpoint.
4. Add wake + publish outboxes and server-side GitHub dispatch.
5. Create permanent Wake PR and configure ChatGPT Work event task.
6. Add web live-progress UI and truthful Week 1 copy.
7. Enable Fast Lane for new Week 1 jobs.
8. Run one internal-test production smoke.
9. Verify Week 2+ still uses normal Finisher.
10. Observe latency/failure telemetry.

Changed migrations are applied forward-only to linked production and verified. Changed Edge Functions are deployed and verified. GitHub workflow must exist before publisher dispatch is enabled.

## 20. Operational Kill Switch

Add a server-owned Fast Lane kill switch.

When disabled:

- new Week 1 jobs remain normal explicit jobs;
- no fast wake dispatch is required;
- existing scheduled authoring/Finisher path remains available;
- parent UI shows truthful generic preparation state rather than instant-generation claims.

No schema rollback is required.

## 21. Definition of Done

Done means:

1. Exactly one initial job exists for an admitted eligible child.
2. Wake event contains no private data.
3. ChatGPT Work can wake and claim only Week 1 without model API usage.
4. Week 1 authoring still follows current bundle + research + Author + Critic + repair + pre-submit validation.
5. Confirmed submission creates durable publish intent and triggers Fast Publisher immediately.
6. Week 1 does not wait for or pass the normal independent Finisher semantic gate.
7. Structural/package/identity/render/storage integrity stays fail-closed.
8. Student/Parent PDFs are privately stored and accessible through normal ownership rules.
9. Week 1 releases immediately after successful publication.
10. Week 2 schedules from actual Week 1 release and returns to normal Finisher path.
11. Landing success and authenticated surfaces show the same safe five-stage live progress.
12. Active stage visibly animates; reduced-motion has a clear static equivalent.
13. No fake percentage or false completion estimate exists.
14. No current parent-facing Week 1 surface promises next-day delivery.
15. Wake/publish failure cannot lose the child/job/submission.
16. Kill switch restores old operational path without rollback.
17. `pnpm lint`, `pnpm test`, relevant DB tests, `pnpm typecheck`, and `pnpm build` pass.
18. One internal-test production smoke proves the full Fast Lane and confirms Week 2 remains normal.

## 22. Final Rule

The Fast Lane optimizes **latency, not truth**.

Removing duplicated Week 1 semantic gatekeeping is intentional. Removing the integrity needed to know that the correct child received a valid, private, renderable PDF pair is not.

```text
Week 1
Author/Critic → immutable submission → Fast Publisher → immediate release

Week 2+
Author/Critic → immutable submission → deterministic Finisher → normal release
```

If Week 1 quality is repeatedly poor, fix Author/Critic/prompt/curriculum. Do not reintroduce a hidden slow second quality gate as a substitute for fixing authoring quality.
