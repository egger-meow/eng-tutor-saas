# Curriculum diversity: local implementation evidence

Status: implementation and verification complete; ready for commit, push, and remote migration deployment.
Base HEAD: `168367e62682b644688986976c70c7e472cd6ffe` (origin/main).

## Implemented

- Schema 2.6 accepts question, observation, reading-purpose, and direct-reading openings. Reflection questions are ungraded; assessed responses remain in questions/answers.
- Teaching sections use prose, bullets, comparison, steps, worked-example, and error-analysis blocks without mandatory all-type quotas. Comparisons enforce rectangular rows.
- Student rendering supports all variants; historical rendering remains. Short lists stay on one page, table headers repeat, content is HTML escaped.
- Strict and Finisher validators explicitly accept 2.6, preserve 2.5, and reject shape relabelling and missing answers.
- Duration, teaching text audits and Chinese terminology repair understand the new blocks.
- TypeScript delivery memory records opening mode, teaching modes and per-item response format counts; historical unknown count coverage remains explicit.
- Prepared prompt 2.14.0 instructs purposeful selection and critic review of repeated formats, without forced rotation.
- Production authoring bundle compiled for 2.14.0-prod; frozen historical prompt suites (2.0.1 through 2.13.2) and archived 2.13.2-production-authoring-bundle.md preserved.
- Database migrations added:
  - `20260910132933_diversity_format_memory.sql`: adds format diversity memory aggregation.
  - `20260910133101_prepare_curriculum_diversity_consumers.sql`: prepares submit/claim consumers for schema 2.6.0 compatibility dynamically bound to active contract.

## Verification

- `pnpm typecheck`: passed across all workspace packages (web, generator, admin, pdf, worker).
- `pnpm build`: passed across all workspace packages.
- `pnpm test`: 1381 passed, 0 failed, 1381 total across 158 test files.
- `pnpm test:db`: passed all test suites (`smoke.sql`, `diversity-format-memory.sql`, `diversity-release-compatibility.sql`) on local Docker database.
- `pnpm generate:synthetic`: passed.
- `git diff --check`: passed.
- `pnpm exec tsx packages/pdf/src/generate-diversity-samples.ts`: passed. Four isolated synthetic variants, eight PDFs; all passed actual Finisher validation and post-render PDF text/page/bounds inspections. Student: six pages each; Parent: three pages each.
- Visual inspection: all four Student contact sheets and Parent contact sheet; confirmed step lists, table headers, and layout bounds.
- Samples live only in ignored `output/pdf/diversity/`. These are rendering fixtures with inherited sample answers, not publishable learner lessons. No learner jobs were claimed, no material published, no notifications sent.

## Release boundary and migration status

Target release: rel_1.9.0 / schema 2.6.0 / prompt 2.14.0 / engine 1.9.0 / worker 1.8.0 / renderer 1.6.0.
Bundle version: 2.14.0-prod, SHA-256: `971e2b7d3f497c9448bf95171b5ab9258d278312bd3ea43d2f1d5ba531ed526c`.
Predecessor bundle: 2.13.2-prod, SHA-256: `227bd0953d6062695023846327b8ab4e0391082ac7967c8ab0282ffeaee58340`.

Migrations to apply to remote production database:
1. `20260910132933_diversity_format_memory.sql`
2. `20260910133101_prepare_curriculum_diversity_consumers.sql`

## Working-tree source hashes

```json
{
  "packages/generator/src/audit-curriculum.ts": "9da663c4f99cb3138dea3f8aeb4b0e280c84d8edccd9ccff96cb9c1f766d3c4e",
  "packages/generator/src/cap-precedent-audit.ts": "fcfa76ca690ad0420a89c1e5845738fd2036dbbdd4d7d158419353e837381d56",
  "packages/generator/src/curriculum-diversity-schema.test.ts": "e7cb5f89d45aa2faab897a916a0b36102c3c8b6efde2dcb6bc8e5b430c10fbdb",
  "packages/generator/src/curriculum-package-schema.ts": "2baa01b566f302227cb0879392f7b8c6be59bb46fdcebb7b5b77ed9741e63873",
  "packages/generator/src/finisher-validate-curriculum-package.ts": "36ecbc49ec0366e1058e797cbf8f407d90359bf366c6c7e3cbb0c5faa989bd31",
  "packages/generator/src/index.ts": "9667a8377b508bd5f9f558f5ea8ca16b64843e98e2bc0793442210d8353ad753",
  "packages/generator/src/instruction-content.ts": "f0eb39c0984bf39fc56938fb85b511505de0d58ff4b93cb1fb9af68da1c6bdae",
  "packages/generator/src/model-quality-profile.test.ts": "db2cd813aa7f1aafd992dddfb119629bdadb792b99edaf4af1533028bd5900de",
  "packages/generator/src/model-quality-profile.ts": "81a4ef13d45791e66538a4306d8fb28628c773d00881502c8c2cd96e8e7d501f",
  "packages/generator/src/normalize-curriculum-package.ts": "f8a0b50a7a79eb6c8ca2d5373301de5c694bc4dff792fff153f25a45e6656a38",
  "packages/generator/src/validate-curriculum-package.ts": "d3322f1539fbd75327307aebf234a9727c5d8b59804210de26220dfaee0f8ac8",
  "packages/generator/src/curriculum-maps/delivery-memory.test.ts": "ad86ed3ad2a37e0ccf60847573e5a07c15acc2a4d1d6c71a534196cfa96fdbb5",
  "packages/generator/src/curriculum-maps/delivery-memory.ts": "eacc505c70370977db4069d64dd3d873f441f6e91baab474f24c84931a2cd10d",
  "packages/generator/src/curriculum-maps/format-planning-capsule.test.ts": "8ef597ef501b7d20622ee3f1d754317e4190f51a8c3cac312c739351b8d8419f",
  "packages/generator/src/curriculum-maps/format-planning-capsule.ts": "5b7bed37f554d9926ee4920124fc4982db516d2f5207112c97647385c5cd089e",
  "packages/pdf/src/generate-diversity-samples.ts": "fb408e4c1b8a18833b6b76c7211cc12f4a96553189b0bf91e65e1f2b4b6173f3",
  "packages/pdf/src/curriculum/instruction-renderer.test.ts": "f04132999f813f91f6ea64bed69d290f890bc7371fac22471ae0034d564d57bf",
  "packages/pdf/src/curriculum/instruction-renderer.ts": "dd66710aac3fc82dedc6e75ff925e1f329366aa734a035245e1b7830f00070cd",
  "packages/pdf/src/curriculum/opening-renderer.test.ts": "a9892945354577011994588b04580ab03446c3e192bafbb8f5182368ed08b3ea",
  "packages/pdf/src/curriculum/opening-renderer.ts": "3c36da653c362bf7018dcd4a0cdc722908dbb268c504cf8b08497ee61b60577a",
  "packages/pdf/src/curriculum/student-renderer.ts": "6b20aab9ef95b6f789fdfbf0bf7115e7d0aa32e22f8709cff8108f36befdb3ec",
  "packages/pdf/src/curriculum/styles.ts": "039d6dfe0599b474d20663726506fc65e3a2100bede246cb47c0d9fe34e6b727",
  "packages/generator/prompts/2.14.0/01-plan.md": "5639ac034513410a4e1b762ca8ff46ad63d24e10a4201aed20fb2b91be5a40a0",
  "packages/generator/prompts/2.14.0/02-author.md": "c7d3c32102c2cb0b3d71b887df6fe6ee12e9ee6faedc133d5f1c31943bbdf94c",
  "packages/generator/prompts/2.14.0/03-critic.md": "cdff1e478e63f43507711acfc3940a1d03f431637b44bd6a1aded7f4a408ab6e",
  "packages/generator/prompts/2.14.0/04-repair.md": "427b2efa9f68f22d69185c262f57831d8ca6da9f8df5e8fd967b2cd6d9da2e0f",
  "packages/generator/prompts/2.14.0/README.md": "62a2103a3ed3a5807c12038f7199a604f15734b46317b61764f2af64396a92c6",
  "packages/worker/src/authoring-claim-contract.ts": "9f4478c0b498ad95801122c43252f28064f5585ba7d5f5c38457a44eac3fa2ac",
  "packages/worker/src/authoring-claim-contract.test.ts": "6e06b50c110416ae38cdb6fd5b7322fed4078569fe4fd7d490419e42715e31b3",
  "packages/worker/src/consumer-release-policy.ts": "0366e6d2095dc1e769430dc8ac2863ce64431bceb33bf13e572c7adae3629468",
  "packages/worker/src/consumer-release-policy.test.ts": "52513681175761b93273138550ee0843d5e105bdeaaafd25c32b30818d75924a"
}
```
