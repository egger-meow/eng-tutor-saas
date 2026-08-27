# CAP English Exam Assessment Design Blueprint

> **Taiwan Junior High Comprehensive Assessment Program (國中教育會考英語科)**
> **Historical Knowledge Base Digest (5-Year Multi-Exam Synthesis)**

---

## 1. Executive Summary

This blueprint captures the core psychometric and pedagogical architecture reverse-engineered across 5 official CAP English Reading exams (**5 exams, 215 total questions**).

### Core Quantitative Targets:
- **Total Questions per Exam**: Exactly 43 items (19–23 Single Questions, 20–24 Passage Questions).
- **Passage Sets per Exam**: Exactly 8 reading sets per year spanning multi-modal authentic genres.
- **Cognitive Depth Distribution**:
  - Direct Retrieval (`D1`): ~23.3% (mostly Section 1)
  - Single-Step Inference (`D2`): ~59.5%
  - Multi-Step Synthesis (`D3`): ~17.2%
  - Evaluative / Pragmatic (`D4`): ~10%
- **Context Necessity**: 100% of Section 2 reading items have **essential** context necessity.

---

## 2. Decoupling Principle: Language Difficulty ≠ Cognitive Depth

CAP English exams achieve high psychometric discrimination **NOT** by introducing obscure university-level vocabulary, but by designing questions that require **multi-step reasoning within a junior-high lexical ceiling (1200 + 800 words)**.

```text
High Cognitive Depth (D3/D4) + Elementary/Basic Language (A1/A2)
= The Gold Standard of Junior High Assessment
```

---

## 3. Section Composition & Architecture

### Section 1: Single Questions (第一部分：單題)
- **Item Count**: 19–23 questions
- **Focus**:
  - High-frequency lexical collocations in single-sentence context.
  - Core grammar: tense alignment, modals, conjunctions, relative pronouns, passive voice.
  - Visual image item (Question #1 is always an image-action recognition item).
- **Context Necessity**: `none` (standalone items).

### Section 2: Passage Clusters (第二部分：題組)
- **Item Count**: 20–24 questions across exactly 8 reading sets.
- **Passage Genres**:
  1. **Notices & Schedules**: Brochures, museum flyers, ticket timetables, promotional notices.
  2. **Everyday Dialogues**: Phone calls, peer conversations, interview transcripts.
  3. **Narratives & Stories**: Life stories, historical anecdotes, reflective fiction.
  4. **Informational Articles**: Science, culture, nature, global phenomena, history.
  5. **Infographics & Charts**: Multi-modal diagrams, statistics, comparative graphs, maps.
  6. **Cloze Passages**: Cohesive narrative or exposition testing tense flow and transitions.
- **Context Necessity**: `essential` (passage reading is strictly required).

---

## 4. Reusable Question Recipes

### RECIPE_01_NOTICE_SCHEDULE_DETAIL: Authentic Notice & Schedule Constraint Scanner
- **Primary Skill**: `explicit_detail`
- **Target Genre**: `notice_announcement`
- **Cognitive Depth**: `D2_single_step_inference`, `D3_multi_step_synthesis`
- **Evidence Span**: `cross_sentence_local`
- **Reasoning Operations**: constraint_satisfaction, temporal_filtering, elimination_by_rule
- **Stem Templates**:
  * *"Which question can the brochure answer?"*
  * *"What should Jason do before he visits the {place}?"*
  * *"According to the schedule, when can visitors {action}?"*
- **Distractor Mechanisms**: `partial_truth`, `wrong_chronology`, `literal_keyword_matching`
- **Quality Checks**:
  * Ensure the correct option satisfies all constraints mentioned in the stem (e.g. time AND price AND location)
  * Ensure distractors represent partial conditions stated in the notice


### RECIPE_02_DIALOGUE_PRAGMATIC_INFERENCE: Conversational Implicature & Subtext Resolver
- **Primary Skill**: `pragmatic_meaning`
- **Target Genre**: `dialogue`
- **Cognitive Depth**: `D3_multi_step_synthesis`, `D4_evaluative_pragmatic`
- **Evidence Span**: `cross_sentence_local`
- **Reasoning Operations**: implicature_derivation, tone_analysis, speaker_perspective_taking
- **Stem Templates**:
  * *"What does {Speaker} most likely mean when saying "{Quote}"?"*
  * *"How does {Speaker} feel about {Topic}?"*
  * *"What can we learn about {Speaker} from their conversation?"*
- **Distractor Mechanisms**: `literal_keyword_matching`, `wrong_referent`, `unsupported_world_knowledge`
- **Quality Checks**:
  * Verify that the dialogue provides at least 2 distinct turns of conversational context
  * Confirm that resolving the quote requires situational awareness, not dictionary lookup


### RECIPE_03_NARRATIVE_THEME_ARC: Narrative Arc & Core Message Abstractor
- **Primary Skill**: `main_idea`
- **Target Genre**: `narrative`
- **Cognitive Depth**: `D3_multi_step_synthesis`
- **Evidence Span**: `multi_paragraph_global`
- **Reasoning Operations**: thematic_abstraction, global_gist_synthesis, scope_evaluation
- **Stem Templates**:
  * *"What is the story mainly about?"*
  * *"What lesson did {Character} learn at the end?"*
  * *"What does the writer want to tell readers through this story?"*
- **Distractor Mechanisms**: `local_evidence_for_global_question`, `partial_truth`, `overgeneralization`
- **Quality Checks**:
  * Every distractor should reflect a true local detail from one paragraph of the story
  * The correct option must encompass the arc transformation from beginning to end


### RECIPE_04_INFOGRAPHIC_MULTIMODAL_INTEGRATION: Infographic & Visual Data Reconciler
- **Primary Skill**: `information_integration`
- **Target Genre**: `infographic_chart_table`
- **Cognitive Depth**: `D2_single_step_inference`, `D3_multi_step_synthesis`
- **Evidence Span**: `multimodal_text_and_graphic`
- **Reasoning Operations**: cross_modal_mapping, coordinate_matching, constraint_synthesis
- **Stem Templates**:
  * *"What can we learn from Figure 1 and the reading?"*
  * *"Which map/picture best shows the situation in {Year/Place}?"*
  * *"Based on the chart, which statement is true?"*
- **Distractor Mechanisms**: `reversed_cause_effect`, `wrong_chronology`, `partial_truth`
- **Quality Checks**:
  * Context necessity test: If the chart is removed, the question must become unanswerable
  * Distractors should match real visual elements from the graphic with incorrect labels


### RECIPE_05_CONTEXTUAL_VOCABULARY_DEDUCER: Contextual Word Sense Deducer
- **Primary Skill**: `vocabulary_in_context`
- **Target Genre**: `article_informational`
- **Cognitive Depth**: `D2_single_step_inference`, `D3_multi_step_synthesis`
- **Evidence Span**: `cross_sentence_local`
- **Reasoning Operations**: semantic_field_triangulation, contrast_clue_extraction, co_text_synthesis
- **Stem Templates**:
  * *"What does "{TargetWord}" mean in the reading?"*
  * *"In paragraph {N}, what is the meaning of "{TargetWord}"?"*
- **Distractor Mechanisms**: `literal_keyword_matching`, `unsupported_world_knowledge`, `grammatically_plausible_contextually_wrong`
- **Quality Checks**:
  * Verify that surrounding sentences provide at least 2 clear semantic clues (contrast, cause, example)
  * Ensure all options A, B, C, D use simple, familiar vocabulary so the test measures inference


### RECIPE_06_CLOZE_DISCOURSE_AND_TENSE_FLOW: Cloze Discourse & Tense Architecture Tracker
- **Primary Skill**: `grammar_in_context`
- **Target Genre**: `cloze_passage`
- **Cognitive Depth**: `D2_single_step_inference`, `D3_multi_step_synthesis`
- **Evidence Span**: `cross_sentence_local`
- **Reasoning Operations**: temporal_timeline_alignment, syntactic_licensing, discourse_cohesion
- **Stem Templates**:
  * *"Blank {N} in the passage: (A) {OptionA} (B) {OptionB} (C) {OptionC} (D) {OptionD}"*
- **Distractor Mechanisms**: `grammatically_plausible_contextually_wrong`, `wrong_chronology`, `reversed_cause_effect`
- **Quality Checks**:
  * Ensure the correct tense or connective is determined by earlier or subsequent sentences in the paragraph
  * All 4 options must be grammatically valid in isolation to test contextual choice


---

## 5. Weak Question Anti-Patterns

### [CRITICAL] ANTI_01_DECORATIVE_CONTEXT: Decorative Context Trap (Context-Independent Exercise)
- **Description**: A passage or dialogue is presented, but the question stem can be answered using general knowledge or isolated grammar without reading the context.
- **Diagnostic Test**: Delete the entire passage. If a student can still determine the correct answer with >90% confidence, the context is decorative.
- **Corpus Evidence**: In CAP exams, 100% of passage questions exhibit essential context necessity: reading the passage is strictly mandatory.
- **Repair Strategy**: Embed unique scenario constraints, character decisions, or data points inside the text that must be referenced to resolve the stem.


### [HIGH] ANTI_02_SHALLOW_DICTIONARY_RECALL: Dictionary Definition Recall Disguised as Reading Comprehension
- **Description**: Testing whether a student memorized an isolated definition rather than measuring contextual inference ability.
- **Diagnostic Test**: Can the meaning of the target word be deduced if replaced with a nonsense word like "flurg"? If not, it tests prior recall, not reading.
- **Corpus Evidence**: CAP vocabulary-in-context questions always embed explicit contrastive, causal, or illustrative clues in surrounding sentences.
- **Repair Strategy**: Provide explicit contextual scaffolding (e.g. antonyms, examples, cause-and-effect outcomes) in the text allowing deduction.


### [HIGH] ANTI_03_OPTION_ASYMMETRY_GIVEAWAY: Option Length & Grammatical Asymmetry Giveaway
- **Description**: The correct option is visibly longer, more detailed, or structured differently than the distractors, revealing the answer by format.
- **Diagnostic Test**: Check word counts and syntactic structures of options A, B, C, D. Standard deviation in length should be minimal.
- **Corpus Evidence**: CAP exams maintain parallel syntactic structure and closely matched word lengths across all four choices.
- **Repair Strategy**: Ensure all four options share the same grammatical part of speech, phrasing complexity, and length profile.


### [MODERATE] ANTI_04_TRIVIAL_SURFACE_COPY: Trivial Verbatim Surface Copy (Zero-Depth Matching)
- **Description**: Stem and correct option match the exact words in the text verbatim, enabling mechanical visual scanning without understanding.
- **Diagnostic Test**: Does solving the question require paraphrase recognition or inference? If pure optical string matching suffices, cognitive depth is near zero.
- **Corpus Evidence**: CAP questions consistently paraphrase text concepts in stems and options rather than using identical raw strings.
- **Repair Strategy**: Use natural synonyms and conceptual paraphrases in the options to require semantic comprehension.


### [HIGH] ANTI_05_LEXICAL_INFLATION_OVERLOAD: Lexical Difficulty Inflation as Artificial Challenge
- **Description**: Making a question difficult by injecting obscure, out-of-syllabus vocabulary rather than requiring sophisticated reasoning.
- **Diagnostic Test**: Inspect question vocabulary against the 1200+800 syllabus list. If difficulty stems from unknown words rather than cognitive depth, it fails.
- **Corpus Evidence**: CAP exams maintain strict A2/B1 lexical ceiling while achieving high psychometric discrimination through multi-step reasoning.
- **Repair Strategy**: Keep vocabulary strictly within syllabus bounds; increase cognitive depth through multi-paragraph synthesis and subtle distractors.


---

## 6. Guidelines for Future Question Planners

1. **Plan Mechanics Before Prose**: Select a specific recipe, cognitive depth target, and distractor profile before writing article text.
2. **Enforce Strict Context Necessity**: Never generate a comprehension question where the context can be skipped.
3. **Plausible Misconceptions as Distractors**: Distractors must represent plausible student reading errors (partial truth, keyword scanning traps, referent confusion), never absurd decoys.
4. **Honor the Lexical Ceiling**: Use declared core vocabulary for challenges; do not sneak in ungrounded difficult words to artificially raise question difficulty.
