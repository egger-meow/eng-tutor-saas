import { ExtractedPassage, ExtractedQuestion } from '../schemas/extracted.ts';

export const PROMPT_VERSION = 'v1.0.0';

export function buildPedagogicalAnalysisPrompt(
  question: ExtractedQuestion,
  passage?: ExtractedPassage | null
): string {
  const contextSnippet = passage
    ? `[Passage Context (${passage.id}, Genre: ${passage.genre})]:\n${passage.text}\n`
    : '[Standalone Single Question - No passage context]';

  const glossarySnippet = question.glossary
    ? `Footnote Glossary: ${JSON.stringify(question.glossary)}`
    : '';

  return `You are an expert pedagogical psychometrician and curriculum scientist analyzing a historical CAP English exam question (Taiwan Junior High English Comprehensive Assessment Program / 國中教育會考).

Your mission is NOT to summarize or merely solve the question. Your mission is to REVERSE-ENGINEER the underlying assessment design logic, cognitive demand, distractor construction, and pedagogical mechanics.

=== QUESTION DATA ===
Exam: CAP ${question.examId} (Question #${question.questionNumber})
Section: ${question.section}
${contextSnippet}
${glossarySnippet}

Question Stem: ${question.stem}
Options:
(A) ${question.options.A}
(B) ${question.options.B}
(C) ${question.options.C}
(D) ${question.options.D}

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
     * 'D2_single_step_inference': 1-step deduction or synonym matching.
     * 'D3_multi_step_synthesis': Integrating 2+ distinct clues or evaluating implicit relationships across text.
     * 'D4_evaluative_pragmatic': Generalizing author perspective, evaluating scenario applications, or resolving subtle communicative intent.
   * NOTE: A question can have elementary language (A1/A2) but high cognitive depth (D3), or complex language with shallow retrieval (D1).

4. evidenceSpan:
   - 'single_word' | 'single_clause' | 'single_sentence' | 'cross_sentence_local' | 'multi_paragraph_global' | 'multimodal_text_and_graphic'

5. contextNecessity:
   - 'essential': The question CANNOT be solved without reading the passage/context.
   - 'helpful': Context provides background or confirms the answer, but question might be guessed from stem alone.
   - 'decorative': Context is present in booklet but completely irrelevant to finding the correct answer.
   - 'none': Standalone question (Section 1 single item).

6. distractorStrategies: Analyze each option (A, B, C, D) using strategies:
   - 'literal_keyword_matching' (traps students who scan for matching surface words)
   - 'partial_truth' (partly correct but misses crucial constraint)
   - 'wrong_referent' (attributes action/trait to wrong entity)
   - 'wrong_chronology' (swaps before/after or temporal sequence)
   - 'local_evidence_for_global_question' (true statement in paragraph 1 but fails main idea)
   - 'unsupported_world_knowledge' (plausible in real life, but contradicted or absent in text)
   - 'reversed_cause_effect' (inverts causal relationship)
   - 'grammatically_plausible_contextually_wrong' (fits grammar slot but contradicts context)
   - 'overgeneralization' | 'undergeneralization' | 'irrelevant_distractor' | 'other'

7. shallowRecall:
   - isShallowRecall: boolean
   - recallType: 'none' | 'intentional_retrieval_drill' | 'shallow_comprehension_artifact'
   - explanation: why this is or isn't shallow recall.

8. Demands & Insights:
   - readingDemand, grammarDemand, vocabularyDemand, inferenceDemand: 'low' | 'medium' | 'high'
   - reasoningOperations: string[] (e.g. ["temporal_comparison", "constraint_satisfaction", "referent_disambiguation"])
   - questionMechanism: Clear breakdown of how the question tests reasoning.
   - whyTheQuestionWorks: Pedagogical explanation of why this item effectively discriminates proficiency.
   - possibleStudentFailureModes: string[] (Common misconceptions or traps leading to errors).
   - reusableDesignPrinciple: An actionable rule that a Question Planner can reuse to construct similar high-quality items.

=== OUTPUT FORMAT ===
Return ONLY a valid JSON object matching this exact schema with NO markdown code fences, NO explanation outside JSON:
{
  "primarySkill": "...",
  "secondarySkills": [...],
  "languageDifficulty": "...",
  "cognitiveDepth": "...",
  "evidenceSpan": "...",
  "contextNecessity": "...",
  "reasoningOperations": ["..."],
  "questionMechanism": "...",
  "distractorStrategies": [
    { "option": "A", "strategy": "...", "explanation": "..." },
    { "option": "B", "strategy": "...", "explanation": "..." },
    { "option": "C", "strategy": "...", "explanation": "..." },
    { "option": "D", "strategy": "...", "explanation": "..." }
  ],
  "requiredKnowledge": ["..."],
  "readingDemand": "low"|"medium"|"high",
  "grammarDemand": "low"|"medium"|"high",
  "vocabularyDemand": "low"|"medium"|"high",
  "inferenceDemand": "low"|"medium"|"high",
  "whyTheQuestionWorks": "...",
  "possibleStudentFailureModes": ["..."],
  "reusableDesignPrinciple": "...",
  "shallowRecall": {
    "isShallowRecall": false,
    "recallType": "none",
    "explanation": "..."
  }
}
`;
}
