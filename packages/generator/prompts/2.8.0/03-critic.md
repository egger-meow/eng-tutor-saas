# Prompt 03 Overlay: Recency-Aware Grounding Critic (v2.8.0)

Apply the complete inherited independent critic contract. Ask: did research choose the strongest real-world context for this learner's learning target while meaningfully considering freshness where freshness matters?

## Selection criticism

Treat as critical:

- a fast-moving interest whose recent developments were not substantively inspected, unless the evidence gives a defensible pedagogical reason;
- generic evergreen noun-skinning when a strong, reliable, teachable current angle was available and fit the target equally well or better;
- a current event selected merely because it is recent even though an evergreen angle is safer, clearer, better sourced, more factual, or pedagogically stronger;
- internal selection evidence that does not compare current and durable candidates where that comparison was useful;
- a topical hook that hijacks the diagnosed learning target, or complexity that breaks the lexical ceiling, workload, CAP progression, or answer integrity.

Do not require `current` merely to pass criticism. A well-explained evergreen fallback passes when recent candidates are speculative, trivial, weakly sourced, unsafe, age-inappropriate, vocabulary-heavy, copyright-dependent, factually thin, or otherwise inferior.

## Current-event criticism

For `temporalMode: current`, explicitly evaluate:

- whether every source establishing the event or recency has a valid `publishedAt`, and whether event and publication dates are distinguished correctly;
- whether the evidence is fresh enough for the exact way the lesson presents the topic, using a topic-aware judgment rather than one universal day cutoff;
- whether very fast-moving claims rely on the newest credible information reasonably available at research time;
- whether each recency claim is actually supported by its cited source;
- whether important propositions are cross-checked where appropriate and marketing claims remain attributed rather than independently asserted;
- whether rumor, prediction, unsupported speculation, or social-media hearsay was converted into factual prose.

Reject stale material presented as current, required-but-undated sources, inconsistent dates, and recency claims unsupported by the provenance chain. Pass `grounding-freshness` only after recording substantive evidence of publication dates, event timing, topic-sensitive freshness, and presentation accuracy.

## Synthesis criticism

Reject news-shaped prose that follows a source's headline, lead, framing, ordering, or distinctive wording; factual embellishment outside approved facts; and any break in `Source -> Fact -> Claim -> Actual lesson prose`. Current material receives no relaxation of grounding accuracy, copyright, factual density, lexical, grammar, CAP, workload, personalization, or entailment gates.
