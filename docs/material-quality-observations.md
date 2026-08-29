# Material Quality Observations

## Purpose

- Record recurring or potentially meaningful material-generation patterns.
- Prevent premature engine changes from single examples.
- Promote an observation to a SPEC, prompt, or code change only after repeated evidence or a clear product decision.

**Core principle:** Observation ≠ requirement ≠ quality gate.

`confirmed-limitation` means repeated evidence supports the limitation, but it is not automatically a launch blocker, implementation requirement, or deterministic quality gate.

Lifecycle: `monitoring → repeated-evidence → decision → closed/promoted`

## Observations

### OBS-001 — Structural diversity is insufficient

- **ID:** OBS-001
- **Title:** Structural diversity is insufficient
- **Evidence:**
  - 15/15 materials used essentially the same lesson-stage skeleton: guided 3, independent 3, cap-transfer 3, production 2, retrieval 2, homework 3.
  - Question-type distributions were also highly similar across learners.
  - Different topics and personalization were meaningful, but the underlying lesson architecture remained highly uniform.
- **Interpretation:**
  - The system personalizes content well, but does not yet produce enough variation in lesson structure.
  - This is acceptable for Week 1 calibration, but longitudinally may become predictable.
- **Status:** confirmed-limitation
- **Action direction:**
  - Future work should expand the set of pedagogically valid lesson structures.
  - Diversity must remain bounded by learning goals, learner state, progression, and quality constraints.
  - Do not solve this by adding arbitrary quotas or deterministic rejection rules.

### OBS-002 — mini-report genre concentration

- **ID:** OBS-002
- **Title:** mini-report genre concentration
- **Evidence:** In the 2026-08-22 15-job production load test: mini-report 9, narrative 3, article 2, instructions 1.
- **Interpretation/risk:** The test cohort was unusually technology/science/data heavy, so this may be legitimate rather than engine bias.
- **Action threshold:** Re-evaluate after at least 50 real production materials with naturally diverse profiles.
- **Status:** monitoring

### OBS-003 — Multiword lexical units rarely selected

- **ID:** OBS-003
- **Title:** Multiword lexical units rarely selected
- **Evidence:** The 2026-08-22 15-job production load test produced almost entirely single-word core vocabulary despite optional 0–3 phrase/collocation support.
- **Interpretation/risk:** Not currently a defect because phrases are intentionally optional.
- **Action threshold:** Review only after longitudinal real-user vocabulary data shows useful phrase learning is systematically absent.
- **Status:** monitoring

### OBS-004 — Some analytical vocabulary repeats across unrelated learners

- **ID:** OBS-004
- **Title:** Some analytical vocabulary repeats across unrelated learners
- **Evidence:** In the 2026-08-22 15-job production load test, `evidence` appeared for 8 learners; `result` for 5; and `compare`, `conclusion`, `consistent`, `limit`, `pattern`, `source`, and `verify` appeared across several learners.
- **Interpretation/risk:** These may be legitimately useful cross-domain academic words, not unwanted repetition.
- **Action threshold:** Monitor longitudinal novelty per child, not global cross-child duplication. Promote only if individual learners repeatedly lose meaningful new-vocabulary capacity to unnecessary recurring analytical words.
- **Status:** monitoring

### OBS-005 — Controlled variation is insufficient

- **ID:** OBS-005
- **Title:** Controlled variation is insufficient
- **Evidence:**
  - Across the 15-job batch, similar learner states repeatedly converged on the same safe lesson structure and question composition.
  - The authoring system currently shows little controlled variation among multiple equally valid lesson designs.
- **Interpretation:**
  - The system is currently more deterministic than desirable.
  - This is NOT a request for unconstrained randomness.
  - Desired behavior is bounded stochasticity: when multiple lesson designs are equally valid, the system should be able to select among them while preserving pedagogy, progression, workload, and quality.
- **Desired future architecture:**

  ```text
  Pedagogical constraints
  → valid design space
  → diversity / controlled-variation policy
  → selected lesson design
  → deterministic validation
  ```

- **Status:** confirmed-limitation
- **Action direction:**
  - Explore controlled variation only after defining the allowed design space.
  - Never randomize learning targets, difficulty, learner history, feedback response, or correctness.
  - Variation may apply to genre, task framing, stage composition, question distribution, activity shape, and presentation where pedagogically equivalent.

## Promotion rule

An observation must **not** become a deterministic rejection rule solely because it appears once or in one test batch.

Promotion requires at least one of:

1. repeated longitudinal evidence across real learner materials;
2. measurable learner/parent impact;
3. a clear product/pedagogy invariant;
4. a deterministic integrity issue where incorrect output can be objectively proven.

Prefer telemetry or warnings over hard rejection when the concern is stylistic, distributional, or pedagogically context-dependent.

## Promoted Quality Invariants (Engine 1.5.0 / Prompt 2.10.0)

Following human review of production materials, four systemic failure classes were formally promoted into contracts, deterministic audits, and prompt overlays:

1. **Evidence-Boundary Integrity:** `evidenceScope: "primary_reading"` and explicit block-level `evidenceAnchors` in CAP assessment plans; deterministic audit rejects reading questions that reference non-reading instruction/activity boxes.
2. **Answer Grounding & Epistemic Modality Preservation:** Rationale and open response rubrics must strictly preserve textual conditions without fabricating observed outcomes or records.
3. **Lexical Integrity & Differentiated Ceiling Severity:** Mandatory context anchoring for new vocabulary in reading passages; out-of-ceiling untaught words trigger critical failures if assessed, repeated (>= 2), or excessive (> 3), while isolated single occurrences emit warnings; comprehensive morphological inflection/derivation and compound word normalization.
4. **Task Topology & Adversarial Quality Gate:** Mandatory 5-dimension substantive verification (`evidence-boundary`, `answer-entailment`, `lexical-integrity`, `task-topology`, `level-calibration`) in the critic gate to prevent mechanical template collapse and ensure level calibration.
