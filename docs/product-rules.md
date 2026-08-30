# Product and Curriculum Rules

## Learning Method

Packets teach a repeatable habit: read first, mark uncertainty, answer independently, check, classify mistakes, and request explanations. AI supports explanation and material preparation; it is not presented as the learner's answer machine.

## Weekly Packet

Every student packet should contain:

- a clear weekly goal and estimated workload;
- one level-appropriate reading with contextual clues;
- a bounded lexical-unit set chosen for genuine learning value; useful grade-appropriate phrases/collocations are allowed when they teach more than another isolated word, never as quota fillers;
- grammar practice connected to the reading rather than isolated drills;
- comprehension and transfer questions;
- space to mark unknowns, corrections, and reflection.

The parent-answer packet includes correct answers, concise reasoning, likely misconceptions, and observable follow-up prompts. It must not expose internal prompts or unrelated student history.

## Personalization

Use grade, current syllabus position, demonstrated difficulty, prior mistakes, preferences, and submitted feedback. Change difficulty gradually and make the reason traceable. Feedback affects later weeks only. Hold the full feedback window until 48 hours before the child's next rolling seven-day delivery; late feedback applies one cycle later. If feedback is missing at cutoff, continue from known progress without treating silence as successful completion.

Week 2 and later must demonstrate continuity through selected vocabulary recurrence, mistake-informed practice, adjusted scaffolding, or other evidence-backed adaptation. Avoid repeating an entire packet or overfitting to one mistake. Explicit relevant learner/parent feedback is stronger curriculum evidence than default scheduling heuristics.

## Real-world grounding

Every newly authored production CurriculumPackage 2.4.0 includes real, non-null grounding. The primary reading teaches specific, checkable knowledge through the learner's interest; grammar-heavy practice does not exempt the reading from research. Grounding has no N/A mode.

The production research funnel preserves learning need, target, and genre/information structure before topic selection. Research planning judges whether the generalized interest is durable or fast-moving. Fast-moving interests actively inspect recent developments, compare them with durable angles when useful, then select, drill down, verify, and author. A strong reliable, age-appropriate, lexically feasible recent angle is preferred when it serves the target equally well or better; weak, speculative, trivial, unsafe, too-complex, or pedagogically inferior current candidates require a defensible evergreen fallback. Factual density is a semantic quality judgment, not a deterministic proposition-count publication gate.

Canonical provenance closes `Source -> Fact -> Claim -> Actual lesson prose`. Each claim records stable fact IDs, an allowlisted canonical reading-block location, and exact text found at that location. `temporalMode` is explicitly `evergreen` or `current`; current research requires source publication dates, `researchedAt`, correct event/publication-date distinctions, and topic-aware freshness criticism. Recency never relaxes source quality, lexical/CAP control, answer entailment, copyright, workload, or personalization review.

For any factual claim about a named product, organization, model, version, mode, feature, API, policy, mechanism, or similarly scoped entity, semantic grounding must support the complete proposition at the scope used in the lesson:

`exact entity/version/mode -> exact capability/behavior -> exact control flow/condition/limit/qualifier`

A source being broadly relevant to the same product or organization is insufficient. Author/Critic must reject compositional attribution errors that fuse separately true fragments into a false relationship, such as assigning one mode's limit to another mode's workflow. This is semantic factual review, not a deterministic keyword or product-catalog rule.

Web queries contain generalized public topic terms only. Never send child identity, school, level, feedback, mistakes, history, or profile data to search. Research extracts propositions rather than prose; authoring uses original educational synthesis and never reproduces protected dialogue, scripts, subtitles, manga text, or excessive plot summaries.

## Quality Gates

- Consult authoritative non-holdout CAP precedents before normal assessment. Treat CAP as the Taiwan-quality floor, not a structural mold; semantic criticism prefers justified variety without quotas or sacrificing fit.
- Keep facts age-appropriate and checkable, including exact named-entity/mode/capability attribution.
- Reject generic noun-skinning, unsupported claims, stale current-event grounding, source-shaped prose, and claims not bound to actual reading text.
- Ensure every answer is derivable from taught content or clearly labeled prior knowledge.
- Verify student and answer packets agree exactly.
- Keep MCQ answer positions non-predictable without forcing artificial equal distribution; deterministic answer-position heuristics are diagnostic/advisory unless they establish an objective integrity error.
- Optimize for black-and-white A4 printing with readable spacing.
- Record curriculum rule and prompt versions with every material.

## Versioning

Production prompt/rule changes are reviewed like code; existing materials retain their original version metadata. Prompt 2.11.0 establishes a consolidated active baseline: production authoring reads the current compact prompt suite directly, while historical prompt suites remain frozen for provenance and legacy interpretation.

Future permanent prompt improvements should edit or replace concise sections in the active consolidated baseline instead of resuming an indefinitely growing historical overlay stack. Temporary compatibility overlays are allowed only when truly necessary and should be folded into the next consolidated baseline rather than becoming permanent sediment.