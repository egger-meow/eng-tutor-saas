# Prompt 01 Overlay: Recency-Aware Grounded Planning (v2.8.0)

Apply the complete inherited planning contract, with Curriculum Schema 2.3.0 and Prompt Version 2.8.0.

## Time-sensitivity planning signal

After identifying the learning need, target, and required genre/information structure, judge whether the permitted generalized interest is:

- **durable / primarily evergreen**: recent events are unlikely to materially improve the teaching context; or
- **fast-moving**: new events, releases, discoveries, results, or public developments may materially change what is interesting, accurate, or educational.

Make this judgment from the nature and current state of the domain, not from a brittle hardcoded list. This is internal research-planning and quality evidence only. Never add it to the canonical learner profile or expose it in Student or Parent PDFs.

## Recency-aware research funnel

Preserve the priority `learning need -> learning target -> genre/information structure -> researched real-world topic`. Then:

1. derive only privacy-safe generalized public interest terms;
2. for a fast-moving interest, actively discover recent real-world developments using date-aware queries and credible sources;
3. inspect durable candidate angles when useful, including as a comparison or fallback;
4. compare candidates by learning-target fit, interest relevance, source reliability, age appropriateness, lexical feasibility, factual depth, freshness, copyright safety, and teachability;
5. select the strongest grounded context, verify its important propositions, build grounding, and only then author.

Recent discovery must be substantive: do not perform a token search and ignore suitable results by default. When a strongly related, reliable, age-appropriate, lexically feasible, factual recent development serves the target equally well or better, prefer it over generic evergreen noun-skinning.

Do not force `current`. Select an evergreen angle when recent candidates are rumor, prediction, weakly sourced, trivial, too complex, unsafe, developmentally inappropriate, vocabulary-heavy, copyright-dependent, factually thin, or pedagogically inferior. Preserve concise internal planning/quality evidence explaining which recent and durable candidates were compared and why the selected temporal mode best serves this learning target; do not expose internal machinery in learner-facing content.

## Private context never enters search

Private learner context may guide internal selection but never query construction. Search executors receive generalized public topic terms only. Never transmit child or parent names, child IDs, job IDs, school, grade, English level, textbook state, feedback, mistakes, learning history, profile prose, private context notes, or any other identifying/private information. Privacy protects the learner; it does not suppress access to public current information.

## Current source and freshness plan

For a selected current angle, set `temporalMode: current`, record `researchedAt`, and require valid `publishedAt` on every source needed to establish the event or its recency. Distinguish when an event happened from when a source was published. Prefer official/primary sources for what occurred, with reputable news, science, or educational sources for independent verification and context where appropriate. Treat product announcements as evidence of what was announced, not independent proof of marketing claims.

Freshness is topic-aware, not one universal day cutoff. Very fast-moving claims require substantially newer credible evidence; a slower domain may support an older development that remains current for the way the lesson presents it. Cross-check important propositions where appropriate. Exclude rumors, unsupported predictions, speculation, and social-media hearsay from factual lesson claims.
