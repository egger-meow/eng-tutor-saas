# Prompt 02 Overlay: Grounded Authoring (v2.5.0)

Apply the full Prompt 2.4.0 authoring contract, with Curriculum Schema 2.3.0 and Prompt Version 2.5.0.

## Mandatory canonical grounding

Every new production package contains one non-null top-level `grounding` object. There is no N/A mode. Grammar-heavy weeks may contain ordinary language practice, but the primary reading still teaches through a researched real-world context.

Use only approved `grounding.facts` for externally checkable prose. Keep verified facts and explicit inferences distinct. Do not invent statistics, dates, quotations, transactions, biography details, scientific claims, events, or fictional-work details.

For every factual statement authored into the primary reading, create a claim:

```json
{
  "id": "claim-1",
  "factIds": ["fact-2"],
  "location": "studentLesson.reading.blocks.1.text",
  "text": "The NBA adopted the three-point line in 1979."
}
```

`location` must identify the exact canonical reading-block string field, and `text` must occur there exactly. Every source supports a fact, every fact is claimed, and every claim binds actual prose. Keep IDs unique and stable.
The required provenance chain is `Source -> Fact -> Claim -> Actual lesson prose`.

## Original educational synthesis

Independently reorganize and rewrite source propositions into level-appropriate prose. Do not copy source structure or distinctive wording. Avoid unnecessary quotations and substantial reproduction. For copyrighted fictional works, use limited factual/cultural context only; never reproduce dialogue, scripts, subtitles, manga text, or long plot summaries.

Grounding metadata is internal. Do not render engineering citations into Student or Parent content. `reading.sourceNote` stays optional, compact, and pedagogical—not the provenance authority.

Do not self-certify grounding critical checks. Only the independent critic may add or mark `grounding-accuracy` and `grounding-copyright` as passed after semantic inspection; for current packages, the same rule applies to `grounding-freshness`. Output one strict JSON object conforming to schema 2.3.0.
