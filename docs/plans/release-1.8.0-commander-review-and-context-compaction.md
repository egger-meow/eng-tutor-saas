# Release 1.8.0 commander review and context compaction implementation plan

> Implementation handoff. Review baseline: `587a16b`, 2026-09-06. This document does not certify a corrected runtime or authorize a claim that production quality has passed. Follow the repository's no-TDD preference; implement coherent changes, then verify. Use executing-plans if a planning skill is needed; no automatic agent dispatch is required.

**Goal:** Make specific interests drive evidence-backed selection and useful teaching forms, then reduce actual context without losing the information needed to do either.

**Architecture:** Keep the existing claim / author / immutable submit / publisher boundaries. Add the missing typed stage transitions and share their context projections across executors. Persist retrieval evidence outside model prompts and send each stage only the evidence and contract it needs.

**Stack:** Existing TypeScript generator/worker, Postgres/Supabase bridge, canonical Schema 2.5 and renderer 1.5. No new vector service is required for the first correction.

**Requirements read:** SPEC sections 51, 52, 74, 75, 79, 117, 118, 129, 180, 181, 193, 194, 199, 204, 205, 210; `docs/eng-tutor-upstream.md`. Read the complete SPEC-TOC first when implementing; expand relevant claim/security requirements before changing the RPC.

## Review verdict

The release adds useful primitives, but the walkthrough overstates runtime integration and evidence. Do not accept “fully delivered”, “55.1% actual lifecycle savings”, “authentic interest integration”, or “zero format collisions” as verified outcomes.

### P1: CAP retrieval still runs without an actual assessment planning transition

`packages/worker/src/local-codex-authoring.ts:414` passes the original claim context to `prepareAuthoringBundleWithPrecedents`. Earlier model calls produce only a public research brief and grounding text; neither populates `context.assessmentPlans`. Ordinary contexts without plans/primarySkill therefore assemble zero cards. The helper supports post-plan input, but its production caller does not create that input. `prompt-v2.ts:18` has the same conditional assumption. Its duplicated mapping also consumes `difficulty` / `cognitiveDepth`, while the active planning prompt requests `targetLanguageDifficulty` / `targetCognitiveDepth`.

**Required outcome:** a real private packet-planning result, validated before retrieval; a shared intent adapter; per-item ref/reason bindings available to Author and checked against canonical plans. `noPrecedentReason` must describe a completed relevant search or a legitimate exemption, not make a missing planner acceptable. Do not silently classify ordinary school grades as A1.

### P1: Stage 2 history has no production worker caller

Repository search for `worker_fetch_targeted_student_history` under worker source finds only `two-stage-history-retrieval.test.ts`. The test calls its own mock, not a production client. Migration 20260906180000 removes bulk older evidence from Stage 1, but the runner does not retrieve its replacement. This is missing information, not verified efficiency.

**Required outcome:** explicit target selection followed by the real job-bound RPC, with returned evidence reaching the private planner/author. A transport failure must not be treated as an empty history. Test the real runner orchestration and actual SQL behavior separately.

### P1: Production RPC does not enforce the advertised immutable claim boundary

Read-only production function inspection on project `ykzszjrqynrhgdhoeovo` confirmed the migration definition is deployed. Its `p_claim_snapshot_id` argument is unused; job status is unchecked; NULL owner passes `<>`; NULL lease passes the expiry check; a missing snapshot falls back to caller cutoff or `now()`. Snapshot worker identity is not compared. Execution is restricted to service_role, so this is an internal bridge integrity issue, not evidence of anonymous access.

The hash covers evidence JSON only, omits claim/query identity, is not persisted/bound by this function, and orders ties only by observed time. The empty-target shortcut hashes empty bytes rather than the normal JSON evidence representation. `observed_at <= cutoff` alone does not freeze later changes to evidence or processing status.

**Required outcome:** reject missing/stale/mismatched claims and missing leases/snapshots; derive authority from server state; define an attempt/fingerprint identity rather than calling job_id an immutable snapshot identity. Use stable evidence IDs and deterministic tie order. Persist the selected evidence and its server-owned query/claim manifest so a retry sees the same result. Do not trust a supplied hash as proof or mutate the original claim fingerprint. Preserve documented access for local AND online executors without exposing a service credential.

### P2: Recent format window has an ordering mismatch, and runtime capsule delivery is incomplete

`format-planning-capsule.ts:104` and `diversity-capsule.ts:68` use `slice(-lookbackWeeks)`. The new trajectory fixture prepends newest weeks with `unshift`; SQL recent delivery aggregation also produces newest-first data. With more than four entries, the helper can keep old weeks. The production migration adds raw format memory but does not itself supply the `diversityCapsule.formatPlanningCapsule` promised by the prompt. Confirm its construction at each real entry point.

**Required outcome:** normalize ordering by immutable week sequence (date fallback only for legacy records), select the most recent bounded window, and build the capsule through the shared presentation assembler. Avoid double slicing with contradictory assumptions. Repetition remains a pedagogical signal, never a hard rotation ban.

### P1: Claimed savings and quality evaluation do not measure those outcomes

`run-context-compaction-benchmark.ts:142` assumes a 98,000-character routing block. Planning/research/history/critic/repair sizes are also constants. It then reports characters/4 as tokens. The old routing section was 17,452 characters; approximately 98,000 was the whole old bundle. This inflates the baseline and does not observe executed stages or repairs.

`multi-week-trajectory-eval.test.ts` manually chooses all ten topics/formats. Assertions check container shapes and membership in those fixtures, not generated selection, collisions, factual support, or instructional quality. “Character choice” in the benchmark is generic creative leadership, not a named fictional character. These remain useful unit fixtures after being labeled accurately.

Focused review rerun: 3 files / 9 tests passed. That confirms their current assertions only. No new student packet was generated, submitted, or published for this review.

## Actual fixed-context inventory

Measured from Git `736e80a` and review HEAD, with CRLF normalized to LF. Character counts, not tokenizer/provider measurements. The active bundle has an empty selective section, before dynamic cards and private context.

| Measurement | Characters |
|---|---:|
| Previous entire bundle | 98,050 |
| Previous routing section | 17,452 |
| Current entire bundle | 83,259 |
| Net fixed-bundle reduction | 14,791 (15.09%) |
| Current schema section | 29,741 |
| Product rules + quality rubric | 14,041 |
| Model profile section | 6,509 |
| Planning prompt | 9,152 |
| Author prompt | 5,973 |
| Critic prompt | 6,660 |
| Repair prompt | 4,208 |

Do not extrapolate these numbers to lifecycle token savings. Expanded cards can offset static savings. The runner currently executes private brief, public research, and an author call plus possible repair calls; it does not expose separate measured model calls for all six benchmark rows.

## Implementation order and acceptance

### 1. Close stage transitions before deleting more information

Files: `packages/worker/src/local-codex-authoring.ts`, `prompt-v2.ts`, `authoring-context.ts`; `packages/generator/src/cap-retrieval.ts`, `selective-bundle-assembler.ts`; new shared private packet-plan module following existing worker patterns; a forward Supabase migration and DB tests.

- [ ] Preserve the existing privacy-screened public brief. After evidence arrives, run a private packet plan using learning state, recent memory, and public facts. Its validated output includes selected angle/evidence rationale, selected learning target IDs, and per-item canonical CAP intent fields. Do not send learning targets or private history to web search.
- [ ] Resolve targeted older evidence for selected targets; let the private plan revise a target when evidence changes the decision, with a bounded second request if justified. Record why no older evidence was needed rather than silently skipping retrieval.
- [ ] Retrieve CAP cards for each final normal assessment intent, deduplicate expansion across items, and preserve itemId -> refs/search outcome. Feed that artifact to Author; verify canonical package provenance agrees. Share the same adapter/assembler in local and online/manual protocols.
- [ ] Correct the RPC integrity issues above with a forward migration. Exercise NULL owner/lease, expired lease, wrong worker, wrong/missing snapshot, stale attempt, post-cutoff evidence, equal timestamps, empty targets, and repeat retrieval after evidence changes. Check tenant isolation with two synthetic children. Keep tests transactional/rollback where run against production.
- [ ] Replace the mock-only integration claim with a runner test that starts from an ordinary claim lacking assessmentPlans, records actual invoked stages/RPC parameters, and observes retrieved evidence/cards in the author input. A mocked model may return a plan, but the test must execute production orchestration.

### 2. Verify interest depth and teaching expression

Files: current successor of `packages/generator/prompts/2.13.0/`; `curriculum/interest-exploration.md`; format/diversity capsule modules and tests.

- [ ] Keep a compact private selection record: public entity/work/version, question, evidence-backed alternatives actually explored, decisive fact/source IDs, target fit, and relevant recent-theme overlap. It is acceptable to keep a strong science explanation. Neither biography nor current news is mandatory.
- [ ] Keep public research outputs bounded to useful propositions, source identity/date, and uncertainty; follow promising names/events/techniques when initial results are shallow. Never fabricate alternate searches to fill a record.
- [ ] Normalize recent-week ordering, test both chronological and reverse input with more than four deliveries, and verify week 1 / empty history. Ensure the shared runtime actually inserts the format capsule.
- [ ] Choose forms from the learning operation: comparison grid; evidence/inference organizer; timeline or turning-point sequence; process/causal sequence; classification; before/after revision; supported written response. These reuse existing canonical primitives. A timeline can teach chronology or ask students to infer turning points; decide which, then align the task, answer and workload.
- [ ] Prefer informative scaffold choices (partly filled evidence column, one worked step, labels supplied vs student-produced). Do not add format quotas or prevent justified reuse. Keep knowledge-organizer teaching content distinct from answerable blanks, with every blank supported and answered in Parent output.
- [ ] Have independent review inspect actual Student/Parent PDFs, answer entailment, self-study explanations, writing space and workload. Never count a table tag or favorite name as proof of educational quality.

### 3. Compact by stage, using explicit projections

Files: bundle compiler and tests, shared authoring-context/stage assembler, successor prompts, evaluation script and reports.

| Stage | Necessary model input | Keep outside this stage |
|---|---|---|
| Private target/interest planning | Current constraints, due/weak priorities, recent hooks/entities, selected feedback; compact planning rules | Full output schema, full CAP catalog, old worksheets |
| Public research | Screened public entities/questions, source/freshness/copyright rules | All learner state, private selection rationale and history |
| Private packet/assessment plan | Public fact candidates, relevant learning evidence, format capsule, intent contract | Full previous packets; renderer implementation |
| CAP/history retrieval | Typed intent/target query; server claim authority | Large catalogs need not enter any model prompt |
| Author | Validated plan, bounded source facts and cards, selected learner evidence, canonical output contract, active author rules | Duplicate planning/repair prose, unrelated model profile |
| Critic | Complete current candidate, authoritative facts, target/workload constraints, applicable rubric and provenance | Original raw search dumps, unrelated historical packages |
| Repair | Current candidate once, actionable findings, affected evidence and dependencies, essential invariants | Superseded candidate, duplicate findings, irrelevant profiles |

- [ ] Start with lossless duplicate removal: only collapse exactly equal top-level/nested delivery-memory copies; preserve conflicting records for diagnosis. Retain job/child identity, inputFingerprint, release, cutoff, lease authority and source/evidence identity in their authoritative storage and required stage inputs.
- [ ] Provide only the resolved model quality profile. Consolidate repeated project rules through a rule-ID coverage map rather than paraphrasing them separately in every stage. Do not put the audit coverage map or full source hashes into every model message.
- [ ] Replace the large schema teaching example only when a smaller generated field/constraint contract demonstrates equivalent field coverage. Preserve enums, layout/answer shapes, required fields, provenance bindings and version semantics. Ordinary prose about what inference or a table means can shrink; repository-specific behavior cannot be delegated to presumed model knowledge.
- [ ] Keep selected mistakes and feedback concrete. Do not reduce them to vague labels such as “weak grammar”. Bound Stage 1 target candidates and return totals/continuation metadata; all mastered/due IDs also grow over time. Do not silently truncate needed targets. Exact target/history retrieval should use existing structured IDs and indexes first.
- [ ] Treat embeddings as an optional measured improvement for fuzzy semantic discovery only. They do not replace exact IDs, due dates, source authority, claim identity or cutoffs. Add hybrid/vector retrieval only if a labeled miss set demonstrates that existing metadata/text retrieval fails; compare recall and latency before adding infrastructure.
- [ ] Use surgical repair input, but preserve full current candidate for whole-package integrity checking and final validation. Count total input across retries; smaller individual prompts that cause more repairs are not a win.

### 4. Replace estimates with reproducible evidence

- [ ] Mark current benchmark reports as modeled estimates and retract unsupported production/quality conclusions. Keep historical artifacts auditable instead of silently overwriting their meaning.
- [ ] Capture exact stage inputs from the same synthetic cases through old and corrected assemblers. Record source commit, prompt/bundle hashes, case ID, input byte/character counts, measurement method, stage call counts, actual tokenizer/provider usage when available, and repair totals. Do not label chars/4 as measured tokens.
- [ ] Separate static assembly comparison, retrieval correctness, model quality evaluation, and live deployment verification. Each can pass/fail independently.
- [ ] Run actual authoring on public/synthetic profiles covering keshi's pre-career transition, an idol/group's creative work, named anime production, a named film adaptation, a named fictional character's supported decision, a good science explanation, an existing table/organizer example, and current-vs-evergreen selection. Candidate choices must come from research, not fixed expected titles. Retain original sources and private review evidence outside learner PDFs.
- [ ] For longitudinal evaluation, use each generated delivery summary as the next week's input and vary meaningful feedback. Review unnecessary repetition of question/angle/reasoning, appropriate continuity, and scaffold progression. “Zero repeated formats” is not the goal. Multiple runs are needed before claiming stable model behavior; report the actual sample size and disagreements.
- [ ] Accept compaction only with mandatory rule coverage, correct selected evidence, no missing CAP retrieval, no increased critical quality failures, readable PDF pairs, and reported aggregate cost including repairs. Report quality uncertainty; do not substitute unit-test counts for output review.

### 5. Version and deliver after verification

- [ ] Freeze existing 2.13.0 prompts; create a consolidated successor. For corrective integration without new canonical behavior, a candidate release is Engine 1.8.1 / Prompt 2.13.1 / Worker 1.7.1 with corresponding bundle and release ID; confirm against repository version rules at implementation time. Keep Schema 2.5 and renderer 1.5 unless their contracts actually change.
- [ ] Update SPEC #117/#129/#205 as applicable, production/local authoring docs, bundle metadata, evaluation status and deployment tests consistently. Preserve reading/rendering of old 2.4/2.5 packets and immutable in-flight claims.
- [ ] Run focused tests, full required workspace checks, meaningful SQL integration and synthetic PDF validation. Then commit/push the coherent correction to the current upstream branch, apply pending migrations/deploy affected executors per repository policy, and verify production function/release bindings and documented entry-point behavior.

## Commander handoff prompt

Implement this document against current HEAD after verifying the baseline has not changed. Prioritize the P1 missing transitions and history integrity before measuring savings. Preserve specific-interest exploration and pedagogical choice; do not add deterministic genre/format quotas. Use existing canonical layouts and structured retrieval first. Deliver real runner and SQL evidence, a measured stage-context comparison, and reviewed synthetic output before claiming release acceptance. Never count missing cards/evidence as compaction, or fixture-authored topic diversity as generated quality. Do not generate or submit live child jobs for evaluation. Return changed files, exact test scope, remaining failures, benchmark method/results, version matrix, commit/push and deployment readback. The commander will review the actual patch and evidence.
