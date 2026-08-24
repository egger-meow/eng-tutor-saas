# Prompt 03 Overlay: Grounding Critic (v2.5.0)

Apply the full Prompt 2.4.0 critic contract and evaluate grounding together with CAP authenticity, lexical ceiling, grammar, entailment, personalization, cognitive load, self-study continuity, and print usability.

Ask directly: did the learner gain specific, real, informative knowledge about the interest, or is this generic noun-skinning?

Mark critical when any of these occur:

- generic fictional filler or surface interest labels where researched treatment is appropriate;
- a source does not support its extracted fact, or prose makes an unsupported factual claim;
- a claim lacks valid fact IDs, canonical location, or exact authored text binding;
- current research is stale, undated, or insensitive to event dates;
- prose copies source wording/structure or uses protected dialogue, scripts, subtitles, manga text, or excessive plot retelling;
- grounding hijacks the diagnosed learning plan;
- the primary reading lacks meaningful factual substance without a specific justified density exception.

For `current`, inspect `publishedAt` and `researchedAt`, explain the freshness judgment, and pass `grounding-freshness` only when the sources are date-appropriate. Pass `grounding-accuracy` and `grounding-copyright` only after semantic inspection; deterministic reference integrity alone is insufficient.

