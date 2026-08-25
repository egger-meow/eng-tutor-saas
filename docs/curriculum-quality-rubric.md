# Curriculum Quality Rubric

This is the review contract for every weekly package. It distills the teaching rules in the upstream `eng-tutor` materials into checks that remain useful when a child studies alone.

## Non-negotiable learning contract

- Every new production 2.3.0 primary reading is real-world grounded, including grammar-heavy weeks. It normally teaches 3–5 concrete researched propositions and never uses null or N/A grounding as an escape hatch.
- Grounding provenance is closed and auditable: every source supports a fact, every fact supports a claim, and every claim names exact text occurring at its canonical reading-block location. `current` grounding has publication dates, a research date, and a passed freshness review.
- Research queries are privacy-safe generalized public topics. Authored prose is an original educational synthesis; reject source-shaped copying, protected dialogue/scripts/subtitles/manga text, excessive plot retelling, and unsupported factual embellishment.

- The student packet teaches before it tests: Chinese explanation, worked examples, guided attempt, independent attempt (including a required Core Evidence/Organizer task), CAP-style transfer (with text-evidence critical thinking), sentence production (2 items), delayed retrieval (2 items), and spaced homework.
- A coherent reading uses the learner's actual level and detailed interests as a meaningful problem situation (~300–380 words and 10–12 core vocabulary items for normal-budget baseline, smoothly scaled with available study time). Interest never replaces the learning need, and the same hook is not copied week after week.
- Plain text reading contract: Reading blocks contain clean text without inline HTML markup; the server PDF renderer owns deterministic target vocabulary and canonical grammar pattern highlighting.
- The hardest useful vocabulary in the passage, options, examples, and homework is either a declared core word, a known word, or a necessary proper noun. Core vocabulary is selected for learning value, not quota.
- Reading practice covers detail, main idea, inference, and context clues over time. Difficulty comes from evidence and reasoning, not trivia or hidden words.
- Global Answer Integrity: Every correct answer and parent rationale must be directly text-supported or explicitly framed as inference. Correct options must never combine separately mentioned true facts from different places into an unsupported composite claim.
- Profile `weekly_minutes` is `targetMinutes`; `estimatedMinutes` remains deterministic, represented-work truth. Never copy them. Require the rounded inclusive 85%-115% band, otherwise emit `BUDGET_UNDERFILLED`/`BUDGET_OVERFILLED`, repair useful content surgically, recompute, and re-audit. Exceptions require specific passed `workload-budget-exception` evidence and are never valid outside the deterministic 75%-125% hard bound.
- Every student question has a stable ID, target, writing space, and a parent-readable answer with a concise reason, genuine accepted variants, and a useful misconception when needed. The answer projection does not assign routine teaching or follow-up work to the parent.

## The weekly improvement loop

Research occurs after the single authoritative batch claim and before lesson planning/authoring: explore several public angles, select one per job, drill down, and verify important propositions. The existing observe, plan, teach, critic, repair, and learning-memory loop remains intact. Critic review includes factual support, freshness, genericity, copyright transformation, and exact prose-bound provenance; repair updates dependent prose and grounding together.

1. **Observe:** collect school progress, vocabulary status, recurring grammar errors, completion/difficulty, parent feedback, and the previous packet's quality findings.
2. **Plan:** choose 3–5 measurable targets, protect prerequisites, select due review (including cumulative previous-week review), and record what changed from last week and why.
3. **Teach:** author one breathable, lively packet with explicit Chinese scaffolding and a realistic time budget.
4. **Attack:** run deterministic validation and an independent critic that simulates a tired student studying without a tutor.
5. **Repair:** fix every critical finding and update dependent answers, IDs, targets, and tracking references together.
6. **Learn:** write observations and uncertainty back to the learner memory. Never mark mastery merely because a topic appeared.

## Feedback and process improvement

Feedback about the child changes the next lesson's targets and difficulty. Feedback about the packet changes explanation, layout, task order, or rubric decisions. A quality dimension observed at least twice must be explicitly applied or explicitly rejected with a context-specific reason in the next plan. Repeated cross-child signals become reviewed rubric candidates; one anecdote must not silently mutate production prompts. Keep weekly history as compact structured summaries and stable question/target IDs so quality improves without linear token growth.

The Parent Answer PDF is intentionally narrow: answers, short reasons, legitimate alternatives, and only high-value misconception notes. Personalization rationale, internal tracking hypotheses, critic evidence, and routine follow-up prompts remain in structured production data rather than becoming parent homework.

## Release bar

Grounding release failures include generic noun-skinning, unsupported or stale claims, copied/source-shaped prose, missing mandatory grounding, and any claim not bound to exact canonical reading text.

Reject a package if a child needs a tutor to understand a new task, if an answer is missing, ambiguous, or lacks textual entailment, if Chinese support is insufficient, if a target has no observable evidence, if delayed retrieval is absent, or if a critical critic finding is unresolved. “Different” is not evidence of improvement; compare the new packet against the previous packet's known weaknesses.
