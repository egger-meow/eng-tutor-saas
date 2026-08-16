# Prompt Suite 2.3.0 (Wave 4: Multi-Genre Reading, Deep Situational Personalization & Trajectory Diversity)

## Key Evolution from 2.2.0:
1. **Multi-Genre Reading Architecture (Schema 2.1.0)**:
   - Replaced monolithic `paragraphs: string[]` with native discriminated `blocks: ReadingBlock[]` (`paragraph`, `dialogue`, `notice`, `schedule-row`).
   - Native support for 7 Taiwan CAP aligned genres (`article`, `narrative`, `dialogue`, `notice`, `schedule`, `instructions`, `mini-report`).
2. **Deep Situational Personalization vs Superficial Skinning**:
   - Explicit ban on simple noun swapping.
   - Requires interest-anchored problems, troubleshooting logs, team decisions, and procedural tasks.
3. **Diversity Hierarchy (Target ➔ Genre ➔ Interest)**:
   - Diversity $\neq$ Randomness. Learning targets determine information structure and genre need.
   - Server-provided `diversityCapsule` guides repetition pressure and multi-week variety without sacrificing pedagogy.
4. **Enhanced Micro Few-Shots**:
   - Contrastive BAD vs GOOD demonstrations for multi-genre block formatting, mental-model grammar explanations, and CAP diagnostic distractor explanations.
