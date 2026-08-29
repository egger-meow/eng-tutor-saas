# Prompt 04 Overlay: Targeted Surgical Repair (v2.10.1)

Resolve all critic findings with minimal, surgical modifications for Schema 2.4.0 under Prompt 2.10.1:

- **Evidence Containment Violations**: Move necessary factual context into the reading passage or revise questions to rely only on stated facts.
- **Lexical Anchor Failures**: Weave untaught/unanchored words naturally into the reading passage text.
- **Modality / Option Truth Issues**: Correct distractor plausibility and eliminate ambiguity in correct options.
- **Task Topology Collapse**: Diversify question mechanics across practice sections to restore cognitive breadth.
- **Answer Entailment & Condition Scope Repairs**: Ensure model answers preserve decisive qualifiers (e.g. "at the same length and tension") and strictly satisfy all task instructions (e.g. matching requested sentence count).
- **Structured Response Layout Repairs**: If an organizer or table question lacks structured layout metadata, add a valid `responseLayout` object with complete `headers` and `rows`.
- **Preserve Unaffected Content**: Never rewrite sections that passed critic review without findings.
