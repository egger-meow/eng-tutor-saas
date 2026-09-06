# Commander brief: formats, weekly memory, and selective retrieval

> **Status**: Implemented and superseded by Release `rel_1.8.0` (Engine 1.8.0, Prompt 2.13.0, Schema 2.5.0, Bundle 2.13.0-prod, Worker 1.7.0).  
> All core capabilities (format planning capsule, post-plan selective CAP retrieval, two-stage history retrieval RPC, context compaction benchmark) have been implemented and verified in `rel_1.8.0`.

## Verified starting points

- ResponseLayout currently supports lines/table/organizer; table and organizer share one renderer. Rows contain labels and positional values, without stable response-cell IDs. Parent answers are question-level text. Instruction blocks have fixed patterns/workedExamples/commonMistakes fields.
- TypeScript now extracts recentResponseForms. Live public.worker_generation_context and its before_student_library delegate do not return that field or inspect responseLayout. Their diversity capsule contains recentGenres/recentContextKeys/recentItemFamilies. Do not claim production format memory is complete.
- The CAP routing index has 195 cards / 33 shards, with skill/depth/language/evidence metadata. The whole compact routing index still enters the fixed bundle. Previous measured bundle: 24,233 o200k_base tokens.
- Source locations: packages/generator/src/curriculum-package-schema.ts; packages/generator/src/curriculum-maps/diversity-capsule.ts; packages/pdf/src/curriculum/{question-renderer,parent-renderer}.ts; packages/generator/src/bundle-compiler.ts. Locate the actual content-derived workload estimator; workload-fit.ts only checks the resulting duration band.
- Read SPEC TOC first, then applicable numbered sections. Key sections: 51-52, 74-85, 86-87, 118, 132, 180-184, 193-194, 199, 204-205, 210. Use exact requirements, not this summary as a substitute.

## Design decisions proposed

Prefer a small set of rendering primitives with flexible teaching templates. Distinguish supplied explanation, partial scaffold, and assessed student response. Do not turn every template into a mandatory schema enum or rotation quota.

Highest-value templates:
1. Compare/classify grid: common dimensions across alternatives; extend existing table.
2. Evidence -> inference organizer: passage clue, conclusion, reason; extend existing table.
3. Timeline: event, before/after relationship, turning point; new compact sequence layout.
4. Process/cause chain: step or cause, condition, consequence; reuse sequence layout. Chronology alone does not prove causation.
5. Contrast/decision aid: when to use each form, minimal paired examples, exception; instruction component.
6. Partial worked example: supplied demonstration followed by progressively less support; instruction plus response slots.
7. Constrained information integration: timetable/menu/notice comparisons and justified choices; a later reading-block extension, preserving the primary-reading evidence boundary.

First scope: reliable grids plus sequence; contrast and partial-example instruction templates next. Defer free-form mind maps, arbitrary graph editors, image generation, and a large component library.

## Ordered implementation tickets

A. Response contract and reliable grids
- Define stable response-unit IDs, supplied content versus blank response, answer mappings, and accepted variants. Preserve legacy 2.4 packages via explicit compatibility; determine the new schema version with existing conventions.
- Student and Parent render the same structural data, with answers filled only in Parent. Reject missing/duplicate/orphan answer-unit references and accidental answer exposure.
- Locate workload derivation and count actual response actions/production demand, excluding supplied examples. A grid is neither automatically one task nor one sentence per cell. Preserve existing semantic versus objective gate boundaries.
- Test grayscale A4 rendering, long labels, page breaks, blank spacing, partial scaffolds, and repair preservation. Finisher must preserve valid layouts.

B. Shared cross-week memory
- Derive a compact per-delivery memory projection from completed canonical content, linked to immutable snapshot and delivery sequence_number. Keep feedback observations separately attributable and updateable; do not rewrite completed materials.
- Store public interest entities, actual question/hook, reasoning operation, response primitive/template, scaffold level, target IDs, and source pointers. Exposure is not mastery; parent comments are observations with timestamps, not verified performance.
- Recent bounded memory plus targeted older evidence, with last-used and bounded counts for repetitive combinations. Do not select formats merely because they are rare.
- Wire the authoritative DB context and every adapter to the same versioned contract. Test parity across local, online/manual and Week 1 entry points; no counting failed retries as new weeks.

C. CAP and history retrieval
- Keep crawling/import/versioning offline. During generation, filter/rank the existing corpus; return small candidate cards, then expand chosen IDs. Batch requests by pedagogical need and deduplicate reads across items. Preserve required 1-5 references per applicable item, authoritative status, holdout exclusion and same-SHA provenance.
- Start with exact metadata filtering and keyword matching. Do not require a vector DB for 195 richly tagged cards. Rank pedagogical fit before topic similarity.
- History: load mandatory current state/relevant explicit feedback deterministically. Retrieve older facts by child + target/entity + delivery/time range; semantic retrieval is optional for unstructured older observations.
- Expose the same bounded retrieval contract through CLI and reviewed online bridge. Pin retrieval to claim cutoff/source versions and record returned IDs/hashes; arbitrary current DB reads must not undermine immutable claim provenance.
- Do not call empty top-k output proof of no relevant history; use bounded expansion and explicit missing-evidence handling.

D. Optional hybrid-search experiment, not initial production dependency
- Compare metadata/keyword baseline with keyword+vector fusion and optional reranking on labeled retrieval cases. Adopt only if relevant-evidence recall improves enough to justify embedding, query, maintenance and latency cost.
- Use existing Postgres/pgvector if needed, with private-child filtering enforced server-side. Never combine private learners into an unrestricted retrieval pool. No automatic external embedding of learner data.
- Use contextual headers (skill, depth, evidence span, source/version) from existing metadata before paying a model to summarize every chunk. Preserve evidence relationships when chunking; do not split a question from its needed passage/table/answer constraints.

## Commander acceptance

Each executor receives only its ticket, required paths/sections, input/output contract, non-goals and acceptance cases. Return commit SHA, diff summary, tests, token/latency measurements and unresolved issues. No full conversation copy or repeated whole-repository audit.

Commander reviews actual diffs and artifacts, not only executor claims. Reject decorative diversity, renamed-but-identical tasks, answer leakage, unsupported format/workload assumptions and retrieval that loses required evidence.

Use existing science and guitar organizer fixtures plus creative-process, character-decision and temporal comparison cases. Add small multi-week synthetic trajectories with controlled feedback and justified repetition; measure format/reasoning/scaffold combinations, source recall, privacy isolation, canonical/PDF integrity, repair rate and total pipeline tokens. Enforce objective invariants; diversity is reviewed semantically, not through a weekly table quota.

Context budgets are proposed tuning targets, not guarantees: recent+selected older memory roughly 500-1,200 tokens; small CAP candidate summaries followed by necessary complete evidence. Benchmark against baseline on identical cases, counting all stages and retries. Keep sufficient evidence when a target requires expansion. Prompt caching can reduce repeated processing cost but does not remove text from context or replace retrieval.

## References

- Supabase hybrid search: https://supabase.com/docs/guides/ai/hybrid-search
- pgvector exact/approximate search and filtering: https://github.com/pgvector/pgvector
- Contextual retrieval: https://www.anthropic.com/engineering/contextual-retrieval
