# Prompt patch release 1.9.1

Target: rel_1.9.1 / Engine 1.9.0 / Schema 2.6.0 / Prompt 2.14.1 / Worker 1.8.0 / Renderer 1.6.1 / Quality Profile 1.2.0.

Bundle: 2.14.1-prod, SHA-256 `d72ca08a83b41c34f64d703541f34d6120d629bc2b0d4919037a749808591211`.

## Version decisions

- Prompt advances because the planning, authoring, and critic instructions now explicitly support high-value multi-word lexical units.
- Renderer advances because the learner-facing vocabulary heading changed from `核心單字` to `核心單字與片語`.
- Release advances because bundle contents and renderer identity changed.
- Engine, Schema, Worker, and Quality Profile remain unchanged because no generator algorithm, canonical data shape, worker protocol, or quality-floor contract changed.
- Activated Prompt 2.14.0 was restored to its original bytes and archived with bundle SHA-256 `971e2b7d3f497c9448bf95171b5ab9258d278312bd3ea43d2f1d5ba531ed526c` for immutable rel_1.9.0 claims.

## Compatibility and verification

- `pnpm test`: 176 files and 1,574 tests passed.
- `pnpm typecheck` and `pnpm build`: all six workspace projects passed. The web build retained its existing large-chunk warning.
- `pnpm test:db`: all suites passed, including both normal and Week 1 claims, target acceptance, six mismatch rejections per path, and immutable rel_1.9.0 submission after the simulated switch.
- `pnpm generate:synthetic` and the production curriculum sample renderer completed. Visual inspection covered all 6 Student and 3 Parent pages from the canonical renderer: A4 layout, Chinese glyphs, page transitions, writing space, and the `核心單字與片語` heading rendered without clipping or overlap.
- Fresh pre-activation production RPC returned the exact rel_1.9.0 contract and `971e2b7d...526c` bundle hash. Remote migration history matched local through `20260918004500`; only this activation migration remained pending.
- Implementation commit `47b58e2735a262bf37ead1ae18b487b155403205` was pushed to `main`. GitHub CI run `35251014176` passed lint, all tests, typecheck, and build against that exact revision before activation.
- `supabase db push --dry-run` listed only `20260918090000_activate_prompt_patch_release.sql`. Production activation then applied that migration. The CLI emitted a non-fatal pg-delta catalog-cache certificate warning after applying it; independent migration history and contract read-back confirmed the database change succeeded.
- Fresh service-role RPC and authenticated Authoring Bridge `GET /contract` both returned the exact target tuple and bundle SHA-256. The publishable database role received HTTP 401 for the private contract RPC.
- Remote migration history now agrees with local through `20260918090000`.
- Production claim entry points were not invoked for release testing because doing so could acquire learner jobs. Their unchanged dynamic binding was exercised in the disposable database suite for both normal and Week 1 paths before activation; production contract publication and bridge read-back were verified without claiming work.
- Activation outcome: complete. No recovery action was required; immutable rel_1.9.0 and rel_1.8.2 claims remain supported by archived bundles.
- Activation migration: `20260918090000_activate_prompt_patch_release.sql`; it refuses to run unless production still exposes the exact reviewed rel_1.9.0 contract.
- Recovery: do not relabel or re-claim in-flight work. Existing rel_1.9.0 and rel_1.8.2 claims resolve their frozen archived bundles; new claims use rel_1.9.1 only after activation.
