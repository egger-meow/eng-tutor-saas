# Robustness repair evidence — 2026-10-04

This record covers the identified P1–P3 engineering findings. It is not a guarantee against every possible incident. Production delivery evidence is recorded separately below after deployment.

| Area | Resolution | Evidence |
| --- | --- | --- |
| P1 publication | Existing completion arbitration retains artifacts after uncertain transport; normal Finisher now excludes Week 1, preserving its sole Fast Publisher path | Publisher unit tests and SQL smoke suite |
| P1 local administration | Host validation, same-host-and-port Origin validation, JSON/custom-header mutations, bounded bodies with an observable 413 | Admin integration tests |
| P2 assessment boundary | Retired anonymous assessment view removed | P2 migration and database authorization tests |
| P2 quotas and follow-up | Month-end interval repair, logical delivery counting, correction exclusion, request-time feedback cutoff | Quota/P2 SQL suites and follow-up regression |
| P2 PDF access | Email access resolves repaired artifacts; ready cache objects persist without periodic regeneration | Material PDF SQL suite |
| P2 public admission | Atomic service-only global 20/hour, 80/day and per-email 3/hour budgets before Auth dispatch; 64 KiB streamed payload limit | Admission unit tests and SQL authorization/budget tests |
| P3 lease recovery | Renew live owned submission and job leases during long batches; expired leases cannot be resurrected | Heartbeat unit and SQL lease tests |
| P3 credential boundary | Codex child process receives an explicit runtime/auth-directory environment allowlist | Secret exclusion unit test |
| P3 failed next packet | Durable terminal job status reaches parent reader; saved answers remain accessible and operator recovery is explicit | SQL owner isolation and responsive browser fixture |
| P3 PDF retention | Lease-specific render paths tracked; abandoned cache objects deleted after 24 hours only when neither canonical nor active | Cleanup unit tests and SQL exclusion tests |
| P3 database performance | Covering indexes for 21 repository-owned FK findings and five equivalent ownership-policy init-plan improvements | Fresh migration replay; production advisors checked after delivery |
| P3 function context | Fixed two mutable search paths and removed browser grants on three internal trigger entrypoints | All SQL suites pass, including normalization and trigger ACL assertions |
| P3 CI | Pinned CLI, clean database regression job, responsive browser fixtures and same-branch concurrency cancellation | CI workflow and remote run after push |
| P3 bootstrap/recovery | Historical authoring-limit patch accepts both reviewed literal and parameterized claim shapes; default remains ten | Entire migration chain replay from an empty isolated database |

## Verified locally

- 198 test files / 1,707 tests passed.
- Six workspace typechecks passed; lint passed with four existing React refresh warnings.
- Web, admin and worker builds passed; the existing large web bundle warning remains.
- Seventeen SQL suites run against `supabase_db_eng-tutor-robustness-replay`, after a fresh complete migration reset.
- Synthetic browser checks cover responsive reader/public demo, save conflicts, offline navigation, answer unlock, optional feedback and terminal request failure. RPCs and speech are mocked; these are not physical-device evidence.
- Synthetic application SQL backup restored successfully into a separate database with `ON_ERROR_STOP`; source and restore both contain 90 application/Auth/storage tables and 117 assessment items, with normalization behavior preserved. Required schemas are `public`, `private`, `private_generation`, `auth`, `storage`; restore prerequisites include `extensions`, `pgcrypto` and `uuid-ossp`. This does not verify hosted backup retention or storage-object recovery.

## Operations

Admission budgets are safety limits, not a complete bot defense. Email keys use a domain-separated HMAC; raw emails/IPs are not stored in admission buckets. Buckets older than two days are pruned on admission. Investigate sustained 429/503 responses before deliberately changing budgets.

Failed/canceled next-packet requests retain their durable history and submitted answers. Use the existing authorized administration retry procedure after inspecting the job; do not delete a request or manufacture a second parent request to hide a failure.

`purge-material-pdf-cache` runs with the existing Week 1 scheduled workflow. It removes only matured UUID cache paths selected by the service RPC, then acknowledges successful deletion. Removal or acknowledgment failure is safe to retry. Canonical material PDFs and ready/rendering paths are excluded. Monitor workflow failures and garbage backlog rather than deleting storage prefixes manually.

Backups must include application private schemas and their trigger functions. A production restore needs an isolated target, matching extensions/roles, database integrity checks, and a separate storage-object restoration/read check. Validate hosted retention and measured RPO/RTO with the infrastructure owner before claiming disaster recovery acceptance.

Generation release activation still follows `production-release-policy.md`: compatible consumers, immutable claims, fresh contract read-back and deployed identity checks are mandatory. This repair does not change or activate a generation release.

## Remaining external acceptance

Hosted backup retention and storage recovery, real iOS/Android accessibility/audio/download behavior, the real paid-account golden journey, and real-parent adaptive next-packet acceptance have not been proven by synthetic tests. Deterministic content validation does not establish educational quality; sampled author/critic review and resulting learning behavior remain acceptance evidence. The two advisor FK findings on `marketing_posts` are outside the repository-owned schema. Unused indexes are not removed without workload evidence.

## Production delivery

Repair commit: `ad65bc2080cebec5026973023ed81691f052614e`.

Production `ykzszjrqynrhgdhoeovo` read-back confirms migrations `20261004120000` and `20261004120001`, retired assessment view absent, no pending/claimed jobs, no public tables without RLS, browser denial on admission/cleanup RPCs, all 21 covering indexes, and Week 1 exclusion from normal submission claims. Five RLS init-plan warnings are gone; only two FK findings remain on the external `marketing_posts` table ([advisor reference](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)).

Onboarding function is ACTIVE version 7, JWT verification remains intentionally disabled for public onboarding, deployed bundle SHA-256 `7b538b525d7f9741511c78fba1d49b4a98126ab0c4736508f7173cbdcf568ce8`. A malformed-body production probe returns 400 without invoking Auth. Generation contract remains `rel_1.9.1`, bundle SHA-256 `d72ca08a83b41c34f64d703541f34d6120d629bc2b0d4919037a749808591211`.

Internal-function repair commit `3ace7410778efb3df35ee8e787a3e2bab8e472bd` and migration `20261004120002` are deployed. Production recheck confirms trigger-role denial, normalization unchanged, zero garbage backlog and no mutable-search-path warnings. The deployed onboarding source matches all four local source files after newline normalization. The existing `emergency-chatgpt-claim` version 7 source is a 410 Gone tombstone, resolving the original source-exposure uncertainty.

Remote CI verification and Cloudflare deployment must succeed on the final branch head; inspect the matching commit in [repository Actions](https://github.com/egger-meow/eng-tutor-saas/actions). Earlier runs canceled by the concurrency guard are superseded, not delivery evidence.

Password breach protection is disabled in hosted Auth ([advisor reference](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)); the current parent product uses email OTP. Password-based access and backup-retention configuration need a separate infrastructure acceptance check. Intended enrollment/telemetry and authenticated ownership RPCs remain security-definer entrypoints; deny-client private tables intentionally have no client RLS policies.
