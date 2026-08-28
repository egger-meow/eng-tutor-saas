# CAP Precedent-First Assessment Contract

## Invariant

Normal assessment first consults relevant authoritative non-holdout CAP knowledge, then reuses, recombines, or surpasses mechanics. **CAP is the floor, not the mold.**

## Retrieval and plan

Route 195 cards by skill **or** structural relevance: reasoning, depth, evidence, genre, or distractors. Read only 1–2 same-SHA shards; never raw history, PDFs, holdouts, or full runtime. Vary strong ties deterministically and softly down-rank recent refs/mechanics when supplied. Quality outranks diversity; no quotas.

Each governed item needs passed `cap-plan:<questionId>` JSON with objective, skills/genre, language/depth, evidence/reasoning/distractors, `precedentRefs`, `precedentMode`, recall/fallback, plus:

- `anchor`: `borrowedDesignPrinciples`;
- `blend`: `synthesizedDesignPrinciples`;
- `calibration`: `benchmarkQualities` and `noveltyRationale`.

Modes need not match topology, answer construction, distractors, or primary skill. Package refs equal per-item refs. Relevant CAP requires refs; otherwise give `noPrecedentReason`. Recall exemption covers only vocabulary/grammar retrieval outside CAP transfer. A1/A2 may retain D2/D3 reasoning.

## Quality, critic, and provenance

Finisher fails closed on unavailable authority, provenance/hash mismatch, unknown/holdout refs, missing consultation, invalid recall, inconsistent refs, copying, ambiguous/unsupported answers, decorative or dictionary comprehension, depth collapse, or missing meaningful four-option distractors—not repeated refs or structural novelty.

Semantic Critic flags mechanically repetitive evidence/mechanics, reskins, and archetype overuse; pedagogically justified practice may repeat. Repair only genuine failures and dependents.

`cap-provenance` records exact knowledge/corpus/bundle/planner/floor versions. Mock/provisional knowledge is forbidden.
