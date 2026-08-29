# Production Prompt Compaction + Grounding Attribution Integrity

Date: 2026-08-30
Status: Approved design, implementation pending

## Problem

The active production authoring bundle currently concatenates historical prompt layers from 2.4.0, 2.5.0, 2.6.0, 2.7.0, 2.8.0, and 2.10.1. This preserves history well, but it also forces the model to read superseded rules and obsolete heuristics before later overlays narrow or override them. That increases prompt size, conflict risk, and attention dilution.

Week 2 also exposed a factual grounding failure that the current semantic critic missed: a lesson combined Suno Auto Split's stem-count capability with a different Suno mode's user-selected separation workflow. The source was broadly relevant, but the authored claim incorrectly bound a capability/control flow to the wrong named mode.

The fix must improve factual precision without turning the production prompt into a growing list of product-specific exceptions.

## Goals

1. Replace the active historical overlay stack with one consolidated production prompt suite.
2. Preserve all historical prompt directories byte-for-byte for provenance and legacy packages.
3. Preserve the current effective pedagogy and generation architecture while deleting obsolete, contradicted, or redundant instructions from the active model context.
4. Add one general grounding invariant for named entities, versions, modes, and features: exact capability attribution.
5. Keep semantic curriculum judgment with Author/Critic and objective integrity with deterministic validation/Finisher.
6. Make future prompt growth deliberate: new production behavior should modify the consolidated baseline rather than resume an unbounded overlay chain.

## Non-Goals

- No schema redesign. Schema remains 2.4.0.
- No change to Student/Parent PDF rendering in this change.
- No mutation of already released Week 2 material. Historical material stays immutable; any later correction must be a new revision/regeneration.
- No Suno-specific validator, keyword list, product catalog, or deterministic web-fact checker.
- No new brittle quotas, regex semantics, character thresholds, vocabulary allowlists, or Finisher pedagogy gates.

## Versioning

Create a new active consolidated prompt suite:

- Prompt: `2.11.0`
- Bundle: `2.11.0-prod`
- Schema: `2.4.0` unchanged
- Engine: `1.6.0`
- Release: `rel_1.6.0`
- Quality profile: `1.2.0` unchanged unless implementation discovers a real contract dependency
- Worker/PDF renderer remain unchanged unless code-level compatibility requires otherwise

Historical 2.4.0 through 2.10.1 prompt sources remain frozen and are not edited.

## Architecture

### Before

```text
2.4 base
 + 2.5 grounding overlay
 + 2.6 workload overlay
 + 2.7 MCQ overlay
 + 2.8 recency overlay
 + 2.10.1 quality overlay
 -> production bundle
```

### After

```text
2.11.0 consolidated plan
2.11.0 consolidated author
2.11.0 consolidated critic
2.11.0 consolidated repair
 + canonical schema
 + quality profile
 + product/rubric contract
 + CAP runtime contract/assets
 -> production bundle
```

The compiler must no longer concatenate historical prompt generations into the active bundle. Historical prompt files remain available only for provenance/hash regression and reading historical packages.

## Consolidation Rule

The 2.11.0 prompt must preserve the effective intent of current production behavior, not literally copy every historical sentence.

Keep high-level invariants that materially affect curriculum quality:

- learner/profile/feedback authority and longitudinal adaptation;
- natural, age-appropriate self-study English;
- passage-first vocabulary and learner-aware lexical difficulty;
- grammar forward progression with evidence-backed repetition;
- real-world research and Source -> Fact -> Claim -> Actual prose provenance;
- recency-aware current vs evergreen selection;
- copyright-safe original synthesis;
- CAP precedent-first assessment design as a floor, not a mold;
- answer entailment, evidence boundary, qualifier/control-condition preservation;
- task-topology/cognitive variety;
- responseLayout when the task genuinely requires a table/organizer;
- workload planning based on truthful represented work;
- surgical repair that preserves unaffected valid content;
- feedback as highest curriculum evidence when it conflicts with default progression heuristics.

Delete or rewrite active instructions that are obsolete, duplicated, or contradicted by newer product policy, including old fixed vocabulary quotas/allowlists and other heuristic publication gates that no longer represent the product contract.

## New Grounding Invariant: Exact Attribution

For any factual prose involving a named product, organization, model, version, mode, plan, feature, API, scientific mechanism, policy, or similarly scoped entity, semantic grounding must verify the complete proposition at the same scope used in the lesson.

The required reasoning is:

```text
exact entity / version / mode
    -> exact capability or behavior
    -> exact control flow / condition / limit / qualifier
```

A source being broadly about the same product is not sufficient.

Reject compositional attribution errors where individually true fragments from one or more sources are fused into a false relationship. Example failure class: taking mode A's numeric limit and mode B's user interaction model, then presenting both as mode A.

This remains semantic Author/Critic work. Deterministic validation continues to verify provenance structure and objective reference integrity, not infer product semantics.

### Author responsibility

Before writing a named-feature proposition, author only a proposition that the researched fact set supports at the same entity/mode scope. If source wording distinguishes multiple modes/features, preserve that distinction or simplify the lesson rather than merge them.

### Critic responsibility

`grounding-accuracy` must explicitly test whether each central named-entity proposition preserves entity/mode/capability binding, not merely whether the source is topically relevant. Central factual comparisons deserve adversarial cross-checking for swapped modes, merged features, dropped qualifiers, and marketing-language overstatement.

### Repair responsibility

When this failure is found, repair only the affected factual claims, reading fragments, grounding bindings, dependent questions, and dependent answer explanations. Preserve unrelated lesson content.

## Prompt-Size / Focus Guardrail

2.11.0 establishes a consolidated baseline. Future changes should prefer editing/replacing concise sections in the active consolidated prompt rather than adding a new inherited overlay.

A new overlay is justified only when temporary compatibility requires it. If an overlay would become permanent, consolidate it into the next baseline release instead.

Prompt quality is judged by effective, non-contradictory instructions, not by rule count.

## SPEC Alignment

Update the canonical product contract so that:

- real-world grounding includes exact attribution for named entities/modes/features;
- semantic Critic owns factual relationship accuracy;
- deterministic Finisher remains limited to objective integrity;
- active production prompts must not grow indefinitely through historical overlay accumulation;
- historical prompt sources remain immutable for provenance even after active compaction.

Relevant SPEC sections: 61, 64-65, 73, 75, 126, 128-130, 180, 193, 199, 204-205, 210.

## Compiler / Runtime Changes

1. Add `packages/generator/prompts/2.11.0/{01-plan,02-author,03-critic,04-repair}.md` as the single active prompt suite.
2. Change `bundle-compiler.ts` active `SOURCE_FILES` and stage loading so production uses 2.11.0 directly rather than concatenating 2.4-2.10.1.
3. Keep frozen-hash functions/tests for historical prompt suites intact.
4. Update bundle metadata and active engine manifest to Prompt 2.11.0 / Engine 1.6.0 / rel_1.6.0.
5. Regenerate `production-authoring-bundle.md` deterministically.
6. Add a forward-only Supabase migration that advances the private generation bridge target release to `rel_1.6.0` while preserving Schema 2.4.0 submission compatibility and existing bridge security.
7. Update only current-version assertions/docs; never relabel historical submissions.

## Tests

Required focused regressions:

1. Active production bundle contains the exact-attribution invariant.
2. Active production bundle no longer embeds known obsolete hard-rule text such as the legacy `>=7` new-vocabulary critic requirement.
3. Active compiler loads only 2.11.0 prompt stages for current authoring.
4. Historical frozen prompt hash tests remain unchanged and passing.
5. Bundle deterministic reproduction passes.
6. Engine manifest/version tests pass with 2.11.0 / 1.6.0 / rel_1.6.0.
7. Production bridge regression confirms rel_1.6.0 stamping and Schema 2.4.0 acceptance.
8. Existing semantic/integrity tests remain green.
9. Final `pnpm lint`, `pnpm test`, `pnpm typecheck`, and `pnpm build` pass.

A small contract test should encode the Week 2 failure class in generalized language, for example asserting the active critic requires verification that attributes from distinct named modes are not fused. It should not hardcode Suno as a permanent product rule.

## Rollout / Safety

- Existing released and submitted materials keep historical prompt/release metadata.
- New authoring claims after the production bridge migration target rel_1.6.0.
- No historical migration is edited.
- No existing canonical material is silently changed.
- Week 2 may later be regenerated as a new revision if desired, using the new production contract and targeted repair principles.

## Success Criteria

The change is successful when the active model sees a materially smaller, coherent production prompt with no historical overlay sediment, retains current curriculum capabilities, explicitly catches exact named-feature attribution failures, and all objective generation/bridge/versioning invariants remain intact.