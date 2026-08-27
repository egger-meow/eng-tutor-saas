# CAP English Exam Assessment Design Blueprint

> **Taiwan Junior High Comprehensive Assessment Program (國中教育會考英語科)**
> **Historical Knowledge Base Digest (5-Year Multi-Exam Synthesis)**

---

## 1. Executive Summary

This blueprint captures the core psychometric and pedagogical architecture reverse-engineered across 5 official CAP English Reading exams (**5 exams, 195 non-holdout analyzed questions**).

### Core Quantitative Targets:
- **Total Questions per Exam**: Exactly 43 items (19–23 Single Questions, 20–24 Passage Questions).
- **Passage Sets per Exam**: Exactly 8 reading sets per year spanning multi-modal authentic genres.
- **Cognitive Depth Distribution**:
  - Direct Retrieval (`D1`): ~22.6% (mostly Section 1)
  - Single-Step Inference (`D2`): ~60%
  - Multi-Step Synthesis (`D3`): ~17.4%
  - Evaluative / Pragmatic (`D4`): ~10%
- **Evidence Necessity**: 100% of Section 2 reading items have **essential** evidence necessity.

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
- **Evidence Necessity**: `none` for pure text items; `essential` for visual Question #1.

### Section 2: Passage Clusters (第二部分：題組)
- **Item Count**: 20–24 questions across exactly 8 reading sets.
- **Passage Genres**:
  1. **Notices & Schedules**: Brochures, museum flyers, ticket timetables, promotional notices.
  2. **Everyday Dialogues**: Phone calls, peer conversations, interview transcripts.
  3. **Narratives & Stories**: Life stories, historical anecdotes, reflective fiction.
  4. **Informational Articles**: Science, culture, nature, global phenomena, history.
  5. **Infographics & Charts**: Multi-modal diagrams, statistics, comparative graphs, maps.
  6. **Cloze Passages**: Cohesive narrative or exposition testing tense flow and transitions.
- **Evidence Necessity**: `essential` (passage reading is strictly required).

---

## 4. Reusable Question Recipes

### RECIPE_CLOZE_DISCOURSE_AND_TENSE_FLOW: Cloze Discourse Architecture & Tense Flow Tracker
- **Primary Skill**: `grammar_in_context`
- **Supported Genres**: `cloze_passage`
- **Cognitive Depth**: `D2_single_step_inference`, `D3_multi_step_synthesis`
- **Evidence Span**: `cross_sentence_local`
- **Evidence Support**: 19 items across 5 years (Years: 111, 112, 113, 114, 115)
- **Reasoning Operations**: cross_sentence_coreference, hypothesis_elimination, evidence_synthesis, Follow narrative setup: King gives boiled seeds to all children to grow plants, Track plot twist: Boiled seeds cannot grow; other children cheated and replaced seeds with flowering plants, Analyze Wong's behavior: Wong watered his pot diligently but brought an empty pot with honesty
- **Stem Templates**:
  * *"(Cloze blank 40)"*
  * *"(Cloze blank 41)"*
  * *"(Cloze blank 42)"*
  * *"(Cloze blank 43)"*
- **Distractor Mechanisms**: `literal_keyword_matching`, `partial_truth`, `wrong_referent`, `wrong_chronology`, `unsupported_world_knowledge`, `grammatically_plausible_contextually_wrong`, `irrelevant_distractor`, `reversed_cause_effect`
- **Quality Checks**:
  * Correct tense/connective must be determined by earlier or subsequent sentences
  * All 4 options must be grammatically valid in isolation


### RECIPE_INFOGRAPHIC_CROSS_MODAL_RECONCILER: Infographic, Chart & Diagram Cross-Modal Reconciler
- **Primary Skill**: `explicit_detail`
- **Supported Genres**: `infographic_chart_table`
- **Cognitive Depth**: `D2_single_step_inference`, `D3_multi_step_synthesis`
- **Evidence Span**: `multimodal_text_and_graphic`
- **Evidence Support**: 20 items across 3 years (Years: 111, 113, 115)
- **Reasoning Operations**: cross_sentence_coreference, hypothesis_elimination, evidence_synthesis, Identify Amanda kitchen fruit inventory: apples, bananas, oranges, papayas, pears, strawberries, Read the recipe callout Note: "Most fruits are good for making fruit tea, but not papayas or bananas", Apply negative constraint to eliminate candidate options containing bananas or papayas
- **Stem Templates**:
  * *"What does Tea-Rock celebrate? th"*
  * *"Here is the postcard {Character} is going to send to Tea-Rock 20. What else does he need to put on the postcard before he sends it?"*
  * *"What can we learn about sugar from the infographic?"*
  * *"What can be a reason why the list of “Sugar that is hidden in foods and drinks” is put in the infographic?"*
- **Distractor Mechanisms**: `wrong_chronology`, `unsupported_world_knowledge`, `grammatically_plausible_contextually_wrong`, `literal_keyword_matching`, `partial_truth`, `wrong_referent`, `reversed_cause_effect`, `irrelevant_distractor`
- **Quality Checks**:
  * If the graphic is removed, the question must become unanswerable
  * Distractors must reflect genuine visual coordinates with altered labels


### RECIPE_INFORMATIONAL_EXPLICIT_DETAIL_PARAPHRASE: Informational Article Detail & Proposition Verification
- **Primary Skill**: `explicit_detail`
- **Supported Genres**: `article_informational`, `narrative`
- **Cognitive Depth**: `D2_single_step_inference`
- **Evidence Span**: `cross_sentence_local`
- **Evidence Support**: 43 items across 5 years (Years: 111, 112, 113, 114, 115)
- **Reasoning Operations**: cross_sentence_coreference, hypothesis_elimination, evidence_synthesis
- **Stem Templates**:
  * *"Which idea is talked about in the first paragraph of the reading?"*
  * *"Who might find that Tabata training is right for them?"*
  * *"Which is true about Tabata training?"*
  * *"What does Cameroon’s government most likely think of Ambazonia?"*
- **Distractor Mechanisms**: `wrong_chronology`, `unsupported_world_knowledge`, `grammatically_plausible_contextually_wrong`, `literal_keyword_matching`, `partial_truth`, `wrong_referent`
- **Quality Checks**:
  * Correct answer must be an authentic paraphrase of the stated passage evidence
  * Distractors must use true entities with altered predicates or inverted scopes


### RECIPE_INFORMATIONAL_LOCAL_AND_GLOBAL_INFERENCE: Informational Article Deductive Inference & Clue Synthesis
- **Primary Skill**: `local_inference`
- **Supported Genres**: `article_informational`, `narrative`
- **Cognitive Depth**: `D3_multi_step_synthesis`
- **Evidence Span**: `cross_sentence_local`
- **Evidence Support**: 21 items across 5 years (Years: 111, 112, 113, 114, 115)
- **Reasoning Operations**: cross_sentence_coreference, hypothesis_elimination, evidence_synthesis
- **Stem Templates**:
  * *"Why did Darrell tell Marina to go to Pinterest ?"*
  * *"There are four important points in the report: a. What “No Overtime Day” is b. Why “No Overtime Day” fails c. Why there is “No Overtime Day” in the country d. How workers deal with “No Overtime Day” How are they ordered in the report?"*
  * *"What does this mean in the report?"*
  * *"What can we learn from Figure 1 and Figure 2?"*
- **Distractor Mechanisms**: `wrong_chronology`, `unsupported_world_knowledge`, `grammatically_plausible_contextually_wrong`, `literal_keyword_matching`, `partial_truth`, `wrong_referent`
- **Quality Checks**:
  * Must require bridging at least two stated facts in the text
  * Distractors must target common unwarranted deductive leaps


### RECIPE_INFORMATIONAL_MAIN_IDEA_AND_PURPOSE: Informational Article Main Idea & Rhetorical Purpose Synthesis
- **Primary Skill**: `main_idea`
- **Supported Genres**: `article_informational`, `narrative`
- **Cognitive Depth**: `D3_multi_step_synthesis`
- **Evidence Span**: `multi_paragraph_global`
- **Evidence Support**: 1 items across 1 years (Years: 114)
- **Reasoning Operations**: cross_sentence_coreference, hypothesis_elimination, evidence_synthesis
- **Stem Templates**:
  * *"What is the reading mainly about?"*
- **Distractor Mechanisms**: `wrong_chronology`, `unsupported_world_knowledge`, `grammatically_plausible_contextually_wrong`
- **Quality Checks**:
  * Every distractor should reflect a true local detail from one paragraph of the passage
  * The correct option must encompass the global theme of the passage


### RECIPE_SINGLE_LEXICAL_COMMUNICATIVE_COLLOCATION: Standalone Communicative Lexical Gap Drill
- **Primary Skill**: `vocabulary_in_context`
- **Supported Genres**: `single_standalone`
- **Cognitive Depth**: `D1_verbatim_retrieval`
- **Evidence Span**: `single_sentence`
- **Evidence Support**: 44 items across 5 years (Years: 111, 112, 113, 114, 115)
- **Reasoning Operations**: syntactic_parsing, lexical_semantic_matching
- **Stem Templates**:
  * *"{Character} is afraid of the dark. He even leaves the _____ on when sleeping."*
  * *"Pam is a _____ baseball player; she has more fans than any other player on her team."*
  * *"It was _____ for us to answer the math question because we’ve done the same kind of questions many times."*
  * *"Don’t let the children swim in the river. We don’t know how _____ it is. It could be dangerous."*
- **Distractor Mechanisms**: `wrong_chronology`, `unsupported_world_knowledge`, `grammatically_plausible_contextually_wrong`, `literal_keyword_matching`, `partial_truth`, `wrong_referent`
- **Quality Checks**:
  * All 4 options must belong to the exact same grammatical word class
  * Scenario must clearly disambiguate the correct word without world knowledge assumptions


### RECIPE_SINGLE_SYNTACTIC_AGREEMENT_LICENSING: Standalone Syntactic Agreement & Clause Licensing Drill
- **Primary Skill**: `grammar_in_context`
- **Supported Genres**: `single_standalone`
- **Cognitive Depth**: `D2_single_step_inference`
- **Evidence Span**: `single_sentence`
- **Evidence Support**: 47 items across 5 years (Years: 111, 112, 113, 114, 115)
- **Reasoning Operations**: syntactic_parsing, lexical_semantic_matching
- **Stem Templates**:
  * *"The movie starts at two o’clock, _____ let’s meet at the theater at one forty-five."*
  * *"I did not do my homework, so my teacher said I _____ stay after school to finish it."*
  * *"Kevin has only enough money for the bag or the shoes. That is a hard _____ to make because he likes them both."*
  * *"Although it took me lots of time _____ a big meal for ten people, I was happy that everyone enjoyed it."*
- **Distractor Mechanisms**: `literal_keyword_matching`, `partial_truth`, `wrong_referent`, `wrong_chronology`, `unsupported_world_knowledge`, `grammatically_plausible_contextually_wrong`
- **Quality Checks**:
  * Ensure sentence provides an explicit syntactic trigger
  * Distractors must represent common student developmental grammar errors


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
