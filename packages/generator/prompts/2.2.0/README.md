# Prompt Version 2.2.0: Low-Model Reliability & Scaffolding

This directory contains the production authoring prompts for Prompt Version 2.2.0.

## Key Upgrades over 2.1.0

1. **Micro Contrastive Few-Shot (BAD ➔ GOOD):**
   - ~250 tokens demonstrating (1) `Trigger → Pattern → Trap → Try` actionable mental models vs abstract grammar rules, and (2) authentic CAP distractor mechanisms, parent explanations, and primary trap de-biasing.
2. **Local Question-Answer Authoring Protocol:**
   - Instructs models to author question + options + correct answer + explanation locally in thought sequence, then project into `studentLesson.practice[].questions[]` and `answers[]` without ID mutation or cross-token attention memory loss.
3. **Simple Target Evidence Recipes:**
   - Direct authoring recipes for Grammar (`guided ➔ independent ➔ retrieval/homework`), Reading (`independent ➔ CAP-transfer`), and Vocabulary (`exposure ➔ delayed retrieval`), satisfying pedagogical cross-stage evidence constraints without abstract mental load.
4. **Deterministic Server Normalization Awareness:**
   - Informs the model that `reading.wordCount` and mechanical summary stats are computed by the server, freeing tokens for narrative and pedagogical quality.

## Invariants Preserved
- `schemaVersion`: 2.0.0 (CurriculumPackage schema remains 100% stable).
- `promptVersion`: 2.2.0
- Baseline `prompts/2.0.1/` and `prompts/2.1.0/` remain byte-for-byte frozen.
