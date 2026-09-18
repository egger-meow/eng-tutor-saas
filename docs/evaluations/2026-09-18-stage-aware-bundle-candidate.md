# Stage-aware authoring-bundle candidate

Date: 2026-09-18

Status: offline candidate only. Runtime remains unchanged and Prompt 2.14.1 remains immutable.

## Result

The candidate removes whole stage instructions only after their stage has completed:

- normal Author: omit Planner and Repair sections;
- repair Author: omit Planner, retain Repair;
- both modes: retain Product Rules, Curriculum Quality Rubric, CAP contract and selected cards, quality profiles, the complete Schema 2.6.0 source, interest exploration policy, Author, and Critic.

No kept section is rewritten or summarized. The selector requires each exact stage heading once and in order, otherwise it fails closed. The source bundle is read-only and its SHA-256 remains `d72ca08a83b41c34f64d703541f34d6120d629bc2b0d4919037a749808591211`.

| Mode | Before chars | Candidate chars | Saved chars | Reduction |
| --- | ---: | ---: | ---: | ---: |
| Normal Author | 92,547 | 75,873 | 16,674 | 18.02% |
| Repair Author | 92,547 | 81,155 | 11,392 | 12.31% |

Full character, UTF-8 byte, hash, and omission measurements are in `2026-09-18-stage-aware-bundle-candidate.json`.

## Semantic responsibility map

| Required meaning | Retained location |
| --- | --- |
| age, level, weekly time, feedback, mistakes, progression | Product Rules, Quality Rubric, runtime claimed context, Author and Critic |
| specific interest and evidence-led angle selection | Interest exploration policy, Product Rules, runtime packet plan and public grounding |
| source dates, qualifiers, uncertainty, exact attribution | Product Rules, Quality Rubric, Author, Critic, public grounding |
| CAP language/cognitive depth, evidence scope, anchors and refs | CAP contract/cards, schema, runtime packet plan, Author and Critic |
| recent format/theme diversity with justified reuse | runtime diversity capsule and packet plan, Product Rules, Quality Rubric, Author and Critic |
| teach-before-test, self-study scaffolding and answer coverage | Quality Rubric, schema, Author and Critic |
| surgical dependency repair | Repair section, findings, latest candidate, Author and Critic in repair mode |

The omitted Planner instructions are operational planning actions. The runtime supplies the approved packet plan, learner evidence, public grounding, and selectively retrieved CAP precedents to Author. The omitted Repair instructions in normal mode have no applicable findings or previous candidate. Repair mode retains the complete Repair section.

## Verification and limit

- 43 focused tests passed across candidate selection, context fidelity, local authoring, packet planning, and selective CAP assembly.
- Worker typecheck passed.
- Tests verify exact retained text, required semantic anchors, mode-specific inclusion, source immutability, and failure on missing, duplicate, or reordered boundaries.

This evidence proves deterministic selection and context reduction. It does not prove model teaching-quality equivalence. Runtime adoption still requires the plan's paired-model comparison over age/level, time and feedback, specific interests, current/evergreen grounding, CAP depth, variation, self-study quality, answer integrity, and cross-field repair. Until that comparison passes, the candidate stays disconnected from `buildAuthoringPresentation`.

