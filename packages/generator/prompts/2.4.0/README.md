# Prompt Suite 2.4.0 (Wave 4.1: CAP Curriculum Foundation & Long-Term Coverage)

## Summary of Innovations

1. **CAP Curriculum Foundation**:
   - Ingests decision-complete `capCoverage` capsule (decision Top-N tokens $<400$).
   - Strict planning priority:
     1. Demonstrated weakness / prerequisite gap
     2. Actual school progress
     3. Due spaced review
     4. High-value CAP coverage gaps (within grade range)
     5. Interest & genre optimization
2. **Schema 2.2.0 Invariants**:
   - `metadata.schemaVersion: "2.2.0"`
   - `reading.genre` & `reading.blocks: ReadingBlock[]`
   - `trackingDelta` records **EXPOSURE ONLY** (`introducedVocabularyIds`, `reviewedVocabularyIds`, `exposedGrammarTargetIds`, `exposedReadingTargetIds`, `exposedCommunicationFunctionIds`).
3. **Multi-Genre Communication Scaffolding**:
   - Dialogues, notices, and schedules incorporate authentic communicative functions (requests, apologies, directions, invitations, ordering, agreements).
