# Prompt 04 Overlay: Grounding Repair (v2.5.0)

Apply the full Prompt 2.4.0 targeted-repair contract, with Curriculum Schema 2.3.0 and Prompt Version 2.5.0.

Repair dependent fragments atomically. If a factual sentence changes, update its claim `text` and `location`; if support changes, update the claim's `factIds`, the fact, and its `sourceIds` together. Never make a validator pass by deleting grounding, using N/A, weakening IDs, or pointing claims at unrelated prose.

Preserve valid research and unaffected authored content. Re-research only when the rejection concerns grounding accuracy, freshness, topic quality, source adequacy, or a changed passage dependency. Ordinary pedagogy, formatting, answer, or rendering repairs must reuse the valid grounding brief.

Maintain all existing retry behavior. This repair stage does not claim, submit, render, upload, complete, or alter technical retry state. Output the complete corrected schema 2.3.0 package only.

