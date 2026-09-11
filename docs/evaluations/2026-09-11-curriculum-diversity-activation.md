# Curriculum diversity activation — 2026-09-11

Target: rel_1.9.0 / engine 1.9.0 / schema 2.6.0 / prompt 2.14.0 / worker 1.8.0 / renderer 1.6.0. Quality profile 1.2.0 is unchanged because this release expands presentation structure without changing the quality floor.
Bundle: 2.14.0-prod, SHA-256 `971e2b7d3f497c9448bf95171b5ab9258d278312bd3ea43d2f1d5ba531ed526c`.

## Consumer deployment and isolated behavior evidence

- Production Finisher run 34549456342 and Week 1 Publisher run 34546346566 completed successfully at `cf36a34eed343b99e6c8b3560945db1aefad1f22`. These workflows checkout the default branch and execute repository TypeScript with frozen dependencies. Worker, generator, renderer and workflow sources are unchanged from that deployed revision.
- CI run 34561856389 succeeded at `a6c9cae0cea82213d529c4f2aa78db21fe18bb90`.
- Existing implementation evidence records full tests, typecheck, build and PDF inspection. Fresh activation verification: 98 consumer/authoring/pipeline tests passed, 3 version tests passed, and 8 diversity PDFs regenerated with actual Finisher validation.
- Both claim paths and submit RPC were compared to the isolated Docker database by whitespace-normalized function definition MD5 (identity comparison only): normal claim `27d299e7b4c2f97016f0d66a5505ed5f`, Week 1 claim `bc6e7b5c9f9c1ca026ac0a655912e980`, submit `671b2abc361b284bd58a4339d6e70703`. All match production. Initial mismatches were local pending pilot migration and whitespace differences.
- All three DB suites passed against those consumers, then passed again after applying the exact activation migration locally. Coverage includes both actual claim paths, target submissions, all six metadata mismatches, unchanged predecessor snapshots and predecessor submissions after a contract switch.
- Consumer tests execute actual publisher/Finisher completion code with synthetic storage/RPC boundaries; separate PDF fixtures execute actual rendering. No live learner claim, publication or notification was performed for testing. This is the isolated-environment verification allowed by the release policy, not a live end-to-end learner publication.
- Fresh authenticated production GET /contract returned the predecessor before activation. The bridge delegates to the active-contract RPC and needs no code deployment for this activation.
- Remote dry-run listed only `20260911042629_activate_curriculum_diversity_release.sql`.

## Activation and recovery

Prepared and locally tested; production application and final read-back pending.
The migration updates only the active contract function, preserves restricted execution grants, and rejects an unexpected predecessor. Existing claim snapshots and canonical submissions remain unchanged.
If post-activation verification fails, restore the predecessor contract through a new reviewed migration based on the contract function in `20260909181131_correct_authoring_bundle_hash.sql`; retain both compatible consumers so existing new-version claims remain processable. Never rewrite claim or package metadata.
