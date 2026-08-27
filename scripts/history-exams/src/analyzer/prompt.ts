import { ExtractedPassage, ExtractedQuestion } from '../schemas/extracted.ts';
import { PedagogicalAnalysis } from '../schemas/analyzed.ts';

export const PROMPT_VERSION = 'v3.0.0';
export const CRITIC_PROMPT_VERSION = 'v3.0.0';
export const ANALYSIS_SCHEMA_VERSION = '1.0.0';

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

=== MANDATORY ASSESSMENT DESIGN TAXONOMY & RULES ===

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

3. languageDifficulty vs cognitiveDepth (CRITICAL DECOUPLING PRINCIPLE):
   - languageDifficulty:
     * 'A1_elementary': Basic high-frequency words, simple present/past, SVO.
     * 'A2_basic': Standard junior-high vocabulary (1200 words), compound sentences, standard tenses.
     * 'B1_intermediate': Extended junior-high ceiling (2000 words), passive voice, relative clauses, complex conditionals.
   - cognitiveDepth:
     * 'D1_verbatim_retrieval': Literal scanning/matching without transformation.
     * 'D2_single_step_inference': 1-step deduction, paraphrase recognition, or local contextual fill.
     * 'D3_multi_step_synthesis': Integrating clues across multiple sentences/paragraphs or non-linear structures.
     * 'D4_evaluative_pragmatic': Pragmatic subtext, authorial intent, tone evaluation, or meta-textual evaluation.
   * DO NOT equate language difficulty with cognitive depth! A question using simple A1 words can have high D3/D4 cognitive depth.

4. evidenceNecessity:
   - 'essential': Evidence (passage, dialogue, or image) MUST be inspected; question CANNOT be solved reliably in isolation.
     (NOTE: Standalone visual picture questions such as Question #1 have 'essential' evidence necessity because the picture is required!)
   - 'helpful': Context provides guidance, but question could be guessed from general world knowledge.
   - 'decorative': Context is cosmetic; stem is a standalone question masquerading as reading comprehension.
   - 'none': Standalone Section 1 single question with NO visual or external context.

5. evidenceSpan:
   - 'single_word' | 'single_clause' | 'single_sentence' | 'cross_sentence_local' | 'multi_paragraph_global' | 'multimodal_text_and_graphic'

6. optionAnalyses (CRITICAL: 1 Correct Option + 3 Distractors):
   Provide an array of EXACTLY 4 items corresponding to (A), (B), (C), (D).
   - For the official correct option (must match ${question.answer}):
     * isCorrect: true
     * correctRationale: Detailed explanation of why this option is uniquely supported by textual/visual evidence.
     * evidenceRefs: Array of EvidenceReference objects pointing to exact evidence.
     * DO NOT include distractorStrategy or distractorRationale on the correct option.
   - For each of the 3 wrong options:
     * isCorrect: false
     * distractorStrategy: Choose the exact strategy from:
       - 'literal_keyword_matching' (surface word overlap from text asserting wrong fact)
       - 'partial_truth' (factually true in text, but answers the wrong aspect of the stem)
       - 'wrong_referent' (attributes action/quote to wrong person/object)
       - 'wrong_chronology' (swaps order of events or cause/effect)
       - 'local_evidence_for_global_question' (cites a small detail as the main idea)
       - 'unsupported_world_knowledge' (common sense / real-world plausible, but unmentioned in text)
       - 'reversed_cause_effect' (reverses causality)
       - 'grammatically_plausible_contextually_wrong' (correct syntax, wrong semantic context)
       - 'overgeneralization' | 'undergeneralization' | 'irrelevant_distractor' | 'other'
     * distractorRationale: Detailed explanation of how this option tempts students and why it is incorrect.
     * evidenceRefs: Supporting or counter evidence references.
     * misconceptionTarget: What student misunderstanding this distractor targets.

7. difficultyAdjustment:
   - canSimplifyLanguageWithoutBreakingMechanism: boolean
   - simplificationConstraints: string[] (e.g. "Must preserve the contrast connective 'although'")
   - canIncreaseDepthWithoutIncreasingVocabulary: boolean
   - depthAdjustmentStrategies: string[] (e.g. "Add a second condition to the schedule requiring 2-step elimination")

8. reasoningOperations: Array of mental steps performed by the student (e.g. ["timeline_reconstruction", "negation_resolution", "cross_modal_mapping"]).
9. reasoningComplexity: 'simple_single_step' | 'compound_dual_step' | 'complex_multi_step_deduction'

10. Demands:
    - readingDemand: 'low' | 'medium' | 'high'
    - grammarDemand: 'low' | 'medium' | 'high'
    - vocabularyDemand: 'low' | 'medium' | 'high'
    - inferenceDemand: 'low' | 'medium' | 'high'
    - visualIntegrationDemand: 'low' | 'medium' | 'high'

11. questionMechanism: 1-2 sentences explaining the core psychometric design.
12. whyTheQuestionWorks: 1-2 sentences explaining what differentiates students who answer correctly.
13. studentFailureModes: Array of common reading/reasoning traps students fall into.
14. misconceptionsTargeted: Array of specific misconceptions tapped by this question.
15. reusableDesignPrinciple: An abstract recipe rule for constructing similar questions.
16. shallowRecall:
    - isShallowRecall: boolean
    - recallType: 'none' | 'isolated_dictionary_definition' | 'mechanical_grammar_pattern' | 'uncontextualized_idiom' | 'intentional_retrieval_drill' | 'shallow_comprehension_artifact'
    - explanation: string
17. analysisConfidence: 'high' | 'medium' | 'low'
18. uncertainties: string[]
19. evidenceReferences: Array of overall key evidence reference objects.

Return valid JSON adhering strictly to PedagogicalAnalysis schema.`;
}

export function buildCriticReviewPrompt(
  question: ExtractedQuestion,
  proposedAnalysis: PedagogicalAnalysis,
  passage?: ExtractedPassage | null
): string {
  return `You are a Senior Assessment Evidence Critic auditing a pedagogical analysis of a CAP English exam item.

=== QUESTION DATA ===
Exam: CAP ${question.examId} (Question #${question.questionNumber})
Stem: ${question.stem}
Options:
(A) ${question.options.A}
(B) ${question.options.B}
(C) ${question.options.C}
(D) ${question.options.D}
Official Answer: ${question.answer}
Passage Context: ${passage ? passage.text.slice(0, 1000) : 'None'}
Visual Attached: ${question.visualEvidenceRequired}

=== PROPOSED ANALYSIS ===
${JSON.stringify(proposedAnalysis, null, 2)}

=== CRITIC AUDIT CHECKLIST ===
1. Skill Fidelity: Is the primarySkill ('${proposedAnalysis.primarySkill}') actually the determinative bottleneck for student success?
2. Decoupling Check: Is cognitiveDepth ('${proposedAnalysis.cognitiveDepth}') properly evaluated without confusing vocabulary difficulty ('${proposedAnalysis.languageDifficulty}') with reasoning depth?
3. Evidence Necessity: Is evidenceNecessity ('${proposedAnalysis.evidenceNecessity}') accurate? (e.g. Visual Q1 must be 'essential', not 'none').
4. Option Semantics:
   - Does option ${question.answer} have isCorrect: true and a valid correctRationale?
   - Do the 3 distractors have specific, grounded distractorRationale and plausible distractorStrategy (not generic canned text)?
5. Grounding: Are the cited evidence references actually present in the source text or images?
6. Shallow Recall: Is the question accurately diagnosed as shallow recall or true contextual reasoning?

If the analysis is fully valid and accurate, return:
{
  "criticStatus": "passed",
  "criticIssues": [],
  "repairedFields": null
}

If any fields are inaccurate, return:
{
  "criticStatus": "repaired",
  "criticIssues": ["List of specific issues found"],
  "repairedFields": {
    // Provide ONLY the corrected fields (e.g. primarySkill, evidenceNecessity, optionAnalyses, etc.)
  }
}

Return strictly valid JSON.`;
}

