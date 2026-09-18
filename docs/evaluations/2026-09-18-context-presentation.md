# Pipeline context presentation compaction

Implemented the first delivery from the context-compaction plan after pulling main to `f2ce9e3`. All component versions and committed bundle/prompt/schema bytes remain unchanged, as requested. The implementation revision is the Git commit containing this report; the sizing JSON also records the codec source hash and bundle hash.

## Change and fidelity boundary

`packages/worker/src/model-context.ts` replaces only identical JSON objects/arrays with an earlier in-document JSON Pointer. It preserves key names, array order, values, qualifiers and unknown fields; strings and small values stay inline. It does not equate similar statements, normalize dates, infer age, rank evidence, or rewrite rules. Object key-order differences conservatively remain distinct.

Every encoded document is decoded and compared with the original JSON serialization before use. A collision with the reserved `$contextRef` key, failed reconstruction, or no net character/byte saving including the decoding instruction falls back to the original JSON. The input object is never modified. This proves serialized data preservation, not that a model always reasons equally well over references.

The codec runs after existing context selection/compaction. Existing removal of duplicate retry findings and superseded candidates is not counted as new savings. Existing planner field selection is unchanged; this does not claim that it forwards every field of the original claim.

## Information responsibilities

| Information | Preserved location / consumer | Verification |
| --- | --- | --- |
| Grade, supplied age/unknown age, language level, time, exact interests | Existing private context fields, with full values at reference targets in the same input | Deep round-trip equality, different time/feedback cases |
| Feedback dates, confidence, school and learning evidence | Existing planner selection and entire author context | Different values never replaced by one another; nested unknown fields retained |
| CAP skill, language vs cognitive depth, per-item refs, exemptions | Packet plan and adapted retrieval results; CAP cards remain in bundle | Full source values survive reconstruction; existing selective-CAP tests |
| Research, date/qualifier distinctions, current/evergreen decisions | Complete public grounding text, passed verbatim to planner/author/repair | Prompt integration checks and unchanged research boundary tests |
| Recent formats, reasonable reuse, self-study and answer integrity | Existing memory and complete production rules/schema | No rule/schema/card rewriting; existing adapter and contract checks |
| Repair candidate, findings and dependencies | Full latest candidate once, full current issue, existing retry evidence | Normal/repair prompt checks; original input unchanged |
| Provenance | Original claim/bundle remain untouched; presentation hashes and reference paths are separate diagnostics | Current/historical bundle acceptance and mismatched-hash rejection tests |

No new model call or external retrieval was added. Public research does not receive the private deduplicated document. The local runner and manual `prompt-v2` adapter use the codec; packet planning uses it after building its existing private view. This is not proof that independently hosted online authoring uses these builders. No hosted executor or production contract was queried or deployed.

## Rule consolidation decision

Keep the entire Plan/Author/Critic/Repair suite, schema, selected CAP cards and grounding. Their overlapping topics do not establish identical responsibilities: planning decisions, author actions, critic checks and dependent repairs remain necessary. In particular, there is no independent Critic call in this runner that would justify dropping its instructions here. Do not resolve the existing workload or Week 1 SPEC discrepancies as a side effect of compression.

The runtime change therefore concentrates repeated structured evidence, not paraphrased pedagogical rules. Broader prose/schema compression and paired model teaching-quality evaluation remain deferred; no activated prompt artifact is overwritten or version bumped.

## Reproducible sizing

Run from repository root:

```powershell
node --import tsx packages/worker/scripts/measure-context-presentation.ts docs/evaluations/2026-09-18-context-presentation-sizing.json
```

The report uses synthetic fixtures and the actual prompt builders. It compares new presentation versus reconstructed full JSON after pre-existing compaction. It records characters (UTF-16 code units), UTF-8 bytes and SHA-256; it does not estimate billed tokens. Every stage is separate, since repair calls are optional. Bundle, learner, grounding, candidate and findings measurements are included for author calls; bundle internals are not split with ambiguous heading regexes.

| Synthetic case | Planner | Planner repair | Author | Author repair |
| --- | ---: | ---: | ---: | ---: |
| No duplicates | 0% | 0% | 0% | 0% |
| Repeated evidence | 12.03% | 11.47% | 0.87% | 0.87% |
| Different feedback | 0% | 0% | 0% | 0% |

Repeated evidence saves 807 characters per measured call, including the decoding instruction. These are fixture results, not expected production savings. The full author bundle dominates input size.

The local runner writes temporary private `context-presentation-N.json` diagnostics with source revision, original claim-bundle hash, selected/presented bundle hashes, prompt hash, component sizes and a reference source map. Existing job cleanup removes those private diagnostics. The returned batch summary retains source revision plus per-round bundle/prompt hashes, learner sizes and reference counts without evidence text or reference paths. It does not add permanent private-data retention.

## Verification

- Worker tests plus selective bundle tests: 21 files, 242 tests passed, including 32 varied synthetic round-trip histories, escaped keys, Unicode, null/false/zero, reserved-key collisions, dangling references, distinct qualifiers and current/historical adapter contracts.
- Worker and generator TypeScript checks passed.
- Synthetic sizing script completed; no real learner or purported researched facts used.
- No database, schema, renderer or publication-path changes. No learner jobs claimed, external notifications sent or production materials generated for verification.
- Data fidelity is checked at runtime. Live provider token savings and paired model quality equivalence have not been measured.

On this Windows environment, pnpm's executable shim did not resolve Vitest. Verification used `node node_modules/vitest/vitest.mjs ...` and `node node_modules/typescript/bin/tsc -p ... --noEmit`; Vitest/tsx required permission to start local subprocesses outside the sandbox.
