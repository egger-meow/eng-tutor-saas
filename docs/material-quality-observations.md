# Material Quality Observations

## Purpose

- Record recurring or potentially meaningful material-generation patterns.
- Prevent premature engine changes from single examples.
- Promote an observation to a SPEC, prompt, or code change only after repeated evidence or a clear product decision.

**Core principle:** Observation ≠ requirement ≠ quality gate.

Lifecycle: `monitoring → repeated-evidence → decision → closed/promoted`

## Observations

### OBS-001 — Practice structure may be too uniform

- **ID:** OBS-001
- **Title:** Practice structure may be too uniform
- **Evidence:** In the 2026-08-22 15-job production load test, 15/15 materials used essentially the same stage/question-count skeleton: guided 3, independent 3, cap-transfer 3, production 2, retrieval 2, homework 3.
- **Interpretation/risk:** Fine for Week 1 calibration, but repeated longitudinally it may become predictable.
- **Action threshold:** Recheck after 4+ weeks of real learner materials. Do not change unless repeated structure meaningfully reduces variety or engagement.
- **Status:** monitoring

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

## Promotion rule

An observation must **not** become a deterministic rejection rule solely because it appears once or in one test batch.

Promotion requires at least one of:

1. repeated longitudinal evidence across real learner materials;
2. measurable learner/parent impact;
3. a clear product/pedagogy invariant;
4. a deterministic integrity issue where incorrect output can be objectively proven.

Prefer telemetry or warnings over hard rejection when the concern is stylistic, distributional, or pedagogically context-dependent.
