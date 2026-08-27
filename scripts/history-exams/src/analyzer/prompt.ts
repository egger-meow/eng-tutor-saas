import { ExtractedPassage, ExtractedQuestion } from '../schemas/extracted.ts';

export const PROMPT_VERSION = 'v2.0.0';

export function buildPedagogicalAnalysisPrompt(
  question: ExtractedQuestion,
  passage?: ExtractedPassage | null
): string {
  const contextSnippet = passage
    ? `[Passage Context (${passage.id}, Genre: ${passage.genre}, EvidenceMode: ${passage.evidenceMode})]:\n${passage.text}\n`
    : '[Standalone Single Question - No passage context]';

  const glossarySnippet = question.glossary
    ? `Footnote Glossary: ${JSON.stringify(question.glossary)}`
    : '';

  const visualSnippet = question.visualEvidenceRequired
    ? `[VISUAL EVIDENCE ATTACHED]: This question relies on visual image/diagram/map/comic evidence on page ${question.page}. Inspect the attached page image(s) to verify visual evidence.`
    : '';

  const answerSnippet = question.answer
    ? `Official Ministry Answer: Option (${question.answer}) is the verified correct answer. Options other than (${question.answer}) are the 3 distractors.`
    : 'Official Answer: Unknown';

  return `You are an expert pedagogical psychometrician and curriculum scientist analyzing a historical CAP English exam question (Taiwan Junior High English Comprehensive Assessment Program / 國中教育會考).

Your mission is NOT to summarize or merely solve the question. Your mission is to REVERSE-ENGINEER the underlying assessment design logic, cognitive demand, distractor construction, and pedagogical mechanics.

=== QUESTION DATA ===
Exam: CAP ${question.examId} (Question #${question.questionNumber})
Section: ${question.section}
Evidence Mode: ${question.evidenceMode}
${visualSnippet}
${contextSnippet}
${glossarySnippet}

Question Stem: ${question.stem}
Options:
(A) ${question.options.A}
(B) ${question.options.B}
(C) ${question.options.C}
(D) ${question.options.D}

${answerSnippet}

=== PEDAGOGICAL ANALYSIS TAXONOMY & RULES ===

1. primarySkill (choose exact enum):
   - 'vocabulary_in_context': Inferring meaning of a word/phrase from surrounding discourse.
   - 'grammar_in_context': Syntax, tense, voice, conjunctions, clause structure, agreement.
   - 'explicit_detail': Retrieving stated factual information directly from text.
   - 'reference_resolution': Determining what a pronoun or referring phrase ('this', 'they') refers to.
   - 'local_inference': Inferring unstated information from 1-2 adjacent sentences.
   - 'cross_sentence_inference': Integrating clues across separate paragraphs or narrative arc.
   - 'main_idea': Identifying overall topic, gist, title, or central message.
   - 'purpose_speaker_intent': Inferring author's goal, attitude, tone, or why something was mentioned.
   - 'discourse_relationship': Logical transitions (cause-effect, contrast, sequence, condition).
   - 'sequence_cause_consequence': Ordering events or establishing causal chains.
   - 'text_structure': Understanding organizational pattern (e.g. chronological, problem-solution).
   - 'information_integration': Combining multi-modal clues (e.g. text + infographic/schedule/table).
   - 'pragmatic_meaning': Conversational implicature, politeness, situational dialogue meaning.
   - 'other_uncertain': Use ONLY when evidence strongly contradicts all above (must provide skillExplanation).

2. secondarySkills: Array of any additional skills tapped from the list above.

3. languageDifficulty vs cognitiveDepth (CRITICAL DECOUPLING):
   - languageDifficulty:
     * 'A1_elementary': Basic high-frequency words, simple present/past, SVO.
     * 'A2_basic': Standard junior-high vocabulary (1200 words), compound sentences, standard tenses.
     * 'B1_intermediate': Extended junior-high ceiling (2000 words), passive voice, relative clauses, complex conditionals.
   - cognitiveDepth:
     * 'D1_verbatim_retrieval': Literal scanning/matching without transformation.
     * 'D2_single_step_inference': 1-step deduction, paraphrase recognition, or local contextual fill.
     * 'D3_multi_step_synthesis': Integrating clues across multiple sentences/paragraphs or non-linear structures.
     * 'D4_evaluative_pragmatic': Pragmatic subtext, authorial intent, tone evaluation, or meta-textual evaluation.

4. contextNecessity (Diagnostic for Anti-Pattern 1):
   - 'essential': Passage/dialogue MUST be read; stem cannot be resolved in isolation.
   - 'helpful': Context provides guidance, but question could be guessed from world knowledge.
   - 'decorative': Context is cosmetic; stem is a standalone question masquerading as reading comprehension.
   - 'none': Standalone Section 1 single question.

5. evidenceSpan:
   - 'single_word' | 'within_sentence' | 'cross_sentence_local' | 'multi_paragraph_global' | 'whole_passage_holistic'

6. distractorStrategies: Provide detailed reverse-engineering for all 4 options (A, B, C, D).
   For the correct option, describe why it is uniquely correct and supported.
   For each distractor, choose the strategy from:
   - 'literal_keyword_matching' (surface word overlap from text)
   - 'partial_truth' (factually true in text, but answers the wrong aspect of the stem)
   - 'wrong_referent' (attributes action/quote to wrong person/object)
   - 'wrong_chronology' (swaps order of events or cause/effect)
   - 'local_evidence_for_global_question' (cites a small detail as the main idea)
   - 'unsupported_world_knowledge' (common sense / real-world plausible, but unmentioned in text)
   - 'reversed_cause_effect' (reverses causality)
   - 'grammatically_plausible_contextually_wrong' (correct syntax, wrong semantic context)
   - 'overgeneralization' | 'undergeneralization' | 'irrelevant_distractor' | 'other'

7. shallowRecall:
   - isShallowRecall: boolean (true if question only requires memorized dictionary definition or isolated mechanical syntax without contextual comprehension).
   - recallType: 'isolated_dictionary_definition' | 'mechanical_grammar_pattern' | 'uncontextualized_idiom' | 'intentional_retrieval_drill' | 'none'
   - diagnosticNotes: string

8. demandScore:
   - lexical: 'low' | 'medium' | 'high'
   - syntactic: 'low' | 'medium' | 'high'
   - reasoning: 'low' | 'medium' | 'high'
   - contextIntegration: 'low' | 'medium' | 'high'

9. explanation: 1-3 sentences summarizing the exact pedagogical function of this item.

Return valid JSON adhering strictly to the PedagogicalAnalysis schema.`;
}
