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
| P3 CI | Pinned CLI, clean database regression job, responsive browser fixtures and same-branch concurrency cancellation | CI workflow and remote run after push |
| P3 bootstrap/recovery | Historical authoring-limit patch accepts both reviewed literal and parameterized claim shapes; default remains ten | Entire migration chain replay from an empty isolated database |

## Verified locally

- 198 test files / 1,707 tests passed.
- Six workspace typechecks passed; lint passed with four existing React refresh warnings.
- Web, admin and worker builds passed; the existing large web bundle warning remains.
- Seventeen SQL suites run against `supabase_db_eng-tutor-robustness-replay`, after a fresh complete migration reset.
- Synthetic browser checks cover responsive reader/public demo, save conflicts, offline navigation, answer unlock, optional feedback and terminal request failure. RPCs and speech are mocked; these are not physical-device evidence.
- Synthetic application SQL backup restored successfully into a separate database with `ON_ERROR_STOP`. Required schemas are `public`, `private`, `private_generation`, `auth`, `storage`; restore prerequisites include `extensions`, `pgcrypto` and `uuid-ossp`. This does not verify hosted backup retention or storage-object recovery.

## Operations

Admission budgets are safety limits, not a complete bot defense. Email keys use a domain-separated HMAC; raw emails/IPs are not stored in admission buckets. Buckets older than two days are pruned on admission. Investigate sustained 429/503 responses before deliberately changing budgets.

Failed/canceled next-packet requests retain their durable history and submitted answers. Use the existing authorized administration retry procedure after inspecting the job; do not delete a request or manufacture a second parent request to hide a failure.

`purge-material-pdf-cache` runs with the existing Week 1 scheduled workflow. It removes only matured UUID cache paths selected by the service RPC, then acknowledges successful deletion. Removal or acknowledgment failure is safe to retry. Canonical material PDFs and ready/rendering paths are excluded. Monitor workflow failures and garbage backlog rather than deleting storage prefixes manually.

Backups must include application private schemas and their trigger functions. A production restore needs an isolated target, matching extensions/roles, database integrity checks, and a separate storage-object restoration/read check. Validate hosted retention and measured RPO/RTO with the infrastructure owner before claiming disaster recovery acceptance.

Generation release activation still follows `production-release-policy.md`: compatible consumers, immutable claims, fresh contract read-back and deployed identity checks are mandatory. This repair does not change or activate a generation release.

## Remaining external acceptance

Hosted backup retention and storage recovery, real iOS/Android accessibility/audio/download behavior, and the real paid-account golden journey have not been proven by synthetic tests. The two advisor FK findings on `marketing_posts` are outside the repository-owned schema. Unused indexes are not removed without workload evidence.

## Production delivery

Pending exact-commit migration, function, CI and health read-back evidence. Update this section after verification; local success alone is not production completion.
