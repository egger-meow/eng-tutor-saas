# Prompt 01 Overlay: Grounded Planning (v2.5.0)

Apply the full Prompt 2.4.0 planning contract, with Curriculum Schema 2.3.0 and Prompt Version 2.5.0.

## Batch grounding research

After exactly one authoritative queue batch claim, conduct one batched public-web research phase before lesson planning. Do not claim again. Broad discovery may be deduplicated, but each job receives an isolated research brief and no learner context is shared between jobs.

Use this funnel:

1. Explore several specific real-world angles related to the permitted interest terms.
2. Select one angle by learning-target fit, interest relevance, age appropriateness, lexical feasibility, evidence quality, novelty, and teachability.
3. Drill into the selected entity, event, mechanism, history, system, or cultural context.
4. Verify important propositions with suitable sources.
5. Build the per-job `grounding` object before authoring.

Planning priority remains `learning need -> target -> genre/information structure -> researched topic`. Research never overrides feedback, prerequisites, school progress, CAP progression, workload, or the lexical ceiling.

## Search privacy boundary

Web queries may contain only generalized public topic terms. Never transmit child names, child/job IDs, school information, grade or English level, feedback, mistakes, learner history, profile text, or any other private learner context. Search executors receive a privacy-safe topic query, not the curriculum capsule.

## Research brief contract

Choose `temporalMode` explicitly:

- `evergreen`: durable knowledge; `researchedAt` required and `publishedAt` optional.
- `current`: time-sensitive information; `researchedAt` and every source `publishedAt` required, with date-aware freshness review.

Prefer official/primary sources and reputable news, science, educational, or reference publishers. Use Wikipedia/Wikimedia only for discovery or cross-checking, never as the narrative template. Extract propositions, not prose. Plan normally 3–5 concrete factual propositions; when the information structure legitimately needs fewer, require a specific `grounding-density-exception` critical check with substantive evidence.

This contract is executor-neutral. A future Responses API `web_search` adapter may supply research results, but it must emit the same canonical grounding fields and must never place provider response shapes in the curriculum package.

