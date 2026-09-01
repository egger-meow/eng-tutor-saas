---
bundleVersion: "2.11.1-prod"
schemaVersion: "2.4.0"
promptVersion: "2.11.1"
engineVersion: "1.6.0"
generatedAt: "2026-08-18T15:45:00.000Z"
sourceHashes:
  "packages/generator/prompts/2.11.1/01-plan.md": "be175144a60ab64446cce47934ca828ba42d08d2cd8682a3c9c0d05607567c36"
  "packages/generator/prompts/2.11.1/02-author.md": "6b7209c261778ed9616295fb4ed2d1301fb1e5f0adce8408580d1cc9407e306a"
  "packages/generator/prompts/2.11.1/03-critic.md": "b7ada7e2b14205a3d98d889de4c8110c2e31090e43acff2ff9cc937f9077380d"
  "packages/generator/prompts/2.11.1/04-repair.md": "059fd0cd6d9fc9532162f55ffc3cb3c05f668f30a763f60cec6b3f8252172ff5"
  "packages/generator/src/curriculum-package-schema.ts": "3b86d1d2966c8f914ab2700ee6fbe9927c78fca848383bde7fb2123a2fe654cf"
  "packages/generator/quality-profiles/default.md": "f09d1e3e68a0297848f960ddd2b2620e7a996ec799766d52ca9b6013fcfb2a03"
  "packages/generator/quality-profiles/gemini-3.7-flash.md": "9db1cc2a142e40efcbb75dfcb76436cd61edeb13b065d6517af5dc97bd2fc37b"
  "docs/curriculum-quality-rubric.md": "ca6f086c0114a86e9a1e89094e0fe1b6a274bd9fe40fd987b062246b5496f96a"
  "docs/product-rules.md": "92eb68c2e58f8bb7e84f07b4ab703ad94377f4089af3bea847764e5e7e281b9f"
  "packages/generator/curriculum/cap-precedent-contract.md": "036ad256be8d16ab98776a1d5e30770154265247535c6b1b3e5315da6bf27e6b"
  "packages/generator/src/cap-assessment-plan-contract.ts": "5ed552ce3254b6b3eefe4c0b66861ba125b0ef76d372d7e4f10073676c30bcec"
  "packages/generator/curriculum/cap-precedent-cards.json": "23d051d7811591d5604fcd82309c639a078c3dc61c2b4e79646bf443df85452e"
  "packages/generator/curriculum/cap-precedent-routing-index.json": "eca426ee315000a72d977d297384e29855c087f7950f9537f6af5e4dbd5a3773"
---

# 紙屬英文 Production Authoring Bundle

> This is the deterministically compiled production authoring contract for 紙屬英文.
> Do not edit manually. Recompile using `pnpm compile:bundle`.

## 1. Product Rules & Constraints
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
- Across every student-facing assessment stage, including retrieval and homework, prohibit bare Chinese↔English lookup and isolated dictionary-definition questions. Intentional recall remains valid only with meaningful semantic or sentence context that tests lexical form, meaning, collocation, discrimination, or usage; `intentionalRecall: true` is never an exemption for context-free lookup.
- Keep facts age-appropriate and checkable, including exact named-entity/mode/capability attribution.
- Reject generic noun-skinning, unsupported claims, stale current-event grounding, source-shaped prose, and claims not bound to actual reading text.
- Ensure every answer is derivable from taught content or clearly labeled prior knowledge.
- Verify student and answer packets agree exactly.
- Keep MCQ answer positions non-predictable without forcing artificial equal distribution; deterministic answer-position heuristics are diagnostic/advisory unless they establish an objective integrity error.
- Optimize for black-and-white A4 printing with readable spacing.
- Record curriculum rule and prompt versions with every material.

## Versioning

Production prompt/rule changes are reviewed like code; existing materials retain their original version metadata. Prompt 2.11.1 establishes a consolidated active baseline: production authoring reads the current compact prompt suite directly, while historical prompt suites remain frozen for provenance and legacy interpretation.

Future permanent prompt improvements should edit or replace concise sections in the active consolidated baseline instead of resuming an indefinitely growing historical overlay stack. Temporary compatibility overlays are allowed only when truly necessary and should be folded into the next consolidated baseline rather than becoming permanent sediment.

## 2. Curriculum Quality Rubric
# Curriculum Quality Rubric

This is the semantic review contract for every newly authored weekly package. It should remain compact enough to guide judgment rather than become a historical checklist. Deterministic validators own objective integrity; Author/Critic own language, pedagogy, factual relationships, and learner fit.

## Non-negotiable learning contract

- Every new production Schema 2.4.0 primary reading is real-world grounded, including grammar-heavy weeks. Grounding is never null or N/A.
- Grounding provenance is closed and auditable: `Source -> Fact -> Claim -> Actual lesson prose`. Every claim binds supported fact IDs to exact canonical reading text.
- For a named product, organization, model, version, mode, feature, API, policy, mechanism, or similarly scoped entity, `grounding-accuracy` verifies the complete proposition at the same scope: `exact entity/version/mode -> exact capability/behavior -> exact control flow/condition/limit/qualifier`. Broad topical relevance is insufficient. Reject mode swaps, feature fusion, dropped qualifiers, unsupported composites, and marketing overstatement.
- `current` grounding has appropriate publication metadata, distinguishes event timing from publication timing, and passes topic-aware freshness review. Do not force current when an evergreen angle is more reliable or teachable.
- Research queries use privacy-safe generalized public topics only. Authored prose is original educational synthesis; reject source-shaped copying, protected dialogue/scripts/subtitles/manga text, excessive plot retelling, and unsupported embellishment.
- The packet teaches before it tests. Chinese scaffolding, worked examples, guided work, independent evidence, CAP-style transfer, production/retrieval, and homework are used when they serve the learning plan. Do not satisfy pedagogy by mechanically counting task types.
- Reading uses the learner's actual level and interests as a meaningful context. Interest never replaces the learning need, and repeated themes require a reason.
- Reading blocks are clean text; the PDF renderer owns deterministic visual emphasis.
- Reading comprehension and reading-based CAP plans use `evidenceScope: "primary_reading"` with exact primary-reading evidence anchors. Reject hidden reliance on later instruction or external facts.
- Core vocabulary represents genuine learning burden. New/extension items are authentically anchored in the primary reading. Previously exposed vocabulary may recur or be reviewed but is never relabeled new. Hidden lexical difficulty is judged semantically for this learner, not by finite allowlists, morphology rules, fixed counts, or character heuristics.
- Primary grammar normally advances. Previously exposed grammar may recur in retrieval/application and becomes primary again only when feedback, actual failure evidence, or prerequisite repair supports it.
- Normal assessment consults authoritative non-holdout CAP precedents in `anchor`, `blend`, or `calibration` mode. CAP is the quality floor, not a structural mold. Language difficulty and cognitive depth are independent.
- Retrieval is valuable when it uses meaningful semantic or sentence context. Reject bare Chinese→English lookup, bare English→Chinese lookup, isolated “what does X mean?” prompts, duplicated flashcard-style retrieval, and retrieval without contextual usage, collocation, discrimination, or production value across every student-facing stage, including homework. `intentionalRecall: true` permits D1 retrieval but never bypasses this rule.
- Every correct answer and parent rationale is text-supported or explicitly framed as inference. Preserve epistemic modality, decisive qualifiers, control conditions, requested counts, and executable procedure steps. Never combine separately true facts into an unsupported composite answer.
- Critic performs substantive review across `evidence-boundary`, `answer-entailment`, `lexical-integrity`, `task-topology`, and `level-calibration`, plus grounding accuracy/copyright/freshness where relevant. These are semantic review responsibilities, not label-bookkeeping gates in Finisher.
- MCQ answers should be non-predictable and distractors diagnostically meaningful. Do not distort sound questions to chase artificial answer-position percentages.
- `weekly_minutes` is the learner's target capacity; `estimatedMinutes` is represented-work truth and must not simply copy the target. Add useful work or remove redundancy when workload is off; never pad with filler or falsify duration metadata.
- Every student question has a stable ID, target, usable response space/layout, and a parent-readable answer. A task asking for a table/organizer provides the corresponding Schema 2.4.0 `responseLayout`.

## Weekly improvement loop

1. **Observe:** use school progress, learning memory, completion/difficulty, explicit parent/student feedback, and previous quality evidence.
2. **Plan:** choose evidence-backed targets, protect prerequisites, advance by default, and use review when feedback or real learning evidence justifies it.
3. **Research:** preserve `learning need -> target -> genre/information structure -> topic`; for fast-moving interests inspect recent developments and compare durable angles when useful.
4. **Teach:** author a breathable, self-study packet with natural English, useful Chinese scaffolding, and truthful workload.
5. **Attack:** run objective deterministic validation plus independent adversarial semantic criticism.
6. **Repair:** change only failed content and its true dependencies; update prose, grounding, questions, answers, layouts, and tracking together when dependency closure requires it.
7. **Learn:** preserve observations/uncertainty in learning memory. Exposure alone never becomes mastery or weakness.

## Feedback and process improvement

Relevant explicit learner/parent feedback is first-class curriculum evidence and may override default progression or review scheduling heuristics. A quality failure discovered in one packet should first become a **general principle only if the principle truly generalizes**. Do not add product-specific prompt exceptions or deterministic pseudo-semantic rules merely because one example failed.

Prompt 2.11.1 is a consolidated active baseline. Historical prompt suites remain frozen for provenance, but production model context must not grow indefinitely by concatenating obsolete overlays. Future permanent improvements should edit/replace concise active sections or create a new consolidated baseline.

## Release bar

Semantic release blockers include unsupported or misattributed central facts, stale-as-current claims, copied/source-shaped prose, unresolved evidence-boundary or answer-entailment failures, learner-level mismatch severe enough to block self-study, and unresolved critical Critic findings.

Deterministic Finisher hard failures remain limited to machine-provable integrity such as schema/structure, required references, CAP authority/provenance, exact binding/reference integrity, answer/key structural consistency, release/version integrity, rendering/storage integrity, privacy/safety, and other objective invariants, plus exact high-confidence bare bilingual/dictionary lookup patterns. Approximate style, lexical difficulty, pedagogical scheduling, task diversity, Critic label coverage, finite-list checks, arbitrary counts, percentages, or morphology heuristics are warning/telemetry unless they prove an objective integrity error.

## 2A. CAP Precedent-First Contract
# CAP Precedent-First Assessment Contract

## Invariant

Consult authoritative non-holdout knowledge first. **CAP is the floor, not the mold.**

## Retrieval and plan

Route by skill or structural relevance. Read only selected same-SHA shards; never raw sources or holdouts. Quality outranks diversity.

Every governed `cap-plan:<questionId>` matches the machine contract below. Aliases are invalid.

Modes may change structure. Package refs equal item refs. Relevant CAP requires `precedentRefs`. Only when no relevant authoritative precedent exists may refs be empty, and then a specific `noPrecedentReason` is required. Recall is only vocabulary/grammar outside CAP transfer. A1/A2 may retain D2/D3 reasoning.

## Quality, critic, and provenance

Finisher fails closed on unavailable authority, provenance/hash mismatch, unknown/holdout refs, missing consultation, invalid recall, inconsistent refs, copying, ambiguous/unsupported answers, decorative or dictionary comprehension, depth collapse, or missing meaningful four-option distractors—not repeated refs or structural novelty.

Critic rejects mechanically repetitive work but permits pedagogically justified practice. `cap-provenance` records versions.

### Canonical CAP Assessment Plan Contract
```json
{"contractVersion":"1.1.0","additionalProperties":false,"required":["learningObjective","primarySkill","secondarySkills","genre","targetLanguageDifficulty","targetCognitiveDepth","evidenceMode","evidenceSpan","evidenceScope","evidenceAnchors","reasoningOperations","distractorStrategies","precedentRefs","precedentMode","intentionalRecall","noPrecedentReason"],"forbiddenAliases":["objective","languageDifficulty","cognitiveDepth","isRecall"],"modes":{"anchor":["borrowedDesignPrinciples"],"blend":["synthesizedDesignPrinciples"],"calibration":["benchmarkQualities","noveltyRationale"]},"serializedExamples":{"anchor":{"learningObjective":"Infer a result by combining two clues.","primarySkill":"local_inference","secondarySkills":["information_integration"],"genre":"article_informational","targetLanguageDifficulty":"A2_basic","targetCognitiveDepth":"D2_single_step_inference","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","evidenceScope":"primary_reading","evidenceAnchors":[{"location":"studentLesson.reading.blocks.0.text","anchorText":"Mia saw wet streets.","isExplicit":true}],"reasoningOperations":["connect two clues"],"distractorStrategies":["partial_truth"],"precedentRefs":["cap-0123456789ab"],"precedentMode":"anchor","intentionalRecall":false,"noPrecedentReason":null,"borrowedDesignPrinciples":["make both clues necessary"]},"blend":{"learningObjective":"Compare evidence before choosing a claim.","primarySkill":"information_integration","secondarySkills":["local_inference"],"genre":"multi_document_comparison","targetLanguageDifficulty":"A2_basic","targetCognitiveDepth":"D3_multi_step_synthesis","evidenceMode":"multi_document","evidenceSpan":"multi_paragraph_global","evidenceScope":"primary_reading","evidenceAnchors":[{"location":"studentLesson.reading.blocks.0.text","anchorText":"The first report showed high numbers.","isExplicit":true},{"location":"studentLesson.reading.blocks.1.text","anchorText":"The second report showed lower numbers.","isExplicit":true}],"reasoningOperations":["compare claims across sources"],"distractorStrategies":["unsupported_world_knowledge"],"precedentRefs":["cap-0123456789ab"],"precedentMode":"blend","intentionalRecall":false,"noPrecedentReason":null,"synthesizedDesignPrinciples":["combine comparison with causal elimination"]},"calibration":{"learningObjective":"Evaluate which explanation best fits all evidence.","primarySkill":"purpose_speaker_intent","secondarySkills":["information_integration"],"genre":"dialogue","targetLanguageDifficulty":"A2_basic","targetCognitiveDepth":"D3_multi_step_synthesis","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","evidenceScope":"primary_reading","evidenceAnchors":[{"location":"studentLesson.reading.blocks.0.text","anchorText":"Jay said the battery was hot.","isExplicit":true}],"reasoningOperations":["test each explanation against all evidence"],"distractorStrategies":["partial_truth"],"precedentRefs":["cap-0123456789ab"],"precedentMode":"calibration","intentionalRecall":false,"noPrecedentReason":null,"benchmarkQualities":["requires evidence integration"],"noveltyRationale":"Uses a new evidence arrangement while preserving the reasoning floor."}}}
```

## 2B. Compact CAP Precedent Routing Index
```json
{"version":"1.1.0","authorityStatus":"authoritative","capKnowledgeVersion":"cap-knowledge-cca0e12892d9531c","capCorpusHash":"cca0e12892d9531ccfa96f9b2e77cf81d15eb65bf5b7de7a7ed4bd36047f7595","capBundleVersion":"cap-runtime-1.1.0","plannerVersion":"cap-planner-1.1.0","qualityFloorVersion":"cap-floor-1.1.0","cards":[{"ref":"cap-ecbd8ecef915","genre":"single","primarySkill":"discourse_relationship","secondarySkills":["discourse_relationship"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/discourse_relationship--D2_single_step_inference.json"},{"ref":"cap-1e42148522f4","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-68e9969defd0","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-b4586e0cb56e","genre":"single","primarySkill":"grammar_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-d0ddea32d703","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-ea68c826339e","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-e9dc2caa6165","genre":"single","primarySkill":"grammar_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-8bfc7c481de8","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-f3cb857252be","genre":"single","primarySkill":"grammar_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-195cb350b195","genre":"single","primarySkill":"grammar_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-d85d4bc3c822","genre":"single","primarySkill":"grammar_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-541a97156cc4","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-5596bef6ba95","genre":"single","primarySkill":"grammar_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-2b0da1e62e2b","genre":"single","primarySkill":"grammar_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-233325f32f70","genre":"single","primarySkill":"grammar_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-aabf50a9c88b","genre":"single","primarySkill":"grammar_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-d52488773e82","genre":"single","primarySkill":"grammar_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-9e89511e33a9","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-8016a6c08618","genre":"infographic_chart_table","primarySkill":"information_integration","secondarySkills":["discourse_relationship"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D2_single_step_inference.json"},{"ref":"cap-5880a9ef4b4e","genre":"infographic_chart_table","primarySkill":"information_integration","secondarySkills":["discourse_relationship"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D3_multi_step_synthesis.json"},{"ref":"cap-06c826d31484","genre":"infographic_chart_table","primarySkill":"information_integration","secondarySkills":["discourse_relationship"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D3_multi_step_synthesis.json"},{"ref":"cap-784e10cfb014","genre":"infographic_chart_table","primarySkill":"purpose_speaker_intent","secondarySkills":["information_integration"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/purpose_speaker_intent--D3_multi_step_synthesis.json"},{"ref":"cap-ea8d068eb1d8","genre":"article_informational","primarySkill":"purpose_speaker_intent","secondarySkills":["discourse_relationship"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/purpose_speaker_intent--D2_single_step_inference.json"},{"ref":"cap-c3579daa444a","genre":"article_informational","primarySkill":"text_structure","secondarySkills":["discourse_relationship"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/text_structure--D2_single_step_inference.json"},{"ref":"cap-e201005ab68b","genre":"article_informational","primarySkill":"local_inference","secondarySkills":["discourse_relationship"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/local_inference--D2_single_step_inference.json"},{"ref":"cap-46bc8b1ceb50","genre":"article_informational","primarySkill":"explicit_detail","secondarySkills":[],"cognitiveDepth":"D1_verbatim_retrieval","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/explicit_detail--D1_verbatim_retrieval.json"},{"ref":"cap-4a06218a465b","genre":"article_informational","primarySkill":"text_structure","secondarySkills":["discourse_relationship"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/text_structure--D3_multi_step_synthesis.json"},{"ref":"cap-48b130d6f2be","genre":"article_informational","primarySkill":"reference_resolution","secondarySkills":["discourse_relationship"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/reference_resolution--D2_single_step_inference.json"},{"ref":"cap-2bc3c14b97d3","genre":"article_informational","primarySkill":"information_integration","secondarySkills":["discourse_relationship"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"B1_intermediate","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D3_multi_step_synthesis.json"},{"ref":"cap-a4fe639716ea","genre":"article_informational","primarySkill":"information_integration","secondarySkills":["discourse_relationship"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"B1_intermediate","evidenceMode":"spatial","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D3_multi_step_synthesis.json"},{"ref":"cap-74088b1902d9","genre":"article_informational","primarySkill":"vocabulary_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-b3a5b1f920ba","genre":"article_informational","primarySkill":"local_inference","secondarySkills":["discourse_relationship"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/local_inference--D2_single_step_inference.json"},{"ref":"cap-eb52f5c63327","genre":"article_informational","primarySkill":"explicit_detail","secondarySkills":[],"cognitiveDepth":"D1_verbatim_retrieval","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/explicit_detail--D1_verbatim_retrieval.json"},{"ref":"cap-50d266ecb04a","genre":"article_informational","primarySkill":"vocabulary_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-b10e8ce94a36","genre":"article_informational","primarySkill":"information_integration","secondarySkills":["discourse_relationship"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"B1_intermediate","evidenceMode":"spatial","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D3_multi_step_synthesis.json"},{"ref":"cap-1d58863aeaa1","genre":"cloze_passage","primarySkill":"discourse_relationship","secondarySkills":["discourse_relationship"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/discourse_relationship--D2_single_step_inference.json"},{"ref":"cap-0e58e5cbf854","genre":"cloze_passage","primarySkill":"information_integration","secondarySkills":["discourse_relationship"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D2_single_step_inference.json"},{"ref":"cap-6683f481cccd","genre":"cloze_passage","primarySkill":"vocabulary_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-d7faf2e3ce31","genre":"cloze_passage","primarySkill":"main_idea","secondarySkills":["discourse_relationship"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/main_idea--D3_multi_step_synthesis.json"},{"ref":"cap-c097e93f3126","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["local_inference"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-fcc6b69326a7","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-832d058860ec","genre":"single","primarySkill":"grammar_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-150015e5fed2","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["local_inference"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-e3c92b0d9465","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-2287c9ec8293","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["local_inference"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-dfa7c42f6ff8","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["information_integration"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-1228aa17909a","genre":"single","primarySkill":"discourse_relationship","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/discourse_relationship--D2_single_step_inference.json"},{"ref":"cap-9955595d3464","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["pragmatic_meaning"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-43b726ad4cf6","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-1b39c13422c4","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-66b87fae4a99","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-36fd0465031a","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-951e1e286ac5","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["discourse_relationship"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-b8c78f3881f5","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-46fa49f86d5a","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-6a54f35f868b","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["reference_resolution"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-45c654078bfe","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-03d05aa39df6","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-e9a3867665ee","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-abd9d6fe139d","genre":"infographic_chart_table","primarySkill":"information_integration","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D3_multi_step_synthesis.json"},{"ref":"cap-a4e4ed1a48e6","genre":"infographic_chart_table","primarySkill":"information_integration","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D3_multi_step_synthesis.json"},{"ref":"cap-92ca6df5388b","genre":"infographic_chart_table","primarySkill":"information_integration","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D3_multi_step_synthesis.json"},{"ref":"cap-74d9da4bc141","genre":"infographic_chart_table","primarySkill":"explicit_detail","secondarySkills":["pragmatic_meaning"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/explicit_detail--D2_single_step_inference.json"},{"ref":"cap-51ac44c1ff69","genre":"infographic_chart_table","primarySkill":"explicit_detail","secondarySkills":["information_integration"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/explicit_detail--D2_single_step_inference.json"},{"ref":"cap-a0a77ab1a4b8","genre":"infographic_chart_table","primarySkill":"information_integration","secondarySkills":["explicit_detail"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"B1_intermediate","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D3_multi_step_synthesis.json"},{"ref":"cap-b4ffc155b5ae","genre":"article_informational","primarySkill":"explicit_detail","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/explicit_detail--D2_single_step_inference.json"},{"ref":"cap-8a97eeb7d83e","genre":"article_informational","primarySkill":"explicit_detail","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/explicit_detail--D2_single_step_inference.json"},{"ref":"cap-5f35ce975531","genre":"article_informational","primarySkill":"cross_sentence_inference","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/cross_sentence_inference--D2_single_step_inference.json"},{"ref":"cap-249540b9930d","genre":"article_informational","primarySkill":"information_integration","secondarySkills":["main_idea"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D3_multi_step_synthesis.json"},{"ref":"cap-3b59df8ffdf9","genre":"article_informational","primarySkill":"explicit_detail","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/explicit_detail--D2_single_step_inference.json"},{"ref":"cap-93563c17b35b","genre":"article_informational","primarySkill":"explicit_detail","secondarySkills":["reference_resolution"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/explicit_detail--D2_single_step_inference.json"},{"ref":"cap-dfc42a9b8b83","genre":"article_informational","primarySkill":"main_idea","secondarySkills":["information_integration"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/main_idea--D3_multi_step_synthesis.json"},{"ref":"cap-c7149bc47dc3","genre":"article_informational","primarySkill":"sequence_cause_consequence","secondarySkills":["cross_sentence_inference"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/sequence_cause_consequence--D2_single_step_inference.json"},{"ref":"cap-8a5ca300b26c","genre":"article_informational","primarySkill":"main_idea","secondarySkills":["information_integration"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/main_idea--D3_multi_step_synthesis.json"},{"ref":"cap-58b567025b9f","genre":"article_informational","primarySkill":"vocabulary_in_context","secondarySkills":["local_inference"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-4377e4dee7e6","genre":"article_informational","primarySkill":"information_integration","secondarySkills":["explicit_detail"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D3_multi_step_synthesis.json"},{"ref":"cap-6e9e5bbb4bee","genre":"cloze_passage","primarySkill":"information_integration","secondarySkills":["main_idea"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D3_multi_step_synthesis.json"},{"ref":"cap-992a5f1fa2f0","genre":"cloze_passage","primarySkill":"cross_sentence_inference","secondarySkills":["information_integration"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/cross_sentence_inference--D3_multi_step_synthesis.json"},{"ref":"cap-bef8c7dc9212","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["other_uncertain","local_inference"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-a871357359fa","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["other_uncertain","sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-16e747a76c6d","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["local_inference"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-95b4ec54f9b3","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-c0ec2303e947","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["reference_resolution","other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-d11c9628e33e","genre":"single","primarySkill":"grammar_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-ab5059a7a4b5","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["grammar_in_context","other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-afe13836c61f","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-c1880fddcb92","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-6a1d3c08ac63","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-ff069e6cdd5b","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-93fb81d6084d","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["grammar_in_context","other_uncertain"],"cognitiveDepth":"D1_verbatim_retrieval","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D1_verbatim_retrieval.json"},{"ref":"cap-3dcfbd662599","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["other_uncertain","reference_resolution"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-61bab3778477","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-490f167349ea","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["other_uncertain","local_inference"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-fa458e5f163e","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["pragmatic_meaning","other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-efbe8bfd56c1","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-9a66a6c51849","genre":"single","primarySkill":"reference_resolution","secondarySkills":["grammar_in_context"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/reference_resolution--D3_multi_step_synthesis.json"},{"ref":"cap-2f6ebec0a534","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-02dc142c8c22","genre":"article_informational","primarySkill":"explicit_detail","secondarySkills":["other_uncertain","reference_resolution"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/explicit_detail--D2_single_step_inference.json"},{"ref":"cap-8bd5c53da955","genre":"article_informational","primarySkill":"local_inference","secondarySkills":["purpose_speaker_intent","sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/local_inference--D2_single_step_inference.json"},{"ref":"cap-14d211098d8f","genre":"infographic_chart_table","primarySkill":"explicit_detail","secondarySkills":["information_integration","other_uncertain"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/explicit_detail--D3_multi_step_synthesis.json"},{"ref":"cap-fc4dae467d01","genre":"brochure_flyer","primarySkill":"information_integration","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"spatial","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D2_single_step_inference.json"},{"ref":"cap-c390090dcd63","genre":"brochure_flyer","primarySkill":"information_integration","secondarySkills":["explicit_detail"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"spatial","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D3_multi_step_synthesis.json"},{"ref":"cap-c74892736cc0","genre":"article_informational","primarySkill":"pragmatic_meaning","secondarySkills":["local_inference","information_integration"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/pragmatic_meaning--D3_multi_step_synthesis.json"},{"ref":"cap-45cb5bc555bd","genre":"article_informational","primarySkill":"reference_resolution","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/reference_resolution--D2_single_step_inference.json"},{"ref":"cap-5225d45a6e3f","genre":"article_informational","primarySkill":"other_uncertain","secondarySkills":["purpose_speaker_intent"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/other_uncertain--D2_single_step_inference.json"},{"ref":"cap-68c661dbf164","genre":"article_informational","primarySkill":"local_inference","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/local_inference--D2_single_step_inference.json"},{"ref":"cap-35cc7f1a2c07","genre":"article_informational","primarySkill":"other_uncertain","secondarySkills":["reference_resolution","purpose_speaker_intent"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/other_uncertain--D2_single_step_inference.json"},{"ref":"cap-9270daa2b83b","genre":"article_informational","primarySkill":"purpose_speaker_intent","secondarySkills":["sequence_cause_consequence","pragmatic_meaning"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/purpose_speaker_intent--D2_single_step_inference.json"},{"ref":"cap-cd7d319bcb4f","genre":"article_informational","primarySkill":"explicit_detail","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/explicit_detail--D2_single_step_inference.json"},{"ref":"cap-37d74df4f614","genre":"article_informational","primarySkill":"vocabulary_in_context","secondarySkills":["local_inference","other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-03168e9cfe28","genre":"article_informational","primarySkill":"information_integration","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D3_multi_step_synthesis.json"},{"ref":"cap-a9e06ee3bd60","genre":"article_informational","primarySkill":"other_uncertain","secondarySkills":[],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/other_uncertain--D3_multi_step_synthesis.json"},{"ref":"cap-dbca9e67bf19","genre":"article_informational","primarySkill":"local_inference","secondarySkills":["other_uncertain"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/local_inference--D3_multi_step_synthesis.json"},{"ref":"cap-3491c190506f","genre":"cloze_passage","primarySkill":"other_uncertain","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/other_uncertain--D2_single_step_inference.json"},{"ref":"cap-4644aa4528cb","genre":"cloze_passage","primarySkill":"information_integration","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D2_single_step_inference.json"},{"ref":"cap-d27352f9e080","genre":"cloze_passage","primarySkill":"local_inference","secondarySkills":["other_uncertain","sequence_cause_consequence"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"B1_intermediate","evidenceMode":"multimodal_mixed","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/local_inference--D3_multi_step_synthesis.json"},{"ref":"cap-f40e0079858f","genre":"cloze_passage","primarySkill":"discourse_relationship","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/discourse_relationship--D2_single_step_inference.json"},{"ref":"cap-9a9c9d1b2e48","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-3019d36ab51d","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["other_uncertain","sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-c26018bd4fe4","genre":"single","primarySkill":"grammar_in_context","secondarySkills":[],"cognitiveDepth":"D1_verbatim_retrieval","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D1_verbatim_retrieval.json"},{"ref":"cap-9a53368b5e71","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["other_uncertain"],"cognitiveDepth":"D1_verbatim_retrieval","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D1_verbatim_retrieval.json"},{"ref":"cap-d10d7ae61df6","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["other_uncertain","reference_resolution"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-3d8d004ef67b","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["other_uncertain","sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-fad0f2689a48","genre":"single","primarySkill":"reference_resolution","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/reference_resolution--D2_single_step_inference.json"},{"ref":"cap-6aa69d4060df","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["sequence_cause_consequence","grammar_in_context"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-774344c7d257","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-4473ae898bff","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["other_uncertain","sequence_cause_consequence"],"cognitiveDepth":"D1_verbatim_retrieval","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D1_verbatim_retrieval.json"},{"ref":"cap-ec9c91e8ee43","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["other_uncertain","reference_resolution"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-e7883e2d446c","genre":"single","primarySkill":"reference_resolution","secondarySkills":["text_structure","other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/reference_resolution--D2_single_step_inference.json"},{"ref":"cap-916b5272273e","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-31a0f3be7210","genre":"single","primarySkill":"pragmatic_meaning","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/pragmatic_meaning--D2_single_step_inference.json"},{"ref":"cap-a97c65e44445","genre":"single","primarySkill":"grammar_in_context","secondarySkills":[],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D3_multi_step_synthesis.json"},{"ref":"cap-86a26dcb5e08","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["other_uncertain","reference_resolution"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-54715c20d219","genre":"single","primarySkill":"other_uncertain","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/other_uncertain--D3_multi_step_synthesis.json"},{"ref":"cap-12675c2e04e5","genre":"article_informational","primarySkill":"explicit_detail","secondarySkills":["vocabulary_in_context","other_uncertain"],"cognitiveDepth":"D1_verbatim_retrieval","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/explicit_detail--D1_verbatim_retrieval.json"},{"ref":"cap-dd1dd66487e9","genre":"article_informational","primarySkill":"sequence_cause_consequence","secondarySkills":["other_uncertain","vocabulary_in_context"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/sequence_cause_consequence--D2_single_step_inference.json"},{"ref":"cap-550378c78bc9","genre":"dialogue","primarySkill":"pragmatic_meaning","secondarySkills":["purpose_speaker_intent","cross_sentence_inference"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/pragmatic_meaning--D2_single_step_inference.json"},{"ref":"cap-bc45683400fc","genre":"dialogue","primarySkill":"pragmatic_meaning","secondarySkills":["information_integration","local_inference"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/pragmatic_meaning--D3_multi_step_synthesis.json"},{"ref":"cap-7716ecad88c3","genre":"article_informational","primarySkill":"explicit_detail","secondarySkills":["information_integration"],"cognitiveDepth":"D1_verbatim_retrieval","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/explicit_detail--D1_verbatim_retrieval.json"},{"ref":"cap-27214c97e62b","genre":"article_informational","primarySkill":"information_integration","secondarySkills":["explicit_detail","sequence_cause_consequence"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D3_multi_step_synthesis.json"},{"ref":"cap-df0dd93208ab","genre":"article_informational","primarySkill":"main_idea","secondarySkills":["explicit_detail","information_integration"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/main_idea--D2_single_step_inference.json"},{"ref":"cap-be2e51c987e2","genre":"article_informational","primarySkill":"vocabulary_in_context","secondarySkills":["local_inference"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-cd6115400538","genre":"comic_strip","primarySkill":"main_idea","secondarySkills":["sequence_cause_consequence","information_integration"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/main_idea--D3_multi_step_synthesis.json"},{"ref":"cap-673c957e5f85","genre":"comic_strip","primarySkill":"explicit_detail","secondarySkills":["sequence_cause_consequence","information_integration"],"cognitiveDepth":"D1_verbatim_retrieval","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/explicit_detail--D1_verbatim_retrieval.json"},{"ref":"cap-07f3cc6f2d29","genre":"comic_strip","primarySkill":"reference_resolution","secondarySkills":["local_inference","sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/reference_resolution--D2_single_step_inference.json"},{"ref":"cap-65c449243821","genre":"article_informational","primarySkill":"purpose_speaker_intent","secondarySkills":["other_uncertain","reference_resolution"],"cognitiveDepth":"D1_verbatim_retrieval","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/purpose_speaker_intent--D1_verbatim_retrieval.json"},{"ref":"cap-03ba662a2f8e","genre":"article_informational","primarySkill":"information_integration","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D2_single_step_inference.json"},{"ref":"cap-79165d60f1f2","genre":"article_informational","primarySkill":"information_integration","secondarySkills":["other_uncertain"],"cognitiveDepth":"D4_evaluative_pragmatic","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D4_evaluative_pragmatic.json"},{"ref":"cap-9b63bfc118fc","genre":"article_informational","primarySkill":"main_idea","secondarySkills":["text_structure","information_integration"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/main_idea--D2_single_step_inference.json"},{"ref":"cap-18928c63a20f","genre":"article_informational","primarySkill":"pragmatic_meaning","secondarySkills":["cross_sentence_inference","information_integration"],"cognitiveDepth":"D4_evaluative_pragmatic","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/pragmatic_meaning--D4_evaluative_pragmatic.json"},{"ref":"cap-036ccb9ba5b5","genre":"article_informational","primarySkill":"pragmatic_meaning","secondarySkills":["vocabulary_in_context","information_integration"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/pragmatic_meaning--D3_multi_step_synthesis.json"},{"ref":"cap-f90bcf32a85e","genre":"cloze_passage","primarySkill":"grammar_in_context","secondarySkills":["other_uncertain"],"cognitiveDepth":"D1_verbatim_retrieval","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D1_verbatim_retrieval.json"},{"ref":"cap-65a504b34c1b","genre":"cloze_passage","primarySkill":"discourse_relationship","secondarySkills":["other_uncertain"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/discourse_relationship--D3_multi_step_synthesis.json"},{"ref":"cap-9f92fd446c43","genre":"cloze_passage","primarySkill":"main_idea","secondarySkills":["other_uncertain","sequence_cause_consequence"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/main_idea--D3_multi_step_synthesis.json"},{"ref":"cap-e77001ff79cc","genre":"cloze_passage","primarySkill":"pragmatic_meaning","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/pragmatic_meaning--D2_single_step_inference.json"},{"ref":"cap-98aa5fc8dafc","genre":"cloze_passage","primarySkill":"grammar_in_context","secondarySkills":["other_uncertain"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-cb48b2a3c0fc","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-d614d9af8093","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-094aedcb0925","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-2412aefe45d3","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":[],"cognitiveDepth":"D1_verbatim_retrieval","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D1_verbatim_retrieval.json"},{"ref":"cap-335c6e441f02","genre":"single","primarySkill":"grammar_in_context","secondarySkills":[],"cognitiveDepth":"D1_verbatim_retrieval","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D1_verbatim_retrieval.json"},{"ref":"cap-2a02687234c1","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-f841ac7c3405","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["reference_resolution"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D3_multi_step_synthesis.json"},{"ref":"cap-efa5fec4d9d3","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["reference_resolution"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-1eaa6bd47042","genre":"single","primarySkill":"grammar_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-6173efd09dbf","genre":"single","primarySkill":"grammar_in_context","secondarySkills":[],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-899edf88e261","genre":"single","primarySkill":"reference_resolution","secondarySkills":["grammar_in_context"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/reference_resolution--D2_single_step_inference.json"},{"ref":"cap-ae56440af9b1","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["local_inference"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-d23f19eecb8f","genre":"single","primarySkill":"vocabulary_in_context","secondarySkills":["local_inference"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-4a41b2a14ccc","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D3_multi_step_synthesis.json"},{"ref":"cap-9412ab276938","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"single_sentence","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-ffa828c20793","genre":"single","primarySkill":"reference_resolution","secondarySkills":["grammar_in_context"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/reference_resolution--D2_single_step_inference.json"},{"ref":"cap-a4fcfce466fb","genre":"single","primarySkill":"grammar_in_context","secondarySkills":["pragmatic_meaning"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A1_elementary","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/grammar_in_context--D2_single_step_inference.json"},{"ref":"cap-7f8721a1c8dc","genre":"infographic_chart_table","primarySkill":"information_integration","secondarySkills":["explicit_detail"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D2_single_step_inference.json"},{"ref":"cap-4a7ef12cadc3","genre":"infographic_chart_table","primarySkill":"sequence_cause_consequence","secondarySkills":["information_integration","explicit_detail"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/sequence_cause_consequence--D2_single_step_inference.json"},{"ref":"cap-e49c31166864","genre":"comic_strip","primarySkill":"local_inference","secondarySkills":["information_integration"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/local_inference--D3_multi_step_synthesis.json"},{"ref":"cap-f1f56d7a6309","genre":"comic_strip","primarySkill":"vocabulary_in_context","secondarySkills":["information_integration","local_inference"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-6b22490235f8","genre":"brochure_flyer","primarySkill":"other_uncertain","secondarySkills":["information_integration"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"spatial","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/other_uncertain--D2_single_step_inference.json"},{"ref":"cap-b65797db5957","genre":"brochure_flyer","primarySkill":"information_integration","secondarySkills":["explicit_detail"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"spatial","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D2_single_step_inference.json"},{"ref":"cap-0e35ad2905fa","genre":"dialogue","primarySkill":"sequence_cause_consequence","secondarySkills":["information_integration"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/sequence_cause_consequence--D2_single_step_inference.json"},{"ref":"cap-8fe59b87f83b","genre":"dialogue","primarySkill":"reference_resolution","secondarySkills":["information_integration"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/reference_resolution--D3_multi_step_synthesis.json"},{"ref":"cap-1c48c4a41c98","genre":"article_informational","primarySkill":"purpose_speaker_intent","secondarySkills":["local_inference"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/purpose_speaker_intent--D2_single_step_inference.json"},{"ref":"cap-c825ffec373c","genre":"article_informational","primarySkill":"explicit_detail","secondarySkills":["information_integration"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/explicit_detail--D2_single_step_inference.json"},{"ref":"cap-5aea36b37d9e","genre":"article_informational","primarySkill":"main_idea","secondarySkills":["information_integration"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/main_idea--D3_multi_step_synthesis.json"},{"ref":"cap-605532037c07","genre":"infographic_chart_table","primarySkill":"main_idea","secondarySkills":["information_integration","other_uncertain"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/main_idea--D3_multi_step_synthesis.json"},{"ref":"cap-e7c766fb0987","genre":"infographic_chart_table","primarySkill":"sequence_cause_consequence","secondarySkills":["information_integration","explicit_detail"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"multimodal_text_and_graphic","shard":"packages/generator/curriculum/cap-precedent-shards/sequence_cause_consequence--D2_single_step_inference.json"},{"ref":"cap-391233e5a3b7","genre":"infographic_chart_table","primarySkill":"sequence_cause_consequence","secondarySkills":["information_integration"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"multimodal_mixed","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/sequence_cause_consequence--D2_single_step_inference.json"},{"ref":"cap-f98a1b6cd8bb","genre":"multi_document_comparison","primarySkill":"vocabulary_in_context","secondarySkills":["local_inference"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"B1_intermediate","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/vocabulary_in_context--D2_single_step_inference.json"},{"ref":"cap-6b282c8a2668","genre":"multi_document_comparison","primarySkill":"text_structure","secondarySkills":["explicit_detail","purpose_speaker_intent"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/text_structure--D3_multi_step_synthesis.json"},{"ref":"cap-872d6cf35c1a","genre":"multi_document_comparison","primarySkill":"explicit_detail","secondarySkills":["reference_resolution"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/explicit_detail--D3_multi_step_synthesis.json"},{"ref":"cap-908199d0b44d","genre":"multi_document_comparison","primarySkill":"information_integration","secondarySkills":["cross_sentence_inference"],"cognitiveDepth":"D4_evaluative_pragmatic","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/information_integration--D4_evaluative_pragmatic.json"},{"ref":"cap-7162d16d2150","genre":"cloze_passage","primarySkill":"discourse_relationship","secondarySkills":["sequence_cause_consequence","local_inference"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/discourse_relationship--D3_multi_step_synthesis.json"},{"ref":"cap-8fcb1f6997aa","genre":"cloze_passage","primarySkill":"discourse_relationship","secondarySkills":["sequence_cause_consequence"],"cognitiveDepth":"D3_multi_step_synthesis","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/discourse_relationship--D3_multi_step_synthesis.json"},{"ref":"cap-43c2a2e4f3f9","genre":"cloze_passage","primarySkill":"discourse_relationship","secondarySkills":["reference_resolution","local_inference"],"cognitiveDepth":"D2_single_step_inference","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"cross_sentence_local","shard":"packages/generator/curriculum/cap-precedent-shards/discourse_relationship--D2_single_step_inference.json"},{"ref":"cap-aefce0e9b6b3","genre":"cloze_passage","primarySkill":"local_inference","secondarySkills":["sequence_cause_consequence","pragmatic_meaning"],"cognitiveDepth":"D4_evaluative_pragmatic","languageDifficulty":"A2_basic","evidenceMode":"text_only","evidenceSpan":"multi_paragraph_global","shard":"packages/generator/curriculum/cap-precedent-shards/local_inference--D4_evaluative_pragmatic.json"}]}
```

## 3. Model Quality Profile Resolution & Provenance

Before critique or submission, resolve the authoring model quality profile deterministically:

1. Preserve the exact runtime model identifier as `actualModel`. Never rename the model to a profile name.
2. Normalize only for lookup: trim, lowercase, and remove a leading `models/` prefix.
3. Prefer a matching profile filename/modelId/modelPatterns. If no model-specific profile matches, resolve to `default` and mark it as fallback. Never invent a profile for an unmatched model.
4. Apply the resolved profile before submission, then add or replace exactly one passing `qualityEvidence.criticalChecks` entry with `id: "model-quality-profile"`.
5. Its evidence must truthfully encode: `actualModel=<exact runtime model> | resolvedQualityProfile=<resolved profile name> | qualityProfileVersion=<resolved profile frontmatter version> | engineVersion=<bundle engineVersion>` and append ` (fallback)` when the default fallback was used.
6. Missing, fabricated, or mismatched model/profile provenance is a production quality violation. Do not hide it by relabeling the package as legacy/historical.

### Bundled fallback profile
---
profileVersion: "1.2.0"
modelId: "default"
modelPatterns:
  - "default"
  - "fallback"
  - "*"
description: "Universal fallback pre-submit quality profile for models without specific observed semantic biases"
updatedAt: "2026-08-29"
---

# Default Pre-Submit Quality Profile

This is the default quality profile applied when no model-specific profile exists for the authoring model.
It defines standard pre-submit critique invariants and provides a clean container for operator observations.

## Active Quality Rules

### Bundled Gemini profile
---
profileVersion: "1.2.0"
modelId: "gemini-3.7-flash"
modelPatterns:
  - "gemini-3.7-flash"
  - "gemini-3-7-flash"
  - "models/gemini-3.7-flash"
  - "models/gemini-3-7-flash"
  - "gemini-2.5-flash"
  - "models/gemini-2.5-flash"
description: "Model-specific semantic critique profile for Gemini 3.7 Flash authoring"
updatedAt: "2026-08-29"
---

# Gemini 3.7 Flash Quality Profile

Before submission, specifically inspect:

## Active Quality Rules

### 1. English Naturalness & Phrasing Pass
- **Target Area:** `english-naturalness`
- **Rule ID:** `gemini-nat-01`
- **Description:** Re-read every generated English sentence. Repair unnatural collocations, missing possessives/articles, and translated-Chinese phrasing. Prefer natural junior-high English over merely grammatical English.
- **Check Points:**
  - Eliminate awkward word order, unnatural phrase combinations, or non-idiomatic translations.
  - Verify conversational dialogue sounds authentic and spoken, not textbook-robotic.

### 2. Possessives, Articles, Agreement & Collocations
- **Target Area:** `grammar-collocations`
- **Rule ID:** `gemini-gram-02`
- **Description:** Verify precision in minor grammatical agreements and high-frequency English collocations.
- **Check Points:**
  - Check third-person singular `-s` and past tense consistency across clauses.
  - Verify correct indefinite/definite article usage (`a`, `an`, `the`, or zero article).
  - Verify singular/plural noun possessives (e.g., `the boy's`, `the students'`).
  - Verify natural prepositional collocations (e.g., `interested in`, `good at`, `on the weekend` / `at the weekend`, `listen to`).

### 3. Translated-Chinese Phrasing Elimination
- **Target Area:** `chinese-naturalness`
- **Rule ID:** `gemini-zh-03`
- **Description:** Eliminate English syntax structures mirrored in Traditional Chinese text.
- **Check Points:**
  - Ensure all `instructionsZh`, `meaningZh`, `explanationZh`, `contextZh`, and `walkthroughZh` are written in fluent, idiomatic Taiwanese Traditional Chinese (正體中文).
  - Remove translationese (歐化中文), awkward passive constructions (e.g., 不自然的「被...所...」), and redundant pronouns.

### 4. Answer Integrity & Causal/Evidence Correctness
- **Target Area:** `explanation-causality`
- **Rule ID:** `gemini-exp-04`
- **Description:** Ensure every answer explanation actually explains why the answer is correct with explicit textual or grammatical evidence and clear causal reasoning.
- **Check Points:**
  - The explanation must clearly state *why* the correct answer is right by citing specific passage evidence or grammar rules.
  - For multiple-choice questions, the explanation must concisely eliminate key distractors with unbroken logical causality.
  - Explanations must be self-contained so a junior-high student studying alone can understand their mistake without external assistance.

### 5. Textual Entailment & Multi-Detail Synthesis Prevention
- **Target Area:** `answer-entailment`
- **Rule ID:** `gemini-entail-05`
- **Description:** Before submission, verify every MC correct option and Parent rationale is directly entailed by the source text. Never combine separately mentioned true details into a new unsupported claim. Correct answers and Parent rationales must be directly supported by the source, or explicitly framed as inference.
- **Check Points:**
  - Verify every multiple-choice correct option and Parent rationale is directly entailed by the source text.
  - Never combine separately mentioned true details into a new unsupported claim or composite statement.
  - Global Answer Integrity: Correct answers and Parent rationales must be directly supported by the source, or explicitly framed as inference.

### 6. Primary Reading Evidence Boundary
- **Target Area:** `evidence-boundary`
- **Rule ID:** `gemini-evid-06`
- **Description:** Verify that reading comprehension and CAP questions draw evidence strictly from `studentLesson.reading.blocks`.
- **Check Points:**
  - Never reference sentences or examples located in instruction boxes or practice prompts as reading evidence.
  - Ensure all quoted prompt strings match reading block prose verbatim.

### 7. Epistemic Modality Preservation
- **Target Area:** `answer-entailment`
- **Rule ID:** `gemini-modality-07`
- **Description:** Preserve strict modality in parent answers and explanations.
- **Check Points:**
  - Never convert hypothetical passage conditions into asserted historical facts or fabricated records.

### 8. Task Topology & Mechanism Diversity
- **Target Area:** `task-topology`
- **Rule ID:** `gemini-topology-08`
- **Description:** Prevent question template collapse across practice sections.
- **Check Points:**
  - Ensure diverse cognitive tasks (retrieval, condition-result mapping, causal deduction, lexical transfer).

## 4. Curriculum Package Schema
```typescript
import { z } from 'zod'

const Text = z.string().trim().min(1)
const StableId = Text.regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/, 'Must be a stable identifier')
const Evidence = z.strictObject({ source: z.enum(['profile', 'school', 'learning-state', 'vocabulary', 'grammar', 'weekly-history', 'feedback', 'curriculum']), detail: Text })

export const ResponseLayoutRowSchema = z.strictObject({
  label: Text.optional(),
  values: z.array(Text).optional(),
})

export type ResponseLayoutRow = z.infer<typeof ResponseLayoutRowSchema>

export const ResponseLayoutSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('lines'),
    lineCount: z.number().int().min(1).max(10).optional(),
  }),
  z.strictObject({
    type: z.literal('table'),
    headers: z.array(Text).min(2).max(6),
    rows: z.array(ResponseLayoutRowSchema).min(1).max(8),
  }),
  z.strictObject({
    type: z.literal('organizer'),
    headers: z.array(Text).min(2).max(6),
    rows: z.array(ResponseLayoutRowSchema).min(1).max(8),
  }),
])

export type ResponseLayout = z.infer<typeof ResponseLayoutSchema>

function requireWritingSpace(question: { itemType: string; options?: string[]; writingLines: number; responseLayout?: ResponseLayout }, ctx: z.RefinementCtx): void {
  const writtenResponse = !question.options && ['translation', 'sentence-production', 'short-response'].includes(question.itemType)
  const hasWritingSpace = question.writingLines >= 1
    || (question.responseLayout?.type === 'lines' && (question.responseLayout.lineCount ?? 0) >= 1)
    || question.responseLayout?.type === 'table'
    || question.responseLayout?.type === 'organizer'
  if (writtenResponse && !hasWritingSpace) {
    ctx.addIssue({ code: 'custom', path: ['writingLines'], message: 'Written responses require writing space' })
  }
}

export const QuestionLegacySchema = z.strictObject({
  id: StableId,
  targetIds: z.array(StableId).min(1).max(4),
  itemType: z.enum(['vocabulary', 'grammar', 'main-idea', 'detail', 'sequence', 'inference', 'context-clue', 'author-purpose', 'cloze', 'translation', 'sentence-production', 'short-response']),
  prompt: Text,
  options: z.array(Text).length(4).optional(),
  writingLines: z.number().int().min(0).max(10),
  difficulty: z.enum(['supported', 'on-level', 'stretch']),
}).superRefine(requireWritingSpace)

export type QuestionLegacy = z.infer<typeof QuestionLegacySchema>

export const QuestionV24Schema = z.strictObject({
  id: StableId,
  targetIds: z.array(StableId).min(1).max(4),
  itemType: z.enum(['vocabulary', 'grammar', 'main-idea', 'detail', 'sequence', 'inference', 'context-clue', 'author-purpose', 'cloze', 'translation', 'sentence-production', 'short-response']),
  prompt: Text,
  options: z.array(Text).length(4).optional(),
  writingLines: z.number().int().min(0).max(10),
  difficulty: z.enum(['supported', 'on-level', 'stretch']),
  responseLayout: ResponseLayoutSchema.optional(),
}).superRefine(requireWritingSpace)

export type QuestionV24 = z.infer<typeof QuestionV24Schema>
export const QuestionSchema = QuestionV24Schema
export type Question = QuestionV24

export const ReadingBlockSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('paragraph'), text: Text }),
  z.strictObject({ type: z.literal('dialogue'), speaker: Text, text: Text }),
  z.strictObject({ type: z.literal('notice'), heading: Text.optional(), text: Text }),
  z.strictObject({ type: z.literal('schedule-row'), timeOrStep: Text, event: Text, detail: Text.optional() }),
])

export type ReadingBlock = z.infer<typeof ReadingBlockSchema>

export const ReadingGenreSchema = z.enum([
  'article',
  'narrative',
  'dialogue',
  'notice',
  'schedule',
  'instructions',
  'mini-report',
])

export type ReadingGenre = z.infer<typeof ReadingGenreSchema>

export const AdaptiveExtensionPurposeSchema = z.enum([
  'strategy',
  'reasoning',
  'pronunciation',
  'real-world-application',
  'creative-depth',
])

export type AdaptiveExtensionPurpose = z.infer<typeof AdaptiveExtensionPurposeSchema>

export const AdaptiveExtensionPlacementSchema = z.enum([
  'after-reading',
  'after-practice',
])

export type AdaptiveExtensionPlacement = z.infer<typeof AdaptiveExtensionPlacementSchema>

export const AdaptiveExtensionSchema = z.strictObject({
  id: StableId,
  placement: AdaptiveExtensionPlacementSchema,
  purpose: AdaptiveExtensionPurposeSchema,
  titleZh: Text,
  contentZh: Text,
  taskZh: Text.nullable().optional().default(null),
  taskWritingLines: z.number().int().min(0).max(6).optional().default(0),
})

export type AdaptiveExtension = z.infer<typeof AdaptiveExtensionSchema>

export const GroundingSourceSchema = z.strictObject({
  id: StableId,
  url: z.url(),
  title: Text,
  publisher: Text,
  publishedAt: z.iso.datetime().optional(),
  accessedAt: z.iso.datetime(),
})

export const GroundingFactSchema = z.strictObject({
  id: StableId,
  text: Text,
  sourceIds: z.array(StableId).min(1),
  classification: z.enum(['fact', 'inference']),
})

export const GroundingClaimSchema = z.strictObject({
  id: StableId,
  factIds: z.array(StableId).min(1),
  location: Text,
  text: Text,
})

export const GroundingSchema = z.strictObject({
  topic: Text,
  knowledgeType: z.enum(['event', 'person', 'place', 'process', 'concept', 'comparison', 'other']),
  temporalMode: z.enum(['evergreen', 'current']),
  researchedAt: z.iso.datetime(),
  sources: z.array(GroundingSourceSchema).min(1),
  facts: z.array(GroundingFactSchema).min(1),
  claims: z.array(GroundingClaimSchema).min(1),
})

// Legacy 2.2.0 production schema. Historical packages remain renderable but are
// never upgraded by inventing grounding metadata.
export const CurriculumPackageV22Schema = z.strictObject({
  metadata: z.strictObject({
    schemaVersion: z.literal('2.2.0'),
    jobId: StableId,
    childId: StableId,
    weekNumber: z.number().int().positive(),
    grade: z.number().int().min(7).max(9),
    gradeStage: z.enum(['incoming_grade_7', 'grade_7', 'grade_8', 'grade_9']),
    title: Text,
    generatedAt: z.iso.datetime(),
    curriculumVersion: Text,
    promptVersion: Text,
    rubricVersion: Text,
    rendererVersion: Text,
    model: Text,
    inputFingerprint: StableId,
    engineVersion: Text.optional(),
    workerVersion: Text.optional(),
    releaseId: Text.optional(),
  }),
  learnerSnapshot: z.strictObject({
    schoolProgress: Text.nullable(),
    specificInterests: z.array(Text).max(20),
    changedInterests: z.array(Text).max(10),
    avoid: z.array(Text).max(10),
    recentDifficulty: z.enum(['too-easy', 'appropriate', 'too-hard', 'unknown']),
    feedbackSummary: Text,
    recurringMistakes: z.array(Text).max(20),
    reviewDue: z.array(Text).max(30),
  }),
  learningPlan: z.strictObject({
    estimatedMinutes: z.number().int().min(30).max(240),
    difficultyBand: Text,
    targets: z.array(z.strictObject({ id: StableId, domain: z.enum(['vocabulary', 'grammar', 'reading', 'writing', 'communication', 'review']), description: Text, evidence: z.array(Evidence).min(1), successCriteria: Text })).min(3).max(10),
    prerequisites: z.array(Text).max(12),
    reviewStrategy: z.array(Text).min(1).max(12),
    personalizationStrategy: Text,
    exclusions: z.array(Text).max(12),
  }),
  studentLesson: z.strictObject({
    opening: z.strictObject({ goalsZh: z.array(Text).min(2).max(6), howToUseZh: Text, warmUp: Text }),
    vocabulary: z.array(z.strictObject({ id: StableId, word: Text, partOfSpeech: Text, meaningZh: Text, pronunciationHint: Text.nullable(), exampleEn: Text, exampleZh: Text, status: z.enum(['new', 'review', 'repeated-miss', 'extension']) })).min(7).max(15),
    reading: z.strictObject({
      title: Text,
      contextZh: Text,
      genre: ReadingGenreSchema,
      blocks: z.array(ReadingBlockSchema).min(1).max(20),
      wordCount: z.number().int().min(120).max(900),
      readingTipsZh: z.array(Text).min(1).max(6),
      sourceNote: Text.nullable().optional(),
    }),
    adaptiveExtension: AdaptiveExtensionSchema.nullable().optional(),
    instruction: z.array(z.strictObject({ id: StableId, titleZh: Text, explanationZh: Text, patterns: z.array(Text).min(1).max(8), workedExamples: z.array(z.strictObject({ example: Text, walkthroughZh: Text })).min(2).max(8), commonMistakes: z.array(z.strictObject({ wrong: Text, corrected: Text, whyZh: Text })).min(1).max(6) })).min(1).max(4),
    practice: z.array(z.strictObject({ id: StableId, stage: z.enum(['guided', 'independent', 'cap-transfer', 'production', 'retrieval']), titleZh: Text, instructionsZh: Text, hintZh: Text.nullable(), questions: z.array(QuestionLegacySchema).min(1).max(20) })).min(4).max(10),
    selfCheckZh: z.array(Text).min(2).max(8),
    homework: z.strictObject({ purposeZh: Text, estimatedMinutes: z.number().int().min(5).max(90), questions: z.array(QuestionLegacySchema).min(3).max(20) }),
  }),
  answers: z.array(z.strictObject({ questionId: StableId, answer: Text, acceptedAnswers: z.array(Text), explanationZh: Text, likelyMisconceptionZh: Text.nullable(), followUpZh: Text.nullable() })).min(1),
  parentSummary: z.strictObject({
    focusZh: Text,
    observeZh: z.array(Text).min(1).max(6),
    completionCheckZh: Text,
    personalizationZh: z.array(Text).min(1).max(6).optional(),
  }),
  trackingDelta: z.strictObject({
    introducedVocabularyIds: z.array(StableId),
    reviewedVocabularyIds: z.array(StableId),
    exposedGrammarTargetIds: z.array(StableId),
    exposedReadingTargetIds: z.array(StableId),
    exposedCommunicationFunctionIds: z.array(StableId).default([]),
    hypothesesToVerify: z.array(Text).min(1).max(12),
    nextReviewCandidates: z.array(Text).min(1).max(20),
  }),
  qualityEvidence: z.strictObject({
    feedbackApplied: z.array(Text).min(1),
    improvementComparedToPrevious: z.array(Text).min(1).max(8),
    criticalChecks: z.array(z.strictObject({ id: StableId, passed: z.boolean(), evidence: Text })).min(1),
    criticFindings: z.array(z.strictObject({ dimension: StableId, severity: z.enum(['info', 'warning', 'critical']), finding: Text, resolution: Text.nullable() })),
  }),
})

// Legacy 2.3.0 Production Schema
export const CurriculumPackageV23Schema = CurriculumPackageV22Schema.extend({
  metadata: CurriculumPackageV22Schema.shape.metadata.extend({
    schemaVersion: z.literal('2.3.0'),
  }),
  grounding: GroundingSchema,
  qualityEvidence: CurriculumPackageV22Schema.shape.qualityEvidence.extend({
    precedentRefs: z.array(z.string().regex(/^cap-[a-f0-9]{12}$/)).max(20).default([]),
  }),
})

// Canonical 2.4.0 Production Schema
export const CurriculumPackageV24Schema = CurriculumPackageV23Schema.extend({
  metadata: CurriculumPackageV23Schema.shape.metadata.extend({
    schemaVersion: z.literal('2.4.0'),
  }),
  studentLesson: CurriculumPackageV23Schema.shape.studentLesson.extend({
    vocabulary: z.array(z.strictObject({
      id: StableId,
      word: Text,
      partOfSpeech: Text,
      meaningZh: Text,
      pronunciationHint: Text.nullable(),
      exampleEn: Text,
      exampleZh: Text,
      status: z.enum(['new', 'review', 'repeated-miss', 'extension']),
    })).min(1).max(30),
    practice: z.array(z.strictObject({
      id: StableId,
      stage: z.enum(['guided', 'independent', 'cap-transfer', 'production', 'retrieval']),
      titleZh: Text,
      instructionsZh: Text,
      hintZh: Text.nullable(),
      questions: z.array(QuestionV24Schema).min(1).max(20),
    })).min(4).max(10),
    homework: z.strictObject({
      purposeZh: Text,
      estimatedMinutes: z.number().int().min(5).max(90),
      questions: z.array(QuestionV24Schema).min(3).max(20),
    }),
  }),
})

/** The one canonical schema used for all newly authored production packages. */
export const CurriculumPackageSchema = CurriculumPackageV24Schema

// Legacy 2.1.0 Schema
export const CurriculumPackageV21Schema = z.strictObject({
  metadata: z.strictObject({
    schemaVersion: z.literal('2.1.0'),
    jobId: StableId,
    childId: StableId,
    weekNumber: z.number().int().positive(),
    grade: z.number().int().min(7).max(9),
    gradeStage: z.enum(['incoming_grade_7', 'grade_7', 'grade_8', 'grade_9']),
    title: Text,
    generatedAt: z.iso.datetime(),
    curriculumVersion: Text,
    promptVersion: Text,
    rubricVersion: Text,
    rendererVersion: Text,
    model: Text,
    inputFingerprint: StableId,
    engineVersion: Text.optional(),
    workerVersion: Text.optional(),
    releaseId: Text.optional(),
  }),
  learnerSnapshot: z.strictObject({
    schoolProgress: Text.nullable(),
    specificInterests: z.array(Text).max(20),
    changedInterests: z.array(Text).max(10),
    avoid: z.array(Text).max(10),
    recentDifficulty: z.enum(['too-easy', 'appropriate', 'too-hard', 'unknown']),
    feedbackSummary: Text,
    recurringMistakes: z.array(Text).max(20),
    reviewDue: z.array(Text).max(30),
  }),
  learningPlan: z.strictObject({
    estimatedMinutes: z.number().int().min(30).max(240),
    difficultyBand: Text,
    targets: z.array(z.strictObject({ id: StableId, domain: z.enum(['vocabulary', 'grammar', 'reading', 'writing', 'review']), description: Text, evidence: z.array(Evidence).min(1), successCriteria: Text })).min(3).max(10),
    prerequisites: z.array(Text).max(12),
    reviewStrategy: z.array(Text).min(1).max(12),
    personalizationStrategy: Text,
    exclusions: z.array(Text).max(12),
  }),
  studentLesson: z.strictObject({
    opening: z.strictObject({ goalsZh: z.array(Text).min(2).max(6), howToUseZh: Text, warmUp: Text }),
    vocabulary: z.array(z.strictObject({ id: StableId, word: Text, partOfSpeech: Text, meaningZh: Text, pronunciationHint: Text.nullable(), exampleEn: Text, exampleZh: Text, status: z.enum(['new', 'review', 'repeated-miss', 'extension']) })).min(7).max(15),
    reading: z.strictObject({
      title: Text,
      contextZh: Text,
      genre: ReadingGenreSchema,
      blocks: z.array(ReadingBlockSchema).min(1).max(20),
      wordCount: z.number().int().min(120).max(900),
      readingTipsZh: z.array(Text).min(1).max(6),
      sourceNote: Text.nullable().optional().default(null),
    }),
    instruction: z.array(z.strictObject({ id: StableId, titleZh: Text, explanationZh: Text, patterns: z.array(Text).min(1).max(8), workedExamples: z.array(z.strictObject({ example: Text, walkthroughZh: Text })).min(2).max(8), commonMistakes: z.array(z.strictObject({ wrong: Text, corrected: Text, whyZh: Text })).min(1).max(6) })).min(1).max(4),
    practice: z.array(z.strictObject({ id: StableId, stage: z.enum(['guided', 'independent', 'cap-transfer', 'production', 'retrieval']), titleZh: Text, instructionsZh: Text, hintZh: Text.nullable(), questions: z.array(QuestionLegacySchema).min(1).max(20) })).min(4).max(10),
    selfCheckZh: z.array(Text).min(2).max(8),
    homework: z.strictObject({ purposeZh: Text, estimatedMinutes: z.number().int().min(5).max(90), questions: z.array(QuestionLegacySchema).min(3).max(20) }),
  }),
  answers: z.array(z.strictObject({ questionId: StableId, answer: Text, acceptedAnswers: z.array(Text), explanationZh: Text, likelyMisconceptionZh: Text.nullable(), followUpZh: Text.nullable() })).min(1),
  parentSummary: z.strictObject({
    focusZh: Text,
    observeZh: z.array(Text).min(1).max(6),
    completionCheckZh: Text,
    personalizationZh: z.array(Text).min(1).max(6).optional(),
  }),
  trackingDelta: z.strictObject({
    introducedVocabularyIds: z.array(StableId),
    reviewedVocabularyIds: z.array(StableId),
    grammarTargets: z.array(StableId),
    readingTargets: z.array(StableId),
    hypothesesToVerify: z.array(Text).min(1).max(12),
    nextReviewCandidates: z.array(Text).min(1).max(20),
  }),
  qualityEvidence: z.strictObject({
    feedbackApplied: z.array(Text).min(1),
    improvementComparedToPrevious: z.array(Text).min(1).max(8),
    criticalChecks: z.array(z.strictObject({ id: StableId, passed: z.boolean(), evidence: Text })).min(1),
    criticFindings: z.array(z.strictObject({ dimension: StableId, severity: z.enum(['info', 'warning', 'critical']), finding: Text, resolution: Text.nullable() })),
  }),
})

// Legacy 2.0.0 Schema
export const CurriculumPackageV20Schema = z.strictObject({
  metadata: z.strictObject({
    schemaVersion: z.literal('2.0.0'),
    jobId: StableId,
    childId: StableId,
    weekNumber: z.number().int().positive(),
    grade: z.number().int().min(7).max(9),
    gradeStage: z.enum(['incoming_grade_7', 'grade_7', 'grade_8', 'grade_9']),
    title: Text,
    generatedAt: z.iso.datetime(),
    curriculumVersion: Text,
    promptVersion: Text,
    rubricVersion: Text,
    rendererVersion: Text,
    model: Text,
    inputFingerprint: StableId,
    engineVersion: Text.optional(),
    workerVersion: Text.optional(),
    releaseId: Text.optional(),
  }),
  learnerSnapshot: z.strictObject({
    schoolProgress: Text.nullable(),
    specificInterests: z.array(Text).max(20),
    changedInterests: z.array(Text).max(10),
    avoid: z.array(Text).max(10),
    recentDifficulty: z.enum(['too-easy', 'appropriate', 'too-hard', 'unknown']),
    feedbackSummary: Text,
    recurringMistakes: z.array(Text).max(20),
    reviewDue: z.array(Text).max(30),
  }),
  learningPlan: z.strictObject({
    estimatedMinutes: z.number().int().min(30).max(240),
    difficultyBand: Text,
    targets: z.array(z.strictObject({ id: StableId, domain: z.enum(['vocabulary', 'grammar', 'reading', 'writing', 'review']), description: Text, evidence: z.array(Evidence).min(1), successCriteria: Text })).min(3).max(10),
    prerequisites: z.array(Text).max(12),
    reviewStrategy: z.array(Text).min(1).max(12),
    personalizationStrategy: Text,
    exclusions: z.array(Text).max(12),
  }),
  studentLesson: z.strictObject({
    opening: z.strictObject({ goalsZh: z.array(Text).min(2).max(6), howToUseZh: Text, warmUp: Text }),
    vocabulary: z.array(z.strictObject({ id: StableId, word: Text, partOfSpeech: Text, meaningZh: Text, pronunciationHint: Text.nullable(), exampleEn: Text, exampleZh: Text, status: z.enum(['new', 'review', 'repeated-miss', 'extension']) })).min(7).max(15),
    reading: z.strictObject({ title: Text, contextZh: Text, paragraphs: z.array(Text).min(3).max(12), wordCount: z.number().int().min(120).max(900), readingTipsZh: z.array(Text).min(1).max(6), sourceNote: Text.nullable().optional().default(null) }),
    instruction: z.array(z.strictObject({ id: StableId, titleZh: Text, explanationZh: Text, patterns: z.array(Text).min(1).max(8), workedExamples: z.array(z.strictObject({ example: Text, walkthroughZh: Text })).min(2).max(8), commonMistakes: z.array(z.strictObject({ wrong: Text, corrected: Text, whyZh: Text })).min(1).max(6) })).min(1).max(4),
    practice: z.array(z.strictObject({ id: StableId, stage: z.enum(['guided', 'independent', 'cap-transfer', 'production', 'retrieval']), titleZh: Text, instructionsZh: Text, hintZh: Text.nullable(), questions: z.array(QuestionLegacySchema).min(1).max(20) })).min(4).max(10),
    selfCheckZh: z.array(Text).min(2).max(8),
    homework: z.strictObject({ purposeZh: Text, estimatedMinutes: z.number().int().min(5).max(90), questions: z.array(QuestionLegacySchema).min(3).max(20) }),
  }),
  answers: z.array(z.strictObject({ questionId: StableId, answer: Text, acceptedAnswers: z.array(Text), explanationZh: Text, likelyMisconceptionZh: Text.nullable(), followUpZh: Text.nullable() })).min(1),
  parentSummary: z.strictObject({
    focusZh: Text,
    observeZh: z.array(Text).min(1).max(6),
    completionCheckZh: Text,
    personalizationZh: z.array(Text).min(1).max(6).optional(),
  }),
  trackingDelta: z.strictObject({
    introducedVocabularyIds: z.array(StableId),
    reviewedVocabularyIds: z.array(StableId),
    grammarTargets: z.array(StableId),
    readingTargets: z.array(StableId),
    hypothesesToVerify: z.array(Text).min(1).max(12),
    nextReviewCandidates: z.array(Text).min(1).max(20),
  }),
  qualityEvidence: z.strictObject({
    feedbackApplied: z.array(Text).min(1),
    improvementComparedToPrevious: z.array(Text).min(1).max(8),
    criticalChecks: z.array(z.strictObject({ id: StableId, passed: z.boolean(), evidence: Text })).min(1),
    criticFindings: z.array(z.strictObject({ dimension: StableId, severity: z.enum(['info', 'warning', 'critical']), finding: Text, resolution: Text.nullable() })),
  }),
})

export type CurriculumPackageV24 = z.infer<typeof CurriculumPackageV24Schema>
export type CurriculumPackageV23 = z.infer<typeof CurriculumPackageV23Schema>
export type CurriculumPackageV22 = z.infer<typeof CurriculumPackageV22Schema>
export type CurriculumPackage = CurriculumPackageV24 | CurriculumPackageV23 | CurriculumPackageV22
export type CurriculumPackageV21 = z.infer<typeof CurriculumPackageV21Schema>
export type CurriculumPackageV20 = z.infer<typeof CurriculumPackageV20Schema>
export type CurriculumQuestionV24 = z.infer<typeof QuestionV24Schema>
export type CurriculumQuestionLegacy = z.infer<typeof QuestionLegacySchema>
export type CurriculumQuestion = CurriculumQuestionV24 | (CurriculumQuestionLegacy & { responseLayout?: undefined })

export function upgradeV23ToV24(pkg: CurriculumPackageV23): CurriculumPackageV24 {
  return {
    ...pkg,
    metadata: {
      ...pkg.metadata,
      schemaVersion: '2.4.0',
    },
    studentLesson: {
      ...pkg.studentLesson,
      practice: pkg.studentLesson.practice.map((sec) => ({
        ...sec,
        questions: sec.questions.map((q) => ({ ...q })),
      })),
      homework: {
        ...pkg.studentLesson.homework,
        questions: pkg.studentLesson.homework.questions.map((q) => ({ ...q })),
      },
    },
  }
}
```

## 5. Prompt 01: Planning Engine
# Prompt 01: Consolidated Production Planning (v2.11.1)

You are the Planning Engine for **紙屬英文**, Schema 2.4.0 / Prompt 2.11.1. This is the active consolidated contract. Do not reconstruct or inherit historical prompt overlays.

## 1. Authority and planning order

Plan from the smallest set of evidence that actually matters:

1. explicit learner/profile/parent feedback;
2. demonstrated mistakes, prerequisites, school progress, and compact learning memory;
3. forward grade-appropriate progression and due retrieval;
4. CAP quality floor and curriculum coverage;
5. genre/information structure;
6. researched interest angle.

Explicit relevant feedback is the highest curriculum evidence and may override default progression/review/diversity heuristics. Exposure alone is never weakness. Do not re-promote previously taught grammar as the primary target unless feedback, actual failure evidence, or prerequisite repair justifies it. Previously exposed vocabulary may be reviewed when feedback or semantic learning evidence makes that useful; never relabel an exposed word as new.

Interest is the hook, not the learning objective. Preserve `learning need -> target -> genre/information structure -> researched topic`. Avoid superficial noun-swaps and unnecessary repetition of recent themes when equally good alternatives exist.

## 2. Learner level, lexical plan, and workload

Keep language natural, age-appropriate, self-study friendly, and aligned to the learner's demonstrated level. Select meaningful new vocabulary from the passage's real learning burden rather than a fixed list or quota. Known words may recur naturally. Difficult passage-critical words should be taught, context-supported, already known, necessary proper nouns, or simplified.

Use profile `weekly_minutes` as `targetMinutes`. `learningPlan.estimatedMinutes` is truthful represented-work evidence and must not simply copy the target. Plan meaningful work near the configured target band without filler, fake duration, or deleting essential learning stages.

For major targets, plan a coherent progression from teaching/guided work into independent evidence, transfer/production, delayed retrieval, or homework. Supporting targets may remain lighter when pedagogically justified. When a question genuinely requires a table, comparison matrix, or organizer, plan a concrete Schema 2.4.0 `responseLayout`.

## 3. Grounded research

After the single authoritative batch claim, conduct privacy-safe public research before authoring. Search queries may contain generalized public topic terms only. Never transmit learner identity, IDs, school, grade/level, feedback, mistakes, history, profile prose, or private notes.

Explore, select, drill down, verify, then build canonical grounding. Prefer primary/official and other reliable sources appropriate to the proposition. Extract propositions rather than source prose. `temporalMode` is explicit:

- `evergreen` for durable knowledge;
- `current` when recency materially matters; record `researchedAt`, require valid `publishedAt` for sources establishing the current development, distinguish event from publication timing, and use topic-aware freshness with credible current evidence.

Classify time sensitivity internally as durable or fast-moving. For a fast-moving domain, actively discover credible recent developments with date-aware research before selection and compare them with durable candidates. If a recent candidate serves the learning target equally well or better while remaining reliable, teachable, age-appropriate, lexically feasible, factually useful, and copyright-safe, prefer it over generic evergreen noun-skinning.

Do not force `current`. Prefer a durable fallback when recent candidates are rumor, prediction, weakly sourced, trivial, too complex, unsafe, vocabulary-heavy, factually thin, or pedagogically inferior. Choose the angle that best serves learning rather than recency for its own sake.

### Exact attribution invariant

For factual claims involving a named product, organization, model, version, mode, feature, API, policy, scientific mechanism, or similarly scoped entity, research must support the complete proposition at the same scope that the lesson will state:

`exact entity/version/mode -> exact capability/behavior -> exact control flow/condition/limit/qualifier`

A source being broadly about the same product or organization is not enough. Never combine individually true fragments from different modes/features into a false relationship. If sources distinguish modes, preserve that distinction or simplify the claim.

## 4. Assessment planning

For normal assessment/application/comprehension items, consult the authoritative non-holdout CAP runtime bundle before authoring. CAP is the quality floor, not a mold. Use `anchor`, `blend`, or `calibration` based on fit, while keeping language difficulty independent from cognitive depth. Intentional vocabulary/grammar retrieval is valid when explicitly planned as retrieval. Retrieval may test lexical form, meaning, collocation, discrimination, or usage, but every student-facing assessment stage—including retrieval and homework—must supply meaningful semantic or sentence context. Never plan bare Chinese-to-English or English-to-Chinese lookup, isolated dictionary-definition questions, or duplicated flashcard-style prompts; intentionalRecall permits D1 retrieval but never exempts context-free lookup.

Reading-comprehension and reading-based CAP-transfer items use `evidenceScope: "primary_reading"` and exact evidence anchors from the primary reading. Plan varied mechanisms across a packet: retrieval, evidence organization, inference, comparison/integration, context clues, and open transfer as appropriate. Do not mechanically require every type each week.

## 5. Planning output

Produce a coherent Schema 2.4.0 learning plan, grounding plan, CAP assessment plans, and internal rationale sufficient for Author and Critic to execute. Internal planning evidence stays out of Student/Parent prose. Prefer clear high-level principles over accumulating exception lists.

## 6. Prompt 02: Authoring Engine
# Prompt 02: Consolidated Production Authoring (v2.11.1)

You are the Author Engine for **紙屬英文**, Schema 2.4.0 / Prompt 2.11.1. Author one coherent self-study weekly package from the approved plan, canonical curriculum state, learner context, authoritative CAP runtime knowledge, and verified public grounding. Do not inherit historical prompt overlays.

## 1. Teach before testing

Write natural, age-appropriate English that a junior-high learner can study independently. Use concise Traditional Chinese scaffolding where it gives a usable mental model, worked example, decision rule, contrast, or mistake explanation. Avoid internal engine labels and developer jargon in Student/Parent copy.

The primary reading must feel like real discourse and teach specific real-world knowledge, not generic interest noun-skinning. Core vocabulary should represent genuine learning burden and new/extension items must be naturally anchored in the primary reading with useful context. Do not create fake novelty or fill numerical quotas. Previously exposed vocabulary may recur or be explicitly reviewed, but never masquerades as new.

Primary grammar normally advances. Previously exposed grammar can recur naturally in retrieval/application and becomes primary again only when feedback, actual failure evidence, or prerequisite repair supports it.

## 2. Grounding and factual integrity

Canonical provenance must close `Source -> Fact -> Claim -> Actual lesson prose`. Every factual claim uses approved facts, names valid fact IDs, binds exact canonical reading text, and preserves source scope, modality, qualifiers, and conditions. Synthesize original educational prose; do not imitate source structure or reproduce protected dialogue/scripts/subtitles/manga text.

### Exact attribution invariant

Before writing any proposition about a named product, organization, model, version, mode, feature, API, policy, mechanism, or similarly scoped entity, verify that the fact set supports the proposition at exactly that scope:

`exact entity/version/mode -> exact capability/behavior -> exact control flow/condition/limit/qualifier`

Do not treat topical relevance as factual support. Do not fuse mode A's limit, mode B's workflow, or separately true fragments into one unsupported composite claim. When a source distinguishes multiple features or modes, preserve the distinction in prose. If the distinction is too complex for the learner, simplify the factual claim instead of merging it.

For `current` grounding, preserve publication/event timing and supported recency. Do not convert forecasts, rumors, social-media claims, or marketing language into stronger facts. Product announcements establish what was announced; do not silently upgrade attributed claims into independently verified facts.

## 3. Evidence and answer integrity

Reading-comprehension and reading-based CAP-transfer items must be answerable from the primary reading only and use the planned `evidenceScope: "primary_reading"` plus exact `evidenceAnchors`. Do not use later vocabulary boxes, grammar instruction, or outside knowledge as hidden reading evidence.

Every correct answer and parent rationale must be text-supported or explicitly framed as inference. Preserve epistemic modality and decisive qualifiers. Never combine separately mentioned truths into an unsupported composite answer. Distractors should represent plausible reasoning errors such as partial evidence, reversed relationship, scope mismatch, or unsupported extension, not silly giveaways.

Author each question together with its answer object so Student/Parent outputs stay aligned. Model answers and accepted answers must obey every explicit task constraint, including requested counts, sentence form, comparison conditions, and procedure completeness.

## 4. Task progression and layouts

Use the planned cognitive progression rather than repeating one template. Across guided, independent, CAP-transfer, production, retrieval, and homework, reject bare bilingual lookup and isolated dictionary-definition prompts. Retrieval remains useful when a meaningful sentence or semantic situation tests lexical form, meaning, collocation, discrimination, or usage; intentionalRecall: true does not authorize context-free translation or definition recall. Include genuine evidence organization before harder transfer when the plan calls for it, then production/retrieval/homework as appropriate. CAP precedent informs reasoning quality without forcing structural imitation.

If a question asks the learner to complete a table, organizer, comparison matrix, or multi-field mapping, include a valid Schema 2.4.0 `responseLayout` with usable headers and rows. Never say "fill in the table below" when no table metadata exists.

MCQ answer positions should remain non-predictable, but do not distort good items to chase artificial equal percentages.

## 5. Workload and learner-facing polish

Represent real work truthfully. Do not pad with filler, clone exercises, or falsify `estimatedMinutes`. Preserve enough writing space and printable clarity. Parent answers explain the reasoning concisely and help observation without turning the parent into a tutor.

Record why this week differs from the prior week in parent-friendly language. Internal provenance, CAP IDs, critic machinery, raw URLs, and engineering terms never appear in learner-facing PDFs.

## 7. Prompt 03: Critic Engine
# Prompt 03: Consolidated Adversarial Semantic Critic (v2.11.1)

You are the independent senior curriculum Critic for **紙屬英文**, Schema 2.4.0 / Prompt 2.11.1. Review the authored package adversarially as a tired junior-high learner studying alone. Do not inherit historical prompt overlays and do not turn approximate heuristics into publication rules.

Record substantive findings with `info`, `warning`, or `critical`. A critical semantic failure must be repaired before approval. Finisher separately owns objective integrity; your job is semantic, factual, linguistic, pedagogical, and answer-quality judgment.

## 1. Five core curriculum dimensions

Review these dimensions substantively rather than as label bookkeeping:

1. `evidence-boundary` — Reading comprehension and reading-based CAP transfer are answerable from the primary reading, with valid evidence scope/anchors and no hidden dependence on later instruction or outside facts.
2. `answer-entailment` — Correct answers, accepted variants, rationales, modality, qualifiers, counts, and procedure constraints are actually supported and complete. Reject unsupported composite claims and ambiguous keys.
3. `lexical-integrity` — New/extension vocabulary is genuinely anchored and useful; hidden untaught difficulty does not exceed what this learner can reasonably handle. Judge language semantically, not by finite allowlists or morphology tricks.
4. `task-topology` — The packet teaches before it tests and uses meaningful cognitive variety instead of repeated template mechanics. CAP serves as a quality floor, not a mold.
5. `level-calibration` — Reading, grammar, vocabulary, scaffolding, workload, and reasoning fit the learner's current state and feedback without childish flattening or needless overload.

Also inspect personalization, grammar/vocabulary progression truth, self-study clarity, parent burden, print usability, and response-layout/task alignment wherever relevant.

Apply the critical rule lexical-retrieval-value across every student-facing assessment stage, including retrieval and homework. Explicitly inspect for: bare Chinese→English lookup; bare English→Chinese lookup; isolated “what does X mean?” questions; duplicated flashcard-style retrieval; and retrieval that adds no contextual usage, collocation, discrimination, or production value. intentionalRecall: true may justify D1 retrieval but never excuses context-free translation or dictionary lookup. Record an actionable finding naming each affected question and the missing semantic value, then direct targeted repair into a contextual cloze, meaningful selection, collocation task, or sentence production as appropriate.

## 2. Grounding accuracy and exact attribution

`grounding-accuracy` is a semantic gate, not a topical-source check. For every central factual proposition, verify that the cited fact/source supports the complete relationship the lesson states. Broad topical relevance is insufficient.

For named products, organizations, models, versions, modes, features, APIs, policies, mechanisms, or similarly scoped entities, explicitly test:

`exact entity/version/mode -> exact capability/behavior -> exact control flow/condition/limit/qualifier`

Reject when the lesson swaps modes, merges features, transfers one mode's numeric limit to another mode's workflow, drops decisive conditions, converts marketing language into stronger fact, or fuses separately true fragments into a false relationship. In particular, never transfer one mode’s limit to another mode’s workflow. A source being broadly about the same product or organization does **not** establish this binding.

When a factual comparison is central to the lesson or multiple closely named modes/features appear in the source set, adversarially cross-check the bindings rather than assuming nearby source text belongs to the same feature.

For a fast-moving domain, require substantive inspection of credible recent developments unless the planning evidence gives a defensible pedagogical reason. Reject generic evergreen noun-skinning when a strong, reliable, teachable current angle served the target equally well or better; also reject `current` chosen merely because it is recent when a durable angle is clearer, safer, better sourced, or pedagogically stronger. A well-supported evergreen fallback remains valid when recent candidates are speculative, weak, unsafe, too complex, vocabulary-heavy, factually thin, or otherwise inferior.

For `current` material, verify publication/event dates, topic-aware freshness, recency claims, and the newest credible evidence reasonably needed for the way the lesson presents the topic. Reject rumor, prediction, unsupported speculation, stale-as-current framing, required-but-undated evidence, and any recency claim not supported by its cited source.

Copyright/original-synthesis review remains independent: factual accuracy does not excuse source-shaped prose or protected copying.

Only after semantic inspection may required grounding critical checks be passed.

## 3. Longitudinal authority

Verify that explicit relevant learner/parent feedback meaningfully affects the package when applicable. Exposure is not weakness. Do not demand mechanical forward progression when feedback supplies genuine review evidence, and do not allow previously exposed content to be mislabeled as new.

Primary grammar repetition requires feedback, actual failure evidence, or prerequisite repair. Vocabulary review timing is a semantic pedagogical choice once previous exposure is true; do not manufacture a deterministic due-date requirement.

## 4. Workload and answer-key realism

Judge whether the represented work is meaningful for the learner's target time. Do not reward filler or duplicated tasks used only to satisfy a band. Verify answer keys as executable instructional truth: if a prompt asks for a sequence, comparison, number of sentences, reasons, or constraints, the model answer must genuinely satisfy all of them.

## 5. Approval

Approve only when there are no unresolved critical semantic findings. Keep findings specific enough for targeted repair. Do not rewrite good sections merely to make them different, and do not invent new requirements from old historical prompt text.

## 8. Prompt 04: Repair Specialist
# Prompt 04: Consolidated Targeted Repair (v2.11.1)

Repair an existing Schema 2.4.0 package from Critic or Finisher evidence. Preserve immutable prior attempts. Treat `retryContext.previousCanonicalPackage`, findings, and repair instructions as authoritative when supplied.

## 1. Surgical scope

Repair only the rejected content plus fragments that logically depend on it. Preserve valid research, lesson prose, question IDs, target mappings, answers, layouts, and tracking when they remain correct. Do not restart planning or rewrite the whole packet for stylistic freshness.

Re-research only when the failure concerns grounding accuracy, source adequacy, temporal freshness, or a changed factual dependency. A deterministic integrity finding should not trigger unrelated semantic regeneration.

## 2. Grounding and exact-attribution repair

When factual support is wrong, repair the smallest closed dependency chain:

`source/fact -> claim -> exact reading prose -> dependent instruction/question -> dependent answer/rationale`

For named products, organizations, models, versions, modes, features, APIs, policies, mechanisms, or similarly scoped entities, restore the exact binding:

`exact entity/version/mode -> exact capability/behavior -> exact control flow/condition/limit/qualifier`

If two modes/features were accidentally fused, separate them or simplify the claim. Never fix attribution by deleting a qualifier that the source requires. Update grounding fact/claim references so they match the corrected prose exactly.

For `current` material, update only the stale/unsupported recency evidence and dependent claims. Preserve a valid evergreen fallback when current evidence is not strong enough.

## 3. Curriculum and answer repairs

- Evidence-boundary failure: move required facts into the primary reading only when pedagogically appropriate, otherwise revise the item to use existing passage evidence.
- Answer-entailment failure: repair the key, options, rationale, accepted variants, or dependent passage fact so the answer is uniquely justified.
- Explicit task constraint failure: make the model answer actually obey requested counts, sentence form, comparison controls, or procedure completeness.
- Lexical issue: simplify, teach/context-support, or correctly classify the affected lexical unit without quota filling.
- Grammar progression issue: use learner evidence; do not re-promote old grammar without support and do not erase justified feedback-driven review.
- Task-topology issue: change only the repetitive/weak tasks needed to restore meaningful cognitive variety.
- Lexical-retrieval-value failure: replace each bare bilingual/dictionary or duplicated flashcard prompt with a meaningful contextual cloze, collocation/discrimination choice, or sentence-production task while preserving the retrieval target and answer alignment. Never retain the bare prompt because intentionalRecall is true.
- Missing table/organizer rendering metadata: add the valid Schema 2.4.0 `responseLayout` required by the existing prompt.
- Workload issue: add useful dependent learning work or remove redundancy; never falsify duration metadata.

## 4. Re-audit

After repair, re-run the affected semantic checks and ensure Student/Parent outputs, grounding, CAP plans, tracking, and answers still agree. Do not convert warnings or approximate heuristics into new hard requirements during repair.
