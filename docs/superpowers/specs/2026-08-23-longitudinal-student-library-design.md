# Longitudinal Student Learning Memory / Student Library Design

**Date:** 2026-08-23  
**Status:** Approved for implementation planning  
**Repository:** `egger-meow/eng-tutor-saas`

## Purpose

The database must preserve each child's complete, evidence-backed learning journey while the weekly generator receives only a compact, decision-ready memory capsule. The design separates three responsibilities:

```text
Permanent Student Library
immutable weekly facts + append-only evidence
        ↓
Current Learning State
deterministic, distilled projections
        ↓
Generation Working Memory
bounded recent context + targeted lifetime retrieval
```

Rolling generation history is an efficiency cache. Truncating that cache must never delete permanent learning history.

## Relevant Product Contract

Relevant SPEC sections: **37–52, 109–132, 141–153, 160–162, 179–182, 186–189, 193–194, 199, 204–205, and 210**.

The design preserves completed-material immutability, explicit generation jobs, feedback cutoffs, server-owned input fingerprints, private storage, parent/child isolation, compact generation context, and feedback-driven personalization. It does not create a runtime dependency on `eng-tutor`.

## Architectural Decisions

### Immutable baseline plus linked later evidence

The system will use an immutable base weekly snapshot and separately linked feedback/evidence records.

The weekly snapshot records what the completed canonical package established at completion time: curriculum exposure, learning targets, generation provenance, packet difficulty, hypotheses, next-review candidates, and improvement claims already validated by the deterministic finisher. Later feedback does not rewrite these generation-time facts.

Feedback and assessments create append-only evidence linked to the source material and target. Derived projections may be rebuilt as evidence accumulates. This preserves the distinction between what the system knew when generating Week N and what it learned afterward about Week N.

### Normalized facts, compact projections

No giant student-memory JSON blob will be introduced. Stable target IDs remain the join boundary between Git-owned curriculum definitions and Supabase-owned student facts.

JSON is allowed only for bounded, internally structured payloads whose members do not need independent indexing, such as a compact feedback projection, reading signals, or a snapshot's validated target-evidence map. Target histories and learner evidence remain normalized.

### Conservative deterministic mastery

Exposure is never assessment. Generated questions, answer keys, silence, missing feedback, and vague parent impressions never count as successful learner evidence.

An explicit failure immediately creates a review need. Mastery requires successful assessed evidence on at least two distinct materials, including a later success at least seven days after the first successful assessment. A later explicit incorrect result moves a mastered target to `reviewing`, sets `review_due = true`, and records `weakness_reason = regression_after_mastery`; the earlier mastery milestone remains derivable from the immutable evidence trail.

Partial evidence increments assessed and partial counts, but neither correct nor miss counts. It cannot grant mastery and is not treated as an explicit full failure. Unknown evidence changes none of those result counts and cannot grant mastery or regression. This is intentionally conservative, explainable, and compatible with the existing delayed-retrieval curriculum principle. The policy is stored as a versioned database constant/function contract and is covered by tests; changing it requires a forward migration and updated documentation.

## Data Model

### `child_weekly_learning_snapshots`

One row exists per completed material:

- identity: `id`, `child_id`, `material_id`, `material_week`, `sequence_number`;
- provenance: generation job, schema, curriculum, prompt, generator, model, and input fingerprint identifiers;
- learning focus: reading level/signals, introduced/reviewed vocabulary IDs, grammar IDs, communication-function IDs, measurable targets, and target-evidence map;
- forward memory: hypotheses, next-review candidates, recurring/observed mistakes, verified strengths/weaknesses known at completion, and meaningful state delta;
- validated generation evidence: personalization and improvement evidence;
- timestamps: historical `recorded_at`, optional actual backfill execution time `backfilled_at`, and row-audit `created_at`.

`sequence_number` is the immutable one-based ordinal of the child's canonical completed-material delivery chain. It is never derived from wall-clock week differences. Live recording and backfill use the same deterministic ordering: `released_at nulls last`, completion/creation time, then material ID. A correction is a new traceable material in the canonical chain and never rewrites an existing snapshot. Parent UI renders this authority as `Week ${sequenceNumber}`; `material_week` remains only a source-package label.

`material_id` is unique. Rows are service-created and immutable through a trigger. They survive child archival because archival is a flag, not deletion. Existing hard-delete semantics are not broadened by this feature.

### `child_learning_evidence`

Each row represents one auditable learner observation:

- `id`, `child_id`, `material_id`, optional `feedback_id`, and optional `feedback_processing_id`;
- `target_type`: vocabulary, grammar, communication function, or reading;
- canonical `target_id` (nullable only for reading-wide evidence);
- `evidence_type`: `learner_assessment`, `structured_parent_observation`, or `captured_exercise_result`;
- `result`: correct, incorrect, partial, or unknown;
- `assessed` flag;
- `source` and evidence-strength classification;
- `observed_at`, `created_at`, and `processor_version`;
- stable `idempotency_key`.

The evidence table is append-only. It has a unique idempotency key and composite foreign-key ownership checks so material, feedback, and child cannot cross boundaries.

Packet facts—including introduced/reviewed target IDs, target evidence, assessment opportunities, hypotheses, generated questions, and answer keys—belong in the immutable snapshot. They may describe exposure or an intended assessment opportunity, but they never create learner-performance evidence. Evidence rows require an actual learner assessment, structured parent observation, or captured exercise result. Vague feedback may create a reading-wide unknown/weak-area observation without attaching invented target-level correctness.

### Feedback processing audit

`feedback_memory_processing` records one immutable processing revision per feedback revision fingerprint. It stores processor version, source cutoff classification, processing time, sanitized outcome metadata, and `status = effective | superseded`. The raw feedback row remains parent-editable, while child/material identity remains immutable. Exactly one processing revision per feedback may be effective.

Feedback-derived evidence always records both `feedback_id` and `feedback_processing_id`. An identical current payload fingerprint returns the existing processing revision. A changed fingerprint atomically supersedes the previous effective revision, inserts a new effective revision, appends evidence linked to it, and rebuilds affected projections from effective evidence only. Superseded feedback evidence remains immutable historical provenance but is excluded from current projections, preventing double counting.

### Progress projections

`child_vocab_progress`, `child_grammar_progress`, and `child_communication_progress` retain their stable primary keys and add or standardize:

- exposure count and last exposure time/material;
- assessed count, correct count, partial count, miss count;
- first and last assessment time/material;
- status and due-for-review state;
- mastery and weakness reason fields;
- evidence-policy version and updated timestamp.

Counts are recomputed or updated exclusively from canonical snapshot exposure and effective evidence. `mastery_score` may remain for compatibility but is a derived display-free value and never the sole provenance for a transition.

Reading trajectory and recurring mistakes remain distilled in `child_learning_state`, backed by snapshot/evidence queries rather than unbounded accumulation.

## Lifecycle and Transactions

### Material completion

```text
canonical package accepted
→ deterministic finisher succeeds
→ material and job completed transactionally
→ curriculum observations recorded
→ immutable weekly snapshot inserted or verified identical
→ exposure projections and current state refreshed
```

`worker_record_curriculum_observations` remains the service-only entry point and calls the snapshot canonicalizer in the same idempotent observation transaction. Its existing `observations_recorded_at` guard cannot bypass snapshot conflict verification. A retry for the same material returns the existing snapshot only when every reconstructed historical fact is identical; a conflicting reconstruction raises an exception and refreshes no projection. Silent `ON CONFLICT DO NOTHING` is forbidden here.

If snapshot/projection recording fails after material completion, the material stays completed and an operator-visible retry can safely replay observation recording. It never mutates canonical material or PDFs.

### Feedback submission

The browser continues to upsert an owned feedback row under RLS. A narrow SECURITY DEFINER trigger/function queues or performs deterministic memory processing without granting browser mutation access to memory tables.

Processing:

1. validates ownership through the immutable child/material association;
2. fingerprints the current feedback revision;
3. classifies whether it qualified for the immediate next generation cutoff;
4. records difficulty/completion/weak-area observations;
5. maps only unambiguous canonical target references to target evidence;
6. refreshes progress and current-state projections;
7. records an auditable processing result.

Free prose is retained as the raw observation. The database does not use open-ended NLP to manufacture target IDs or high-confidence mastery. Existing structured target references may be interpreted only when they match canonical IDs or deterministic supported aliases.

### Backfill

A service-only idempotent backfill function scans completed materials lacking snapshots in stable canonical delivery order. It reconstructs generation-time facts from `canonical_source`, `generation_summary`, material provenance, and existing observation records. Historical completion/release time becomes `recorded_at`, the execution time becomes `backfilled_at`, and `created_at` remains row-audit time. It then processes current feedback revisions through the same feedback processor.

Unknown historical fields remain null or empty. The backfill never edits a material, creates assessment success from answer keys, or duplicates snapshots/evidence.

## Generation Context

`worker_generation_context()` keeps the existing job-claim and fingerprint boundary. Its output is extended, not replaced, with:

- current profile, preferences, school progress, and distilled learning state;
- lifetime vocabulary/grammar/communication counts and statuses;
- due, verified weak, uncertain, mastered, and recommended target IDs;
- bounded `compact_weekly_history` (currently 12 entries);
- bounded recent diversity signals;
- targeted older evidence for selected due/weak/prerequisite-relevant targets;
- qualifying source-material feedback only when it meets the job cutoff.

The context never embeds all snapshots or old canonical packages. Older weaknesses remain retrievable from normalized progress/evidence regardless of compact-history truncation.

Context tests will assert a bounded serialized-size envelope across 20 weeks rather than only checking the number of history entries.

The private ChatGPT bridge continues to receive the server-produced input snapshot and fingerprint. Any bridge projection/schema fixture is updated atomically with the database context contract; the deterministic finisher continues verifying the fingerprint unchanged.

## Parent-Safe Read Model

Two authenticated SECURITY INVOKER/owned-query RPCs provide the Student Library:

1. a sequence-cursor-paginated chronological timeline returning stable facts for each released week;
2. an aggregate summary returning total weeks, exposed/mastered counts, reading trajectory, persistent weak areas, and recent improvement signals.

The projection excludes canonical source, raw model reasoning, prompt terminology, mastery scores, confidence jargon, and internal CAP machinery. Feedback prose is returned only where already parent-owned and necessary; timeline labels are deterministic Traditional Chinese mappings from stored facts. MVP target-level assessment is intentionally sparse, so exposed targets default to learning/uncertain until explicit evidence exists. Mastery is always labelled as evidence-backed and never inferred from packet completion, answer keys, missing feedback, or vague prose.

Rows are protected by RLS ownership through `children.parent_id = auth.uid()`. Browser roles receive read access only through owned rows/RPCs. All mutation functions remain service-only except the existing tightly scoped feedback write path.

## Dashboard Experience

Each child card retains current-material download, feedback, delivery, and past-material behavior. A compact `學習軌跡` section adds:

- summary: weeks used, vocabulary exposed/mastered, grammar progression, communication progress, and current reading trajectory;
- timeline: Week 1 through current, newest-first in the interface with an accessible chronological data order and pagination;
- factual milestones: introductions, reviews, explicit difficulties, spaced improvement, and next review actions.

Copy answers four parent questions quickly: what the child learned, where they struggled, where they improved, and why the next review is scheduled. It does not become an analytics cockpit and does not expose later internal queue cycles.

## Security and Privacy

- New public tables have RLS enabled and explicit parent-owned SELECT policies.
- Browser INSERT/UPDATE/DELETE grants are absent for snapshots, evidence, progress, and processing audit tables.
- SECURITY DEFINER functions set `search_path = ''`, schema-qualify objects, validate ownership, and have execute revoked from `public`, `anon`, and `authenticated` unless intentionally parent-facing.
- Target IDs and opaque record IDs are logged; raw feedback and child context are not.
- No production child data, PDFs, or copied Supabase rows enter Git.
- Completed materials and private Storage authorization remain unchanged.

## Verification Strategy

Database regression coverage will prove:

1. twenty completed weeks retain twenty snapshots while compact history remains bounded;
2. repeated exposure without assessment creates neither weakness nor mastery;
3. explicit failure creates weakness/review status;
4. spaced successful assessments on distinct materials can create mastery;
5. missing feedback creates no learner-performance evidence;
6. an early weakness remains retrievable after leaving recent history;
7. repeated feedback processing does not duplicate or double-count evidence;
8. repeated observation recording produces one snapshot;
9. Parent A cannot read Parent B's snapshots/evidence/timeline;
10. repeated backfill is stable and duplicate-free;
11. timeline order, pagination, parent-safe fields, and aggregates are correct;
12. the Week 1→20 Kobe scenario is classified from the full evidence trail.

Frontend tests will cover loading, summary copy, timeline pagination, safe empty/unknown states, and preservation of existing material history. Generator/bridge tests will cover context shape, old-weakness retrieval, and bounded serialized size.

Final verification runs `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:db`, relevant generator/frontend tests, `pnpm build`, `pnpm generate:synthetic`, and the added longitudinal regression suite. Failures must be fixed before completion is claimed.

## Documentation Changes

Implementation updates:

- `docs/SPEC.md` within the existing learning-memory, feedback, generation-history, schema, dashboard, testing, milestone, and Definition-of-Done sections;
- `docs/SPEC-TOC.md` only if a heading is renamed or added;
- `docs/data-model.md` with the three-layer memory model and normalized evidence;
- `docs/generation-workflow.md` with snapshot/evidence lifecycle, retry, cutoff, and context retrieval behavior.

## Out of Scope

- automatic scoring from photographed worksheets;
- learner login or direct exercise-result capture UI;
- ML-based mastery prediction;
- raw prompt/PDF archival inside memory tables;
- production data mutation or manual production backfill during repository implementation;
- a generalized analytics warehouse.

## Completion Invariant

At Week 20, Week 50, or Week 100, permanent history remains queryable and old relevant evidence can affect target selection, while the model receives only bounded recent history and targeted lifetime signals:

> **The database remembers the child's entire learning journey; the generator receives only the compact, relevant memory needed for the next week.**
