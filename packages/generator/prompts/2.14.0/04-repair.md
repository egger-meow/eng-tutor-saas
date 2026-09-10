# Prompt 04: Consolidated Targeted Repair (v2.14.0)

Repair an existing Schema 2.6.0 package from Critic or Finisher evidence. Preserve immutable prior attempts. Treat `retryContext.previousCanonicalPackage`, findings, and repair instructions as authoritative when supplied.

## 1. Surgical scope

Repair only the rejected content plus fragments that logically depend on it. Preserve valid research, lesson prose, question IDs, target mappings, answers, layouts, and tracking when they remain correct. Do not restart planning or rewrite the whole packet for stylistic freshness.

Re-research only when the failure concerns grounding accuracy, source adequacy, temporal freshness, or a changed factual dependency. A deterministic integrity finding should not trigger unrelated semantic regeneration.

## 2. Grounding and exact-attribution repair

When factual support is wrong, repair the smallest closed dependency chain:

`source/fact -> claim -> exact reading prose -> dependent instruction/question -> dependent answer/rationale`

For named products, organizations, models, versions, modes, features, APIs, policies, mechanisms, or similarly scoped entities, restore the exact binding:

`exact entity/version/mode -> exact capability/behavior -> exact control flow/condition/limit/qualifier`

If two modes/features were accidentally fused, separate them or simplify the claim. Never fix attribution by deleting a qualifier that the source requires. Update grounding fact/claim references so they match the corrected prose exactly.

For `current` material, update only the stale/unsupported recency evidence and dependent claims. Preserve a valid evergreen fallback when current evidence is not strong enough.

## 3. Curriculum, format, and answer repairs

- Opening/teaching mismatch: repair only the affected opening activity or instruction blocks. Preserve a useful direct-reading opening, comparison, list, step sequence, example, or error analysis; never restore the old uniform warm-up/explanation template as a repair default. Remove redundant demands while retaining adequate self-study guidance. Keep assessed tasks and their answers in question structures.
- Format/thinking mismatch: update the question's `responseLayout` to match the intended cognitive task (e.g. sequence for processes, table for comparisons, organizer for deductions), preserving valid question IDs and content where possible.
- Unjustified format collision: if flagged for mechanical format repeat without rationale, choose a better-fitting supported format or supply explicit pedagogical justification. An unused format is an option, never a quota.
- Evidence-boundary failure: move required facts into the primary reading only when pedagogically appropriate, otherwise revise the item to use existing passage evidence.
- Answer-entailment failure: repair the key, options, rationale, accepted variants, or dependent passage fact so the answer is uniquely justified.
- Explicit task constraint failure: make the model answer actually obey requested counts, sentence form, comparison controls, or procedure completeness.
- Lexical issue: simplify, teach/context-support, or correctly classify the affected lexical unit without quota filling.
- Grammar progression issue: use learner evidence; do not re-promote old grammar without support and do not erase justified feedback-driven review.
- Task-topology issue: change only the repetitive/weak tasks needed to restore meaningful cognitive variety.
- Lexical-retrieval-value failure: replace each bare bilingual/dictionary or duplicated flashcard prompt with a meaningful contextual cloze, collocation/discrimination choice, or sentence-production task while preserving the retrieval target and answer alignment.
- Missing table/organizer/sequence rendering metadata: add the valid Schema 2.6.0 `responseLayout` required by the task prompt.
- CAP integrity finding: repair only the CAP metadata named by the finding. A governed `cap-plan` always includes `noPrecedentReason`; use `null` when its `precedentRefs` is non-empty, otherwise use a specific reason only when authoritative retrieval found no suitable precedent. For `CAP_PROVENANCE_MISMATCH`, replace `cap-provenance` with JSON containing the exact current authoritative `capKnowledgeVersion`, `capCorpusHash`, `capBundleVersion`, `plannerVersion`, and `qualityFloorVersion`, never prose or guessed values. For aggregate precedent inconsistency, set `qualityEvidence.precedentRefs` to the exact deduplicated union of governed per-item `precedentRefs`.
- Workload issue: add useful dependent learning work or remove redundancy; never falsify duration metadata.

Keep the latest candidate only once in model context. Preserve immutable originals outside the prompt. When a newer local candidate supersedes retryContext.previousCanonicalPackage, retain findings and repair instructions but omit that superseded duplicate from the model-facing context. Do not drop the sole candidate or its dependencies.

## 4. Re-audit

After repair, re-run the affected semantic checks and ensure Student/Parent outputs, grounding, CAP plans, tracking, and answers still agree. Do not convert warnings or approximate heuristics into new hard requirements during repair.
