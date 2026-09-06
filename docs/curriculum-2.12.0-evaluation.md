# Curriculum 2.12.0 evaluation

Date: 2026-09-06. Release: Engine 1.7.0 / Prompt 2.12.0 / Schema 2.4.0.

## Research-stage smoke evaluation

One actual `gpt-5.6-sol` call, low reasoning, live web research, using the new shared interest-exploration policy. Input contained five public synthetic interests and requested candidate comparison, a selected question, sources, supported propositions, uncertainty and a suitable response format. It did not prescribe the desired angle for any case. No learner data or production jobs were used. Raw output and the exact input are retained locally under `.runtime/interest-exploration-smoke*`.

| Interest | Selected angle | Observation |
| --- | --- | --- |
| keshi | How his guitar writing and recording shape his lo-fi sound | Compared an early-career nursing-to-music story and a later album before selecting creative process. |
| Your Name | How musubi connects tradition, people and time | Proposed a connection-map activity and distinguished interpretation from observable details. |
| BTS | International Sign choices in Permission to Dance choreography | Compared performer, design and audience perspectives. |
| Miles Morales | How animation timing communicates inexperience in Into the Spider-Verse | Proposed a text timeline comparing animation timing. |
| Aircraft cabin windows | Rounded corners, pressure cycles and structural stress | Preserved a causal science explanation and rejected a simplistic single-cause accident story. |

Sources included creator interviews and production sources, [BFI's Shinkai interview](https://www.bfi.org.uk/sight-and-sound/interviews/trading-places-makoto-shinkai-your-name), [Weverse's choreography account](https://magazine.weverse.io/article/view/238?lang=en), and [the FAA Comet case study](https://www.faa.gov/lessons_learned/transport_airplane/accidents/G-ALYV). BFI and Weverse were separately spot-checked after inference. The keshi Guitar.com source could not be independently fetched during that spot-check (403).

This is qualitative evidence that specific creative and cultural angles can emerge. It is not an old/new controlled experiment, a multi-week diversity rate, a complete canonical-package evaluation, or proof every cited proposition is publication-ready. Proposed maps/diagrams still need translation into supported canonical layouts and Author/Critic review. Do not infer that biographies or tables must appear on a schedule.

## Context size

Normalized LF bundle comparison against the previous committed 2.11.1 bundle:

| Metric | Previous | New | Reduction |
| --- | ---: | ---: | ---: |
| Characters | 145,598 | 92,990 | 36.1% |
| `o200k_base` tokens | 34,487 | 24,233 | 29.7% |

Tokenizer counts are reproducible measurements for that encoding, not claims about exact billing on every model. The dictionary uses explicit keys so readers do not have to count a long array. Tests reconstruct every routing field, card and shard reference exactly. Fixed schema, quality contracts and same-SHA shard access remain available.

Retry presentation preserves the sole prior candidate, distinct findings, repair instructions and immutable input fingerprint. A superseded prior candidate is omitted only when a newer local candidate is included; duplicate nested findings are removed. No percentage is claimed for typical repair savings, and the first authoritative retry still includes its complete previous package.

## Verification

- 141 test files / 1,154 tests passed, including existing guitar organizer rendering and grounding/answer integrity regressions.
- Full workspace typecheck and build passed.
- Synthetic Student and Parent PDFs generated successfully.
- New privacy regressions preserve public titles/numbers and short artist names while rejecting private learner names, proficiency labels, URLs and feedback.
- Local DB smoke tests were unavailable because Docker did not become responsive. Production migration preflight confirmed exactly one release literal in each of the three affected functions. After deployment, all three full definition hashes matched the predicted release-only replacement, and security-definer settings, search paths and ACLs were unchanged.

The migration changes only new-claim release defaults and the missing-target fallback. Existing snapshots retain their target release. Historical remote/local migration timestamp drift predates this change. The new migration was applied once through the Supabase migration API without replaying historical files, and its local filename now matches remote history version `20260906044828`.
