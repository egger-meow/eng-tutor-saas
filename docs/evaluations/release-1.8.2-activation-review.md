# Release 1.8.2 activation review

Reviewed 2026-09-08. Commit d781f7c delivered the new pipeline; subsequent commit 3666e2a selected Prompt 2.12.0 and older engine/worker constants while retaining rel_1.8.2. This activation restores Engine 1.8.2 / Prompt 2.13.2 / Worker 1.7.2. Schema 2.5.0 and Renderer 1.5.0 remain unchanged. Historical prompt files and immutable submissions are preserved.

The compiler now derives active prompt paths and bundle metadata from central constants. Review also repaired the profile.preferences planner fallback and preserved canonical delivery ordinals through diversity projections using the shared recency comparator. Unknown legacy labels sort after numbered labels; the selected diversity window retains chronological presentation.

Fresh verification: 154 test files / 1,278 tests passed; five workspace typechecks and all builds passed; database smoke completed both rollback blocks; lint passed with three existing frontend fast-refresh warnings. Synthetic Student and Parent Answer PDFs rendered successfully. Controlled context sizing reproduced 1,542,245 to 1,490,327 characters (3.37%), including optional repairs. It is not billed-token or teaching-quality evidence.

Read-only production verification confirmed migration 20260907010000 and targeted-history-v2, plus rel_1.8.2 bindings in both claim functions and submission. The later universal-finisher migration 20260907100000 is also present. This activation adds no database migrations or Edge Function changes.

Specific interests, creative processes, characters, and useful science remain supported by shared research policy. Format selection supports timelines, processes, comparisons, classification, before/after, and evidence-inference through existing layouts, without frequency quotas. Targeted CAP retrieval and bounded cached evidence remain intact. Actual model-selected angles and educational effectiveness still require observing newly authored packets; fixture tests and sizing do not establish those outcomes. Existing packets are not regenerated as part of activation.
