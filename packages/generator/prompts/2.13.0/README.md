# Prompt Suite 2.13.0: Formats Decision & Shared Selective Precedent Authoring

Prompt Suite `2.13.0` is the active consolidated production baseline for Schema 2.5.0:

1. **Deliberate Response Format Selection**:
   - Incorporates the Format Selection Decision Rule table into Prompt 01 (Planning Engine).
   - Maps learning tasks (timelines, creation steps, comparisons, evidence deductions, cause chains, category sorting, before/after, turning points) directly to Schema 2.5.0 layout primitives (`lines`, `table`, `organizer`, `sequence`).
   - Planner explicitly records `learningFunction`, `reasoningOperation`, `responseFormat`, `formatRationale`, `recentFormatCollision`, and `scaffoldLevel`.
2. **Active Format Planning Capsule**:
   - Replaces passive history logging with an actionable `formatPlanningCapsule` (`recentFormatUse`, `recentReasoning`, `avoidMechanicalRepeat`, `availableButRecentlyUnused`).
   - Treats unrepresented formats as recommendation signals, allowing justified repetition when passage evidence warrants it.
3. **Post-Plan Precedent Binding**:
   - Precedents are retrieved *after* per-item assessment plans are determined.
   - Enforces 1–5 precedents per item, cross-item deduplication, and explicit `noPrecedentReason`.
4. **Adversarial Semantic Review**:
   - Prompt 03 (Critic) validates whether response formats genuinely fit the learner's thinking task and checks `formatRationale` when format collisions occur.
