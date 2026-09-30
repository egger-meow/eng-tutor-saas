# S5 — authenticated PDF cache and on-demand recovery

S5 preserves inspected publication PDFs and adds on-demand recovery. It does not decouple canonical publication from PDF rendering or claim that initial publication costs have decreased.

## Architecture and compatibility

- Week 1 Publisher and normal Finisher still render/inspect/store the Student and Parent pair before atomic completion. Canonical source, authoring contracts, claim snapshots, release timing, email notifications and historical Storage paths are unchanged.
- An authenticated `material-pdf` endpoint calls an ownership/release-authorized RPC. Parent output additionally requires the existing submission gate. The browser cannot choose a Storage path, read canonical source, change cache rows or claim work. Service-only signing creates sixty-second URLs after authorization.
- A unique material + revision + renderer + kind key reuses the published PDF. Only a confirmed missing object or expired generated cache queues work. Other Storage failures remain retryable service errors, not rendering requests.
- Existing Node/Playwright/Chromium GitHub Actions infrastructure processes five requests per existing Week 1 runner invocation. One ten-minute lease is active at a time; expired claims can be recovered and stale completions are rejected. Lease-specific paths and `upsert:false` preserve history. Failed work waits for an explicit download retry, with a thirty-second cooldown.
- Generated caches have thirty-day logical expiry. Expiry causes regeneration, not deletion. No historical PDFs or caches are deleted in this stage. Parent-only downloads and scoped-email access to existing published PDFs remain compatible. Scoped-email missing-object recovery still requires signing into the owning account.
- Rendering replays only immutable canonical source through the existing Student/Parent projection renderer. It never loads drafts or submissions and never reruns current curriculum rules against historical material. Pair inspection is retained even when only one requested artifact is uploaded, so recovery currently renders both kinds. Future renderer releases must update `material_pdf_settings` alongside compatible consumers; a version mismatch fails closed.

Relevant SPEC: 68–87, 106, 127–132, 144–145, 158, 180, 188, 193, 198–200, 204–205, 210. SPEC 158 records this additive strategy. No generation release, renderer implementation, schema, prompt or active contract is changed.

## Verification

All tests use explicitly synthetic fixtures, never learner records.

- Full Vitest: 185 files / 1,624 tests passed; final focused worker and material-page compatibility checks passed.
- Fifteen local SQL suites passed, including family isolation, unreleased/answer denial, repeated request identity, absent-object queueing, stale invalidation, single live claim, lease expiry, stale worker rejection, completion, cache expiry and explicit retry.
- Typecheck and production build passed; lint has zero errors and the three existing Fast Refresh warnings.
- Phone 390×844, tablet 820×1180 and desktop 1440×1000 browser fixtures passed pending-state/disabled-control, retry and filename/download behavior, plus the existing learning-loop scenarios. RPCs and download bytes in this browser test are synthetic mocks; SQL and local API verification are separate.
- `node scripts/test-material-pdf-e2e.mjs` passed against local Auth, Edge Functions, Postgres and private Storage: repeated missing requests create one artifact; trusted replay/upload becomes ready; signed PDF downloads; parent answer remains locked; canonical source is unchanged. The script refuses non-local projects and cleans up its synthetic Auth user/files. Docker's internal signed URL origin is mapped to its host gateway only by this local test.
- `pnpm exec tsx scripts/verify-material-pdf.mts` replayed old-format and curriculum fixtures twice. All ten A4 pages were rendered as images and visually inspected; blank answer spaces and stable layout fingerprints were verified. Artifacts remain ignored under `output/pdf/`.

| Synthetic Student artifact | Pages | Bytes | Local replay time |
| --- | --- | --- | --- |
| Legacy worksheet | 4 | 91,756 | 1,969 ms |
| Curriculum worksheet | 6 | 743,782 | 1,841 ms |

The local end-to-end upload/completion measured 1,224 ms for the legacy artifact. These are local measurements, not production latency promises. Existing files need no render. Missing artifacts may wait for the existing five-minute scheduled runner, GitHub startup and earlier work; schedules can be delayed. `byte_size`, `render_ms`, `attempts` and state support production measurement without answer text. Actual invoice/account quotas and production wait-time distribution are not measured here. No new paid rendering service is enabled, and no claim of guaranteed free operation is made.

## Operations

Inspect `material_pdf_artifacts` through trusted operator access. A missing or failed download can be retried by the parent; a live lease must expire before another processor can acquire it. Run `pnpm worker process-material-pdfs --limit 5` only in an authorized trusted runtime; it handles PDF cache work, not authoring/Finisher jobs. Do not manually change canonical packets or publication paths to recover downloads. Do not clean old objects until a separate retention policy is verified.

Production evidence will be appended after source push, migration, function deployment and web readback. Physical printing and authenticated production recovery acceptance remain pending.
