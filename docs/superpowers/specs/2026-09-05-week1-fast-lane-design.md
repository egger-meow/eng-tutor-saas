# Week 1 Fast Lane Design

Date: 2026-09-05
Status: Proposed, user-approved in chat; implementation must not begin until this written design is reviewed.
Scope: First-material authoring latency, fast publication, parent-visible live progress, and truthful Week 1 messaging.
Production repo: `egger-meow/eng-tutor-saas`

## 1. Goal

A newly admitted child should feel as if Paper English starts making the first personalized packet immediately after the parent finishes onboarding.

Week 1 is the acquisition-critical packet. The product should optimize it for **time-to-first-material** without weakening privacy, ownership, artifact integrity, or the quality of the authoring process itself.

The intended parent experience is:

```text
✓ 資料已收到
● 已排入教材製作
● 正在製作內容
● 品質檢查與排版
✓ 教材可以下載
```

The active step is animated and visibly alive. The progression is backed by authoritative database state. The UI must not fabricate percentages or fake progress.

Week 2 and later remain on the existing rolling weekly authoring pipeline.

## 2. Product Decision

Week 1 gets a dedicated **Fast Lane**.

```text
eligible Week 1 job
↓
near-real-time wake signal
↓
ChatGPT Work / compatible authoring executor
↓
research → plan → author → critic → targeted repair
↓
immutable curriculum submission
↓
Week 1 Fast Publisher
↓
render → inspect → private upload → atomic material completion
↓
immediate release
```

The Week 1 Fast Publisher is **not the normal Finisher**.

The independent Finisher semantic/audit publication gate is skipped for Week 1. The authoring stage remains responsible for producing a valid, high-quality package and keeps its current research, Author, Critic, targeted-repair, and pre-submit validation contract.

The Fast Publisher keeps only non-negotiable publication integrity work required to produce a real downloadable artifact safely:

- canonical package structure can be parsed;
- job/package/child/release identities agree;
- required question/answer relationships are not corrupt;
- private PDF artifacts render successfully;
- the Student and Parent PDFs are internally consistent and inspectable;
- artifact paths belong to the claimed Week 1 job;
- uploads succeed to private Storage;
- material/job/submission completion is atomic and idempotent;
- Week 2 is scheduled from the actual Week 1 release anchor.

The Fast Publisher must **not** run `auditCurriculumPackageForFinisher()` or introduce another semantic/pedagogical quality review after the Author/Critic stage.

This distinction is deliberate: if Week 1 authoring quality is poor, the authoring pipeline must be fixed. A second delayed semantic gate should not hide that defect by holding the first customer experience hostage.

## 3. Non-Goals

This project does not:

- change Week 2+ authoring cadence;
- add an LLM API integration;
- call OpenAI Responses API, Gemini API, or another paid model API;
- generate materials from arbitrary database row changes;
- make profile edits trigger immediate regeneration;
- expose internal prompts, model reasoning, raw job records, private child state, or technical errors to parents;
- replace the canonical explicit `generation_jobs` queue;
- invent fake progress percentages;
- make GitHub the source of truth for jobs or child data.

## 4. Existing Architecture to Preserve

The following existing invariants remain authoritative:

1. Every material starts from an explicit `generation_jobs` row.
2. A worker claims before authoring.
3. Production authoring reads the current compiled production authoring bundle.
4. Child/private data stays in Supabase and never enters GitHub comments.
5. Public web research uses generalized topic queries only.
6. Canonical package source is immutable per authoring attempt.
7. Released materials are immutable historical artifacts.
8. Week 2+ continues through the normal submission/Finisher path.
9. Completed Week 1 may release earlier than its original fallback release anchor, and Week 2 cadence follows the actual Week 1 release.

## 5. Fast-Lane Eligibility

A fast-lane job must satisfy all of the following:

- it is an active, entitled generation job;
- it is the child’s first canonical packet;
- `source_material_id IS NULL`;
- no completed material already exists for that child/job;
- the job is not canceled or terminally failed;
- it has not already been successfully completed through either the fast or normal path.

The dedicated worker identity is:

```text
chatgpt-week1-fast
```

A new server-owned claim RPC must claim **only** eligible Week 1 fast-lane jobs. It must never claim Week 2+ work.

Suggested public bridge surface:

```text
public.worker_start_week1_fast_batch('chatgpt-week1-fast')
```

The implementation may use an internal/private helper, but browser roles must never receive execution privilege.

Claiming must stay atomic and collision-safe with all existing workers. If a normal worker already holds a live lease, the fast worker does not steal it. If the fast worker already owns a live lease, recovery resumes that batch rather than creating a second attempt.

## 6. Wake Architecture Without Model API

The Fast Lane uses GitHub only as a **doorbell**, never as the job payload.

### 6.1 Permanent Wake PR

Create one permanent draft pull request dedicated to Week 1 wake events. It must be clearly marked operational and not intended for merge.

A wake comment contains only an opaque, non-private event identifier, for example:

```text
week1-wake:v1:<wake_event_uuid>
```

It must never contain:

- Email;
- child name;
- school;
- grade;
- interests;
- job ID if avoidable;
- profile text;
- feedback;
- generation context.

ChatGPT Work is configured separately to react to comment activity on this PR. On wake, the agent reads the authoritative production repo and Supabase queue, then invokes the dedicated Week 1 claim path. GitHub comment content is never trusted as generation input.

### 6.2 Transactional Wake Outbox

A Week 1 job creation must create an opaque wake-outbox record transactionally or idempotently. Suggested private table:

```text
private_generation.week1_wake_outbox

id uuid primary key
job_id uuid unique not null
status pending | sent | failed
attempt_count integer
last_error_code text null
created_at timestamptz
sent_at timestamptz null
updated_at timestamptz
```

No browser role may read this table.

The outbox gives the wake mechanism retryability without coupling enrollment success to GitHub availability.

### 6.3 Fast Path + Recovery

For the landing first-child flow, after trusted activation succeeds and the Week 1 job exists, the server should attempt to dispatch the wake immediately.

If the GitHub wake call fails:

- onboarding still succeeds;
- the parent sees a calm queued state, not a technical error;
- the outbox remains pending/failed for retry;
- an inexpensive retry mechanism re-attempts unsent wake records;
- the existing daily worker remains a final fallback, so the job cannot disappear.

A dispatch failure must never roll back the admitted child or initial generation job.

## 7. Authoring Contract

The Week 1 authoring executor still performs the real production authoring sequence:

```text
claim exactly once
↓
read current Git SHA + current production bundle
↓
load claimed Week 1 generation context
↓
public research with generalized queries only
↓
plan
↓
author
↓
critic
↓
targeted repair when needed
↓
pre-submit validation
↓
immutable submission
↓
read-after-write verification
```

Speed does not mean omitting Author/Critic or knowingly emitting a generic worksheet.

The authoring executor stops after a confirmed immutable submission. It does not render or upload PDFs itself.

## 8. Immediate Fast Publisher Trigger

A confirmed Week 1 submission should trigger publication immediately rather than wait for the hourly Finisher schedule.

Recommended implementation:

1. The authoritative authoring bridge accepts the immutable Week 1 submission.
2. After the submission is durably confirmed, the server emits a GitHub `repository_dispatch` event for the Week 1 Fast Publisher.
3. The dispatch payload contains only an opaque submission/job identity required by the trusted workflow, never child profile data.
4. Dispatch failure does not invalidate the submission; a retry/recovery path can dispatch it again idempotently.

The GitHub dispatch credential must be a repository-scoped GitHub App token or fine-grained token with the minimum permission required. It is stored server-side only, never in frontend configuration.

## 9. Fast Publisher

Add a dedicated workflow, conceptually:

```text
.github/workflows/publish-week1-fast.yml
```

Trigger:

```text
repository_dispatch: week1-fast-publish
workflow_dispatch: operator recovery only
```

Concurrency must prevent duplicate processing of the same Week 1 submission while allowing different children to publish independently.

The Fast Publisher:

1. checks out the exact/current production release expected by the submission;
2. installs deterministic PDF dependencies;
3. claims only eligible Week 1 fast submissions through a dedicated server-owned RPC;
4. loads the immutable canonical package;
5. performs objective package integrity validation only;
6. stamps deterministic renderer/worker version metadata;
7. renders Student and Parent Answer PDFs;
8. runs deterministic PDF pair inspection;
9. uploads/reuses artifacts idempotently under the canonical private paths;
10. atomically completes the material, job, and submission;
11. schedules Week 2 from the actual Week 1 release timestamp;
12. exits successfully if the same submission was already published.

### 9.1 What Fast Publisher Must Not Do

It must not:

- call `auditCurriculumPackageForFinisher()`;
- run a second semantic Critic;
- reject on warning-only pedagogical heuristics;
- retry authoring by itself;
- mutate canonical source;
- silently substitute another package;
- publish a structurally corrupt, misbound, unrenderable, wrong-child, or unsafe artifact.

### 9.2 Dedicated Atomic Completion RPC

Do not reuse the normal Finisher completion semantics by pretending the fast publisher is the authoring worker.

Prefer a dedicated atomic RPC similar to:

```text
public.worker_complete_week1_fast_submission(...)
```

It must verify:

- the submission is the current immutable attempt;
- the fast-publisher processor lease is valid;
- the job is a first-packet job (`source_material_id IS NULL`);
- the job does not already have a different material;
- artifact paths match `child_id/job_id`;
- package/job identities match;
- completion is idempotent.

In one transaction it must:

- insert or recover the material identity;
- mark the generation job completed;
- set Week 1 `release_at` to the effective immediate completion/release time;
- mark the curriculum submission completed with an explicit `week1_fast` publication path/outcome;
- create/re-anchor Week 2 exactly seven days after actual Week 1 release, subject to the existing future guard and entitlement rules;
- update the child’s next generation time.

## 10. Progress Model

Parent progress is a projection of authoritative state, not a new competing workflow state machine.

Canonical public stages:

```text
received
queued
authoring
publishing
ready
```

Recommended mapping:

### `received`
Trusted onboarding activation has succeeded and an eligible child is admitted. The first generation job may be in the same transaction or immediately discoverable.

Parent copy:

```text
✓ 資料已收到
正在把孩子的程度與學習資料整理成第一份教材需求。
```

### `queued`
Week 1 generation job exists and remains `pending`, regardless of whether the wake event has already been sent.

Parent copy:

```text
● 已排入教材製作
加速通道已啟動，第一份專屬教材正在安排製作。
```

### `authoring`
The Week 1 job has an active claim/authoring attempt and no confirmed submission has yet advanced it to publication.

Parent copy:

```text
● 正在製作內容
正在依孩子的程度、興趣與學習目標編寫第一週教材。
```

### `publishing`
A current immutable curriculum submission exists in `pending` or `processing`, or the dedicated fast publisher owns the active publication lease.

Parent copy:

```text
● 品質檢查與排版
內容已經成形，正在整理學生教材與家長解答。
```

The wording intentionally says quality check because Author/Critic quality work has already happened and deterministic artifact checks are happening now; it must not imply a second semantic Finisher gate.

### `ready`
The generation job is completed and has a material ID accessible to the owning parent after normal authorization.

Parent copy:

```text
✓ 教材可以下載
第一週教材已完成，可以開始使用了。
```

### Waitlist
Waitlisted children do not show fake production progress. They show the authoritative waitlist state instead.

## 11. Parent-Safe Progress API

### 11.1 Authenticated Path

Add a parent-owned RPC/view that exposes only safe progress fields for owned children, for example:

```text
stage
stage_updated_at
ready
material_id when authorized
```

It must not expose:

- raw `generation_jobs` error fields;
- claimed worker IDs;
- processor IDs;
- prompt/model reasoning;
- canonical source;
- submission payload;
- private child/profile fields not already part of the parent surface.

### 11.2 Pre-Auth Landing Path

The anonymous browser must not receive general read access to `generation_jobs` or private submissions.

When trusted first-time activation succeeds, create a separate short-lived opaque **progress token**. Store only its hash server-side. Suggested expiry: 2 hours, extendable only by normal authenticated access rather than token refresh.

The start-onboarding response may return the raw progress token to the same browser after activation. Store it in session storage, not analytics metadata and not a public URL.

A public Edge Function accepts only this token and returns a sanitized progress projection for the single associated Week 1 job.

The progress token:

- is random and unguessable;
- is stored hashed at rest;
- is single-purpose;
- is short-lived;
- does not authenticate the parent account;
- cannot download PDFs;
- cannot reveal Email or child profile;
- can be revoked/scrubbed after successful authenticated binding or expiry.

The existing onboarding handoff token must not be repurposed as the progress token unless a security review proves the scopes remain independent. Separate tokens are preferred.

## 12. Live Progress UI

The progress component appears immediately after successful first-time onboarding and on the authenticated child/dashboard surface until Week 1 becomes ready.

### 12.1 Visual Behavior

The component uses a vertical or compact horizontal five-step timeline depending on viewport width.

Completed steps:

- solid check icon;
- calm completed styling;
- connector line filled through the completed step.

Active step:

- rotating ring around the step icon;
- subtle breathing/pulse on the active card;
- gentle shimmer or moving highlight in the connector toward the next step;
- copy such as `正在製作中…` that makes current work legible.

Future steps:

- visible but subdued;
- no fake countdown;
- no percentage.

When a stage advances, use a short transition so the checkmark and connector visibly settle into place.

### 12.2 Motion Safety

Honor `prefers-reduced-motion`. With reduced motion, replace rotation/shimmer with static active styling and text.

Do not add a heavy animation dependency solely for this component. Prefer existing project animation tools or CSS.

### 12.3 Polling / Refresh

Pre-auth progress may poll the sanitized progress endpoint aggressively at first and back off while waiting, for example:

```text
0–30 sec: every 2 sec
30 sec–3 min: every 5 sec
thereafter: every 10 sec
```

Stop polling immediately on `ready`, `waitlisted`, token expiry, or page teardown.

Authenticated pages should use the simplest existing refresh mechanism compatible with Supabase. Realtime may be used only if it materially reduces complexity; a short polling interval is acceptable for this single transient Week 1 state.

## 13. Truthful Timing and Copy Changes

Public product copy must stop promising that the first packet arrives "tomorrow" or "the next day".

Replace parent-facing Week 1 timing language with truthful immediate-start wording such as:

```text
完成孩子資料後，系統會立即開始製作第一份專屬教材；完成後直接開放下載。
```

or:

```text
第一份教材會在資料完成後立即進入製作，你可以在畫面上看到目前進度。
```

This applies to:

- landing FAQ;
- onboarding success copy;
- dashboard/child pre-Week-1 delivery state;
- help text;
- any other parent-facing Week 1 surface.

Do not mechanically replace unrelated uses of `預計`, such as a sample packet’s estimated study duration.

### 13.1 Internal Fallback Release Anchor

The existing next-day `release_at` may remain internally as a recovery/fallback anchor if keeping it materially simplifies compatibility with the normal daily worker. Parent-facing Week 1 UI must not interpret that fallback timestamp as a promised date while the Fast Lane is active.

If the fast wake path fails, the existing normal worker may still complete the packet. The parent continues to see truthful production state rather than a stale date.

## 14. Failure and Recovery

### Wake dispatch failure

Parent stage stays `queued` with calm copy. No GitHub/API/provider error is shown. Outbox retry continues. Daily authoring remains fallback.

### Authoring failure before submission

Normal job retry semantics remain authoritative. Parent progress stays in `authoring` or a calm recovery variant such as `正在重新整理教材內容`, without exposing error codes.

### Fast Publisher technical failure

The immutable submission remains recoverable. The publisher may be redispatched idempotently. Parent stays in `publishing` with calm copy such as `正在重新整理教材檔案`.

### Structurally invalid submission

The Fast Publisher must fail closed. It must not publish corrupted content merely for speed. The submission is returned to the established repair/retry path with sanitized failure evidence for the authoring worker/operator.

### Long-running fallback

If progress exceeds an operational threshold, the UI may soften the active copy but must not invent a completion time. Example:

```text
這份教材比平常多需要一點整理，我們仍在處理中；完成後會直接出現在這裡。
```

The threshold is presentation-only and must not mutate job state.

## 15. Analytics

Add or reuse first-party events that measure the new acquisition-critical latency without child data:

```text
week1_fast_queued
week1_fast_authoring_started
week1_fast_submission_ready
week1_fast_publish_started
week1_fast_ready
```

Recommended derived metrics:

- onboarding activation → authoring claim;
- activation → immutable submission;
- submission → PDF/material completion;
- activation → first material ready;
- percentage completed by fast path vs daily fallback;
- wake dispatch failure rate;
- fast publisher technical failure rate.

Never place Email, child name, school, interest text, job context, or canonical source in analytics payloads.

## 16. Security Requirements

- No real child data in GitHub comments, workflow payloads, logs, or repo files.
- Wake IDs are opaque.
- GitHub dispatch credential is server-only and minimally scoped.
- Browser cannot invoke Week 1 claim/publish RPCs.
- Browser cannot read private wake/submission tables.
- Pre-auth progress tokens are hashed, short-lived, narrow-scope, and non-downloadable.
- Parent RLS remains authoritative after login.
- Signed PDF download rules remain unchanged.
- Technical errors stay in server/operator logs, never parent UI.
- Fast Publisher can publish only `source_material_id IS NULL` jobs.
- Fast Publisher cannot be used as a generic bypass for Week 2+ quality gates.

## 17. Required SPEC Contract Changes

Implementation must intentionally update the existing product contract rather than silently violate it.

At minimum review and update the relevant text in:

- Section 25 — Week 1 as Calibration;
- Section 116 — Next Generation Time;
- Section 117 — Executor-Agnostic Generation Worker;
- Section 120 — Scheduled Worker and GitHub Actions;
- Section 121 — Future Worker Migration;
- Section 126 — Quality Failure vs Technical Failure;
- Section 158 — PDF Rendering Architecture;
- Section 160 — Parent Dashboard;
- Section 168 — Analytics and Early Funnel;
- Section 172 — Operational Admin Needs;
- Section 178 — CI / Deployment;
- Section 179 — Testing Requirements;
- Section 193 — Definition of Done: First Material;
- Section 199 — Definition of Done: Generation Reliability;
- Section 204 — Agent Instructions if needed for the exception;
- Section 205 — Curriculum Agent Instructions;
- Section 206 — Core Architectural Summary.

The SPEC must explicitly state the only exception:

> Week 1 Fast Lane skips the independent normal Finisher semantic publication gate and publishes through the dedicated Fast Publisher after successful Author/Critic/pre-submit validation. Week 2+ retains the normal immutable Submission → deterministic Finisher path.

The wording must also make clear that structural integrity, privacy, rendering correctness, and wrong-child/artifact protections are never bypassable.

## 18. Testing Strategy

Implementation must be test-driven.

### Database tests

Prove:

- only first-packet jobs enter the fast claim path;
- Week 2+ cannot be fast-claimed or fast-published;
- wake outbox is idempotent per job;
- concurrent fast claims cannot duplicate work;
- pre-auth progress token reveals only its single safe projection;
- another token/account cannot read another child’s progress;
- fast completion is atomic and idempotent;
- Week 2 is scheduled exactly once from actual Week 1 release;
- normal Finisher cannot double-complete a fast-published Week 1;
- normal daily fallback can still complete a Week 1 if the fast path never claims it.

### Worker tests

Prove Fast Publisher:

- does not call the Finisher semantic audit;
- still fails on structural/package identity corruption;
- renders both PDFs;
- inspects both PDFs;
- uses canonical private artifact paths;
- recovers existing identical artifacts safely;
- records publication atomically through the dedicated RPC;
- is idempotent when redispatched.

### Web tests

Prove:

- successful landing onboarding immediately renders Week 1 live progress;
- progress is derived from server stage rather than timers;
- active step animates and completed steps settle;
- reduced-motion mode is supported;
- `ready` exposes the normal download/account route, not a token-based download bypass;
- waitlist never shows fake generation progress;
- no Week 1 parent-facing copy promises `隔天`/`明天`;
- unrelated estimated-duration copy remains intact;
- raw backend errors cannot appear in the progress component.

### End-to-end smoke

One synthetic/internal-test child should prove:

```text
onboarding
→ Week 1 job
→ wake outbox
→ fast claim
→ submission
→ fast publisher
→ material ready
→ Week 2 scheduled
```

No real child data is used in CI.

## 19. Deployment Order

Because this change spans DB, Edge Function/server dispatch, GitHub Actions, and web UI, deploy in a fail-safe order:

1. Add DB schema/RPCs with fast path disabled by default.
2. Add Fast Publisher worker/workflow and prove manual synthetic dispatch.
3. Add parent-safe progress endpoints/projection.
4. Add wake outbox and server-side GitHub dispatch support.
5. Configure the permanent Wake PR and ChatGPT Work event task.
6. Add web live-progress UI and new truthful copy.
7. Enable fast-lane admission for new Week 1 jobs.
8. Run a single internal-test production smoke.
9. Verify Week 2+ still uses the normal Finisher path.
10. Observe latency/failure telemetry before broadening operational limits.

Every migration is forward-only. Changed Edge Functions must be deployed to the linked production project and verified. GitHub workflow changes must be merged before enabling server dispatch toward them.

## 20. Operational Kill Switch

Add a server-owned/configurable kill switch for the fast lane.

When disabled:

- new Week 1 jobs remain normal explicit jobs;
- no wake dispatch is attempted;
- existing normal scheduled authoring/Finisher path continues unchanged;
- parent UI falls back to a truthful generic preparation state rather than promising instant generation.

The kill switch is operational protection, not a public product setting.

## 21. Definition of Done

The feature is done only when all of the following are true:

1. A newly admitted eligible child creates exactly one Week 1 job.
2. A wake event is emitted without private data.
3. ChatGPT Work can wake and claim only Week 1 fast jobs without model API usage.
4. Authoring still follows the current production bundle, research, Author, Critic, targeted repair, and pre-submit validation.
5. The confirmed Week 1 submission triggers the Fast Publisher immediately.
6. Week 1 does not wait for or pass through the normal independent Finisher semantic quality gate.
7. Structural/package/identity/render/storage integrity remains fail-closed.
8. Student and Parent PDFs are privately stored and downloadable through normal ownership rules.
9. Week 1 releases immediately on successful publication.
10. Week 2 is scheduled from the actual Week 1 release and returns to the normal weekly Finisher pipeline.
11. The landing success screen and authenticated child/dashboard show the same parent-safe five-stage live progress.
12. The active stage visibly animates, and reduced-motion users receive a clear static equivalent.
13. No fake percentage or false completion estimate exists.
14. No parent-facing Week 1 surface promises next-day delivery.
15. Wake/publish failures fall back safely without losing the child/job.
16. A kill switch can return Week 1 to the old normal path without schema rollback.
17. `pnpm lint`, `pnpm test`, relevant DB tests, `pnpm typecheck`, and `pnpm build` pass.
18. A production internal-test smoke proves the full Week 1 fast path and confirms Week 2 remains normal.

## 22. Final Architectural Rule

The Fast Lane optimizes **latency, not truth**.

It is acceptable to remove duplicated semantic gatekeeping from Week 1. It is not acceptable to remove the integrity necessary to know that the correct child received a valid, private, renderable pair of PDFs.

The permanent split is:

```text
Week 1
Author/Critic → immutable submission → Fast Publisher → immediate release

Week 2+
Author/Critic → immutable submission → deterministic Finisher → scheduled release
```

If Week 1 quality is repeatedly poor, fix the Author/Critic/prompt/curriculum pipeline. Do not reintroduce a slow hidden second quality gate as a substitute for fixing authoring quality.
