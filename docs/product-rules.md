# Product and Curriculum Rules

## Learning Method

Packets teach a repeatable habit: read first, mark uncertainty, answer independently, check, classify mistakes, and request explanations. AI supports explanation and material preparation; it is not presented as the learner's answer machine.

## Weekly Packet

Every student packet should contain:

- a clear weekly goal and estimated workload;
- one level-appropriate reading with contextual clues;
- a bounded lexical-unit set; 0–3 may be useful grade-appropriate phrases/collocations, never quota fillers, under normal novelty/review rules;
- grammar practice connected to the reading rather than isolated drills;
- comprehension and transfer questions;
- space to mark unknowns, corrections, and reflection.

The parent-answer packet includes correct answers, concise reasoning, likely misconceptions, and observable follow-up prompts. It must not expose internal prompts or unrelated student history.

## Personalization

Use grade, current syllabus position, demonstrated difficulty, prior mistakes, preferences, and submitted feedback. Change difficulty gradually and make the reason traceable. Feedback affects later weeks only. Hold the full feedback window until 48 hours before the child's next rolling seven-day delivery; late feedback applies one cycle later. If feedback is missing at cutoff, continue from known progress without treating silence as successful completion.

Week 2 and later must demonstrate continuity through selected vocabulary recurrence, mistake-informed practice, or adjusted scaffolding. Avoid repeating an entire packet or overfitting to one mistake.

## Real-world grounding

Every newly authored production CurriculumPackage 2.3.0 includes real, non-null grounding. The primary reading teaches specific, checkable knowledge through the learner's interest; grammar-heavy practice does not exempt the reading from research. Grounding has no N/A mode.

The production research funnel is explore, select, drill down, verify, then author. Planning priority remains learning need, target, genre/information structure, then researched topic. Normal factual readings carry 3–5 concrete propositions unless quality evidence records a specific justified exception.

Canonical provenance closes `Source -> Fact -> Claim -> Actual lesson prose`. Each claim records stable fact IDs, an allowlisted canonical reading-block location, and exact text found at that location. `temporalMode` is explicitly `evergreen` or `current`; current research requires source publication dates, `researchedAt`, and freshness criticism.

Web queries contain generalized public topic terms only. Never send child identity, school, level, feedback, mistakes, history, or profile data to search. Research extracts propositions rather than prose; authoring uses original educational synthesis and never reproduces protected dialogue, scripts, subtitles, manga text, or excessive plot summaries.

## Quality Gates

- Align language and question style with Taiwan junior-high/CAP expectations.
- Keep facts age-appropriate and checkable.
- Reject generic noun-skinning, unsupported claims, stale current-event grounding, source-shaped prose, and claims not bound to actual reading text.
- Ensure every answer is derivable from taught content or clearly labeled prior knowledge.
- Verify student and answer packets agree exactly.
- Optimize for black-and-white A4 printing with readable spacing.
- Record curriculum rule and prompt versions with every material.

## Versioning

Production prompt/rule changes are reviewed like code. Use semantic identifiers such as `curriculum-rules/1.0.0`; existing materials retain their original version metadata.
