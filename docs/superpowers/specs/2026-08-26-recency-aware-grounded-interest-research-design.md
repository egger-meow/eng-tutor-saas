# Recency-Aware Grounded Interest Research Design

Date: 2026-08-26  
Status: Approved for implementation

## Objective

Upgrade grounded-interest research so fast-moving learner interests actively trigger recent-development discovery. When a credible, age-appropriate, lexically feasible recent development serves the learning target at least as well as a durable angle, production authoring prefers it. When recent candidates are weak, speculative, inaccessible, unsafe, thin, or pedagogically inferior, an evergreen lesson remains valid.

The learning sequence remains:

```text
learning need -> learning target -> genre / information structure -> researched real-world topic
```

For a meaningfully time-sensitive interest, the research portion becomes:

```text
safe public interest terms
-> recent-development discovery
-> durable candidate discovery when useful
-> candidate comparison
-> teachable topic selection
-> fact verification
-> grounding
-> authoring
```

This is not a news-feed subsystem. Learning need remains authoritative.

## Release Architecture

Create Prompt Suite `2.8.0` as an additive overlay on the existing frozen Prompt `2.4.0` baseline and frozen `2.5.0`, `2.6.0`, and `2.7.0` overlays. Prompt `2.7.0` and every earlier historical suite remain byte-for-byte frozen.

Advance the generation/pedagogy engine, worker, and release manifest from `1.3.0` to `1.4.0`, because time-sensitivity classification, candidate selection, criticism, and repair are production engine behavior. Keep Curriculum Package Schema `2.3.0`, quality profile `1.1.0`, and PDF renderer `1.0.0`; no canonical grounding shape or rendering contract changes.

The deterministic bundle compiler adds the `2.8.0` overlay after `2.7.0`, emits bundle `2.8.0-prod`, and records Engine `1.4.0`, Prompt `2.8.0`, and Schema `2.3.0`. The generated production bundle is never edited manually.

## Research Planning

For each isolated claimed job, planning assesses whether the generalized public interest/domain is meaningfully time-sensitive. The assessment is a research-planning signal only; it is not persisted as a canonical learner-profile field.

The assessment uses a general rule: recent discovery is required when developments, releases, results, discoveries, events, or changing public facts are reasonably likely to change which grounded angle is most interesting or educational. Examples inform judgment but must not become the sole hardcoded classifier.

Durable topics proceed through the existing evergreen research funnel. Fast-moving topics must inspect recent developments before selection. The planner compares recent and evergreen candidates using:

- interest relevance;
- learning-target and information-structure fit;
- source reliability and factual support;
- age appropriateness and safety;
- lexical-ceiling feasibility;
- concrete factual density and teachability;
- novelty relative to recent lessons;
- copyright-safe synthesis feasibility;
- freshness appropriate to the domain and the authored framing.

A strong recent candidate wins when it provides an equally good or better educational context. Recency alone never wins. The planning/quality evidence records a concise internal rationale for selecting current material or falling back to evergreen material, without exposing research machinery in Student or Parent PDFs.

## Privacy and Source Selection

External queries contain generalized public topic terms only. They never contain child or parent names, IDs, job IDs, school, grade/level, textbook state, feedback, mistakes, learning history, private profile prose, context notes, or other private learner information. Private context may influence internal candidate comparison but cannot be interpolated into search terms.

Source priority remains:

1. official or primary sources;
2. reputable news organizations;
3. reputable science or educational publications;
4. reliable reference sources.

Primary release sources establish what was announced. Independent sources provide verification or context where useful. Marketing claims are not treated as independently established facts. Wikipedia/Wikimedia may assist discovery or cross-checking but cannot supply the narrative template.

## Current-Event Contract

Selected current-event grounding continues to use `temporalMode: current`, `researchedAt`, valid `publishedAt` values for supporting sources, and passed freshness evidence. Deterministic validation retains causal timestamp and required-date checks.

Semantic freshness is topic-aware. Very fast-moving areas give substantially more weight to newer credible evidence; slower domains may support an older development that remains current. The critic evaluates freshness against both the domain and how the lesson describes the event. It distinguishes publication dates from event dates, rejects undated evidence needed to establish recency, and rejects stale material presented as new.

Rumor, prediction, unsupported speculation, social-media hearsay, and unverified marketing claims cannot become factual lesson claims. Important factual propositions are cross-checked when appropriate.

## Grounding and Authoring

The canonical chain remains:

```text
Source -> Fact -> Claim -> Actual lesson prose
```

Research extracts propositions, not source prose. Authoring independently synthesizes original, level-appropriate educational English. It does not copy source framing, structure, press-release wording, protected dialogue, scripts, subtitles, manga text, or long copyrighted descriptions.

Current selection cannot weaken factual density, source quality, lexical control, grammar quality, CAP relevance, answer entailment, workload integrity, personalization, or the actual learning target. A topical hook serves the lesson; it does not hijack it.

## Critic and Targeted Repair

The production critic rejects:

- a fast-moving interest whose recent developments were ignored without a defensible pedagogical reason;
- stale or undated current grounding;
- recency claims unsupported by cited sources;
- rumor or speculation presented as fact;
- current selection based on novelty despite pedagogical inferiority;
- generic evergreen noun-skinning when a strong current angle was available;
- copied or source-shaped news prose;
- current-event complexity that breaks the lexical ceiling;
- a topical hook that displaces the learning target.

The critic does not require `current` merely to pass. It decides whether research meaningfully considered freshness where freshness matters and selected the strongest context for the learner and target.

Repair remains surgical. Freshness, source adequacy, factual support, temporal classification, or topic-selection failures trigger re-research and updates only to dependent grounding, prose, answers, and references. Valid unrelated sections, stable IDs, and prior immutable attempts remain intact. Existing retry, submission, Finisher, rendering, storage, and completion semantics do not change.

## Product Contract Synchronization

Update existing sections rather than add redundant SPEC sections:

- Section 61 — Production Curriculum Sources;
- Section 73 — Natural Reading First;
- Section 118 — Worker Reads Three Sources;
- Section 128 — Traceability;
- Section 129 — Prompt Versioning;
- Section 180 — Generator Validation Requirements;
- Section 205 — Curriculum Agent Instructions.

Also synchronize `docs/product-rules.md`, `docs/curriculum-quality-rubric.md`, the Scheduled Work contract, Prompt `2.8.0`, bundle compiler metadata/source lists, engine manifest constants, active-version tests, and affected provenance/bridge fixtures. `SPEC-TOC.md` remains unchanged because no heading is added, removed, renamed, or renumbered.

## Regression Strategy

Behavior-focused tests cover:

- fast-moving technology/AI research where a credible recent candidate is considered and may be selected as `current`;
- fast-moving research where weak or speculative current candidates produce a defensible evergreen fallback;
- durable research that remains evergreen without an artificial news requirement;
- query construction rules that prohibit every private learner-context category;
- missing, stale, future, or inconsistent current publication metadata rejection across deterministic and semantic boundaries;
- exact current-event source-to-fact-to-claim-to-prose provenance;
- frozen Prompt `2.7.0` and earlier hashes;
- Engine `1.4.0`, Prompt `2.8.0`, bundle `2.8.0-prod`, Schema `2.3.0`, worker, documentation, and provenance consistency;
- deterministic bundle recompilation and source hashes;
- unchanged submission, retry, Finisher, storage, and PDF behavior.

Verification runs focused generator, prompt, grounding, freshness, privacy, frozen-hash, and bundle tests first, followed by bundle compilation/check, canonical validation, synthetic generation, PDF determinism where affected, `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`. No real production generation job or customer job mutation is permitted.

## Non-Goals

- No new external research service or generic news feed.
- No Responses API migration.
- No queue, claiming, retry, submission, Finisher, storage, or PDF architecture redesign.
- No grounding table or schema-version bump.
- No learner-facing engineering citations.
- No runtime dependency on `eng-tutor`.

## Product Principle

Keep the learner private, but keep the curriculum connected to the real world. Recent developments are preferred only when they make the next level-appropriate lesson more meaningful and effective.
