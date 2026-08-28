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
  - Direct Retrieval (`D1`): ~6.7% (mostly Section 1)
  - Single-Step Inference (`D2`): ~68.7%
  - Multi-Step Synthesis (`D3`): ~22.6%
  - Evaluative / Pragmatic (`D4`): ~2.1%
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
- **Cognitive Depth**: `D2_single_step_inference`, `D3_multi_step_synthesis`, `D1_verbatim_retrieval`, `D4_evaluative_pragmatic`
- **Evidence Span**: `cross_sentence_local`
- **Evidence Support**: 19 items across 5 years (Years: 111, 112, 113, 114, 115)
- **Reasoning Operations**: The words and sentences that follow are examples of palindromes, so “for example” correctly introduces the list., Test each alternative against the same grammatical, semantic, discourse, and source constraints before selecting., An anagram must reuse exactly the same letters in a different order; “it makes” can be rearranged to “me steak,” so option C forms the valid pair required by the missing table/example., Turning the ordinary word “restaurant” into the odd sentence “Eat rats, run!” is funny because the resulting meaning is strange, so “strange” fits., The next sentences show palindromes used in mathematics and music and anagrams used to hide studies, proving they are more than just games., Use the next sentence explaining that Katz's quiz asked what words people use for something.
- **Stem Templates**:
  * *"(Cloze blank 40)"*
  * *"(Cloze blank 41)"*
  * *"(Cloze blank 42)"*
  * *"(Cloze blank 43)"*
- **Distractor Mechanisms**: `grammatically_plausible_contextually_wrong`, `partial_truth`, `unsupported_world_knowledge`, `local_evidence_for_global_question`, `literal_keyword_matching`, `overgeneralization`, `wrong_referent`, `other`, `reversed_cause_effect`, `wrong_chronology`
- **Quality Checks**:
  * Correct tense/connective must be determined by earlier or subsequent sentences
  * All 4 options must be grammatically valid in isolation


### RECIPE_INFOGRAPHIC_CROSS_MODAL_RECONCILER: Infographic, Chart & Diagram Cross-Modal Reconciler
- **Primary Skill**: `information_integration`
- **Supported Genres**: `infographic_chart_table`
- **Cognitive Depth**: `D2_single_step_inference`, `D3_multi_step_synthesis`, `D1_verbatim_retrieval`, `D4_evaluative_pragmatic`
- **Evidence Span**: `multimodal_text_and_graphic`
- **Evidence Support**: 30 items across 5 years (Years: 111, 112, 113, 114, 115)
- **Reasoning Operations**: The ad thanks customers for “Twenty Summers & Winters,” which marks Tea-Rock’s twentieth year in business., Test each alternative against the same grammatical, semantic, discourse, and source constraints before selecting., The instructions require name, birthday, telephone number, e-mail address, favorite tea, and two tea-cup pictures. Jason’s postcard already has everything except his birthday., The infographic shows fewer sugar-spoon icons for 400 ml rice milk than for 400 ml grape juice, so rice milk contains less sugar., The “hidden sugar” list reveals substantial sugar in ordinary foods and drinks, supporting the warning that people may consume more sugar than they realize., Figure 2 shows the men’s and women’s lines meeting at roughly the same percentage around 2,200 annual hours, so their advancement/pay chances are almost the same there.
- **Stem Templates**:
  * *"What does Tea-Rock celebrate?"*
  * *"Here is the postcard {Character} is going to send to Tea-Rock 20. What else does he need to put on the postcard before he sends it?"*
  * *"What can we learn about sugar from the infographic?"*
  * *"What can be a reason why the list of “Sugar that is hidden in foods and drinks” is put in the infographic?"*
- **Distractor Mechanisms**: `partial_truth`, `unsupported_world_knowledge`, `other`, `undergeneralization`, `literal_keyword_matching`, `overgeneralization`, `wrong_referent`, `reversed_cause_effect`, `local_evidence_for_global_question`, `irrelevant_distractor`, `wrong_chronology`
- **Quality Checks**:
  * If the graphic is removed, the question must become unanswerable
  * Distractors must reflect genuine visual coordinates with altered labels


### RECIPE_INFORMATIONAL_EXPLICIT_DETAIL_PARAPHRASE: Informational Article Detail & Proposition Verification
- **Primary Skill**: `explicit_detail`
- **Supported Genres**: `article_informational`, `narrative`
- **Cognitive Depth**: `D2_single_step_inference`, `D1_verbatim_retrieval`, `D3_multi_step_synthesis`, `D4_evaluative_pragmatic`
- **Evidence Span**: `cross_sentence_local`
- **Evidence Support**: 40 items across 5 years (Years: 111, 112, 113, 114, 115)
- **Reasoning Operations**: The first paragraph explains the Tabata cycle: exercise 20 seconds, rest 10 seconds, repeat at least eight times, plus examples of moves. That is how to do the training., Test each alternative against the same grammatical, semantic, discourse, and source constraints before selecting., The passage explicitly says, “You can decide yourself what moves to do,” so users are free to choose their own moves., The report first establishes the long-hours problem and why companies created No Overtime Day (c), then defines the policy (a), describes workers’ workarounds (d), and finally explains the incentive that makes the policy fail (b)., In “Clearly, this must be changed,” “this” refers to the immediately preceding practice of using long working hours as a signal that workers are hard-working., English speakers feel excluded from jobs and official life and then decide to fight for themselves; this context makes “resentful” closest to angry.
- **Stem Templates**:
  * *"Which idea is talked about in the first paragraph of the reading?"*
  * *"Which is true about Tabata training?"*
  * *"There are four important points in the report: a. What “No Overtime Day” is b. Why “No Overtime Day” fails c. Why there is “No Overtime Day” in the country d. How workers deal with “No Overtime Day” How are they ordered in the report?"*
  * *"What does this mean in the report?"*
- **Distractor Mechanisms**: `wrong_chronology`, `unsupported_world_knowledge`, `partial_truth`, `wrong_referent`, `reversed_cause_effect`, `undergeneralization`, `irrelevant_distractor`, `local_evidence_for_global_question`, `overgeneralization`, `literal_keyword_matching`, `other`, `grammatically_plausible_contextually_wrong`
- **Quality Checks**:
  * Correct answer must be an authentic paraphrase of the stated passage evidence
  * Distractors must use true entities with altered predicates or inverted scopes


### RECIPE_INFORMATIONAL_LOCAL_AND_GLOBAL_INFERENCE: Informational Article Deductive Inference & Clue Synthesis
- **Primary Skill**: `local_inference`
- **Supported Genres**: `article_informational`, `narrative`
- **Cognitive Depth**: `D2_single_step_inference`, `D3_multi_step_synthesis`
- **Evidence Span**: `cross_sentence_local`
- **Evidence Support**: 6 items across 3 years (Years: 111, 112, 113)
- **Reasoning Operations**: The passage warns that Tabata may not suit people who seldom exercise, while recommending it for busy people who enjoy exercising, so an existing exercise habit is the best fit., Test each alternative against the same grammatical, semantic, discourse, and source constraints before selecting., Police tried to stop the independence meeting and people were killed, strongly implying the Cameroon government rejects the English speakers’ claim that Ambazonia is a separate country., Use the successful case: after dropping about 6 cm, the mosquito can roll off and fly away., Integrate the failure case: if it is flying too low when hit, there is not enough time to escape before hitting the ground., Read the father's quoted protest as evidence of his grievance.
- **Stem Templates**:
  * *"Who might find that Tabata training is right for them?"*
  * *"What does Cameroon’s government most likely think of Ambazonia?"*
  * *"When would it be dangerous for a mosquito in the rain?"*
  * *"Why was Philip’s father angry?"*
- **Distractor Mechanisms**: `unsupported_world_knowledge`, `partial_truth`, `reversed_cause_effect`, `literal_keyword_matching`, `other`, `irrelevant_distractor`
- **Quality Checks**:
  * Must require bridging at least two stated facts in the text
  * Distractors must target common unwarranted deductive leaps


### RECIPE_INFORMATIONAL_MAIN_IDEA_AND_PURPOSE: Informational Article Main Idea & Rhetorical Purpose Synthesis
- **Primary Skill**: `purpose_speaker_intent`
- **Supported Genres**: `article_informational`, `narrative`
- **Cognitive Depth**: `D2_single_step_inference`, `D3_multi_step_synthesis`, `D1_verbatim_retrieval`
- **Evidence Span**: `multi_paragraph_global`
- **Evidence Support**: 9 items across 5 years (Years: 111, 112, 113, 114, 115)
- **Reasoning Operations**: Marina lacks ideas for a future-house art assignment, and Darrell recommends Pinterest because people share their work and methods there, giving her examples and ideas., Test each alternative against the same grammatical, semantic, discourse, and source constraints before selecting., Integrate the second paragraph's claim that toy preferences are learned through observing same-gender peers rather than being inborn., Combine it with the third paragraph's argument that limiting children to gender-coded toys can restrict learning, interests, and future opportunities., Survey what each paragraph contributes: biographical framing, career path and assignments, reporting philosophy, and final assignment/death., Choose the option whose scope includes all those stages rather than one subset such as particular reports, schooldays, or Homs.
- **Stem Templates**:
  * *"Why did Darrell tell Marina to go to Pinterest ?"*
  * *"What idea does Jesse Cohen talk about in the reading?"*
  * *"What is the reading mostly about?"*
  * *"According to the reading, why did Rohla and Kreytenberg open Habibi & Hawara?"*
- **Distractor Mechanisms**: `unsupported_world_knowledge`, `overgeneralization`, `reversed_cause_effect`, `undergeneralization`, `local_evidence_for_global_question`, `other`, `irrelevant_distractor`, `wrong_chronology`, `literal_keyword_matching`, `partial_truth`
- **Quality Checks**:
  * Every distractor should reflect a true local detail from one paragraph of the passage
  * The correct option must encompass the global theme of the passage


### RECIPE_SINGLE_LEXICAL_COMMUNICATIVE_COLLOCATION: Standalone Communicative Lexical Gap Drill
- **Primary Skill**: `vocabulary_in_context`
- **Supported Genres**: `single_standalone`
- **Cognitive Depth**: `D2_single_step_inference`, `D1_verbatim_retrieval`, `D3_multi_step_synthesis`
- **Evidence Span**: `single_sentence`
- **Evidence Support**: 52 items across 5 years (Years: 111, 112, 113, 114, 115)
- **Reasoning Operations**: The 2:00 start time creates a consequence: meeting at 1:45 is therefore sensible, so “so” expresses the intended result., Test each alternative against the same grammatical, semantic, discourse, and source constraints before selecting., Fear of the dark explains why Peter leaves the lights on while sleeping., Having more fans than every teammate is direct evidence that Pam is popular., Having money for only one of two liked items creates a difficult choice between them., Repeated practice with the same kind of math problem makes answering it easy.
- **Stem Templates**:
  * *"The movie starts at two o’clock, _____ let’s meet at the theater at one forty-five."*
  * *"{Character} is afraid of the dark. He even leaves the _____ on when sleeping."*
  * *"Pam is a _____ baseball player; she has more fans than any other player on her team."*
  * *"Kevin has only enough money for the bag or the shoes. That is a hard _____ to make because he likes them both."*
- **Distractor Mechanisms**: `grammatically_plausible_contextually_wrong`, `irrelevant_distractor`, `partial_truth`, `wrong_referent`, `unsupported_world_knowledge`, `reversed_cause_effect`, `overgeneralization`, `wrong_chronology`, `other`, `local_evidence_for_global_question`
- **Quality Checks**:
  * All 4 options must belong to the exact same grammatical word class
  * Scenario must clearly disambiguate the correct word without world knowledge assumptions


### RECIPE_SINGLE_SYNTACTIC_AGREEMENT_LICENSING: Standalone Syntactic Agreement & Clause Licensing Drill
- **Primary Skill**: `grammar_in_context`
- **Supported Genres**: `single_standalone`
- **Cognitive Depth**: `D2_single_step_inference`, `D1_verbatim_retrieval`, `D3_multi_step_synthesis`
- **Evidence Span**: `single_sentence`
- **Evidence Support**: 39 items across 5 years (Years: 111, 112, 113, 114, 115)
- **Reasoning Operations**: The teacher imposed an obligation after the unfinished homework, so “had to stay” correctly expresses past necessity., Test each alternative against the same grammatical, semantic, discourse, and source constraints before selecting., The construction is “it took me lots of time to prepare,” requiring the to-infinitive after “took me … time.”, Bob is compared with all the boys in the family and is the extreme case, so the definite superlative “the laziest” is required., Her sixty years of residence support a present state of knowledge, so simple present “knows” is correct., At the moment the speaker got home, the brother had an imminent dinner plan and invited the speaker, so past progressive “was going out” fits.
- **Stem Templates**:
  * *"I did not do my homework, so my teacher said I _____ stay after school to finish it."*
  * *"Although it took me lots of time _____ a big meal for ten people, I was happy that everyone enjoyed it."*
  * *"Bob is _____ of the boys in the family. He never does any housework. His brothers at least take out the garbage sometimes."*
  * *"Aunt Gina has lived in this town for more than sixty years, so she _____ it very well."*
- **Distractor Mechanisms**: `grammatically_plausible_contextually_wrong`, `other`, `wrong_chronology`, `reversed_cause_effect`, `undergeneralization`
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
