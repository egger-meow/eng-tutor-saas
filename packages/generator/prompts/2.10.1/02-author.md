# Prompt 02 Overlay: Authentic Discourse, Strict Evidence Bounds & Rich Transfer (v2.10.1)

Author high-integrity weekly curriculum packages for Schema 2.4.0 under Prompt 2.10.1.

## 1. Reading Passage Integrity & Lexical Anchoring

- **Linguistic Authenticity**: Write rich, natural, age-appropriate passages that model authentic English discourse. Use paragraphs with meaningful logical connectors and varied sentence architecture.
- **Lexical Anchoring**: Integrate every new and extension vocabulary word directly into the primary reading passage in a supportive, decipherable context.
- **Evidence Containment**: Ensure all factual assertions in reading comprehension questions are exclusively answerable from the reading text itself. Never leak facts from the instruction section or external real-world knowledge into reading questions.
- **Condition & Qualifier Scope Preservation**: When discussing physical, scientific, or causal relationships (e.g., how string thickness, tension, or length affects guitar pitch), strictly preserve decisive qualifiers and control conditions across Reading → Instruction → Question → Model Answer. For example, if pitch depends on string thickness *when length and tension are kept equal*, never drop "at the same length and tension" in explanations or model answers.

## 2. Instruction Depth & Non-Trivial Examples

- **Syntax & Grammar Explanations**: Provide clear Traditional Chinese explanations that clarify the grammatical function, communicative purpose, and common pitfall patterns of the target structure.
- **Worked Examples**: Provide rich, contextualized worked examples that demonstrate varied communicative registers rather than minor lexical variations of a single sentence skeleton.
- **Common Mistakes**: Provide authentic student errors with clear diagnostic explanations in Traditional Chinese (`whyZh`).

## 3. High-Fidelity Assessment Items & Open Transfer

- **Task Topology Alignment**: Maintain cognitive variety across the practice sections (direct retrieval, condition-result mapping, inferential explanation, context-clue deduction, and open transfer).
- **Epistemic Modality & True/False Distinction**: For detail and inference items, verify that the correct option is strictly entailed by the reading passage. Distinguish between statements that are definitely true, definitely false, and merely plausible/unsupported.
- **Task Instruction & Constraint Compliance**: Model answers (`answer` and `acceptedAnswers`) must strictly obey all explicit constraints stated in the question prompt. If a question requests "in two complete sentences", the model answer must contain exactly two sentences; if it asks for two reasons, provide two reasons.
- **Structured Response Layouts**: When asking students to fill in tables or graphic organizers, provide the `responseLayout` object (`type: "table"` or `"organizer"`, with `headers` and `rows`) in the question schema so the student PDF renders a structured grid.
- **Deep Explanations in Parent Answer Key**: The parent answer key must contain thorough, pedagogical Traditional Chinese explanations (`explanationZh`) and actionable parent follow-up prompts (`followUpZh`).
