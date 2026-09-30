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

## Production delivery evidence

- Source `46ae7a32f0ff465f6198292d0cb9b1f9ba7b3298` committed and pushed to main.
- Only pending migration `20260930170027_material_pdf_on_demand.sql` applied; remote migration history confirms it. Migration SHA-256: `633fbc19028f383a4dc0ea3c005cd0523f30712d50b1e7113d4dc371e3affabd`.
- `material-pdf` deployed ACTIVE version 1, function ID `b25e54ea-864c-498d-b7a0-a2f19f18cf1d`, deployment bundle SHA-256 `0af81417adac225c05dba95dd346a707de52b39591004f8216d6e54117087b48`; source SHA-256 `aa18d11d28208bd11d1795518063ab4d29a50628ea86498877498aa5d20c516c`. Endpoint POST without authentication returns 401 `authentication_required`.
- Remote RLS is enabled on both cache tables. Authenticated browser table reads/writes and queue claims are false, anonymous request execution is false, and authorized parent request execution is true. Security advisors report the intentional service-only tables without public policies and the ownership-checked authenticated SECURITY DEFINER request endpoint; no new anonymous trusted-worker authority is granted.
- `supabase/tests/material-pdf-production-readback.sql` passes on production and locally: isolated synthetic family denial, repeated request identity, answer lock, legacy answer compatibility and future release denial. Entire transaction rolls back. No global queue claim, real learner mutation, upload or notification occurs.
- Fresh active authoring contract before/after deployment remains `rel_1.9.1`, bundle `2.14.1-prod`, SHA-256 `d72ca08a83b41c34f64d703541f34d6120d629bc2b0d4919037a749808591211`; Engine 1.9.0, Prompt 2.14.1, Schema 2.6.0, Worker 1.8.0, Renderer 1.6.1. No new authoring release is activated.
- [CI run 36752043782](https://github.com/egger-meow/eng-tutor-saas/actions/runs/36752043782): verify and deploy-production both successful. Public homepage and `/assets/index-BHNqOowY.js` return HTTP 200; asset readback contains the new endpoint, pending state and user-facing PDF preparation message.

Physical printing, authenticated production missing-object recovery and production invoice/wait-time distribution remain pending. Local measured behavior and deployment readback are not those acceptance results. Existing physical-device/audio/keyboard and S3 pedagogy acceptance gates remain open.
