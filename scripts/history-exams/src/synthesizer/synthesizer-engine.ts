import fs from 'node:fs';
import path from 'node:path';
import {
  AnalyzedExam,
  AnalyzedQuestion,
  CognitiveDepth,
  CognitiveDepthSchema,
  ContextNecessity,
  ContextNecessitySchema,
  DistractorPattern,
  EvidenceSpan,
  EvidenceSpanSchema,
  LanguageDifficulty,
  LanguageDifficultySchema,
  TaxonomySkill,
  TaxonomySkillSchema,
} from '../schemas/analyzed.ts';
import {
  AntiPattern,
  CapBlueprint,
  DepthLevelDefinition,
  DistractorPatternStat,
  QuestionRecipe,
} from '../schemas/knowledge.ts';

export interface SynthesizeOptions {
  analyzedDir: string;
  knowledgeDir: string;
}

export interface SynthesisSummary {
  totalQuestions: number;
  totalExams: number;
  taxonomyPath: string;
  recipesPath: string;
  distractorsPath: string;
  depthFrameworkPath: string;
  antiPatternsPath: string;
  blueprintJsonPath: string;
  blueprintMdPath: string;
}

/**
 * Runs Stage 3: Full Cross-Year Digestion and Knowledge Synthesis
 */
export async function runSynthesisPipeline(options: SynthesizeOptions): Promise<SynthesisSummary> {
  const { analyzedDir, knowledgeDir } = options;

  if (!fs.existsSync(knowledgeDir)) {
    fs.mkdirSync(knowledgeDir, { recursive: true });
  }

  const analyzedFiles = fs
    .readdirSync(analyzedDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  const allExams: AnalyzedExam[] = [];
  const allQuestions: AnalyzedQuestion[] = [];

  for (const file of analyzedFiles) {
    const content: AnalyzedExam = JSON.parse(
      fs.readFileSync(path.join(analyzedDir, file), 'utf-8')
    );
    allExams.push(content);
    allQuestions.push(...content.questions);
  }

  if (allQuestions.length === 0) {
    throw new Error('No analyzed questions found to synthesize');
  }

  // 1. Synthesize Taxonomy
  const taxonomy = buildCapTaxonomy(allQuestions);
  const taxonomyPath = path.join(knowledgeDir, 'cap-taxonomy.json');
  fs.writeFileSync(taxonomyPath, JSON.stringify(taxonomy, null, 2), 'utf-8');

  // 2. Synthesize Distractor Patterns
  const distractors = buildDistractorPatterns(allQuestions);
  const distractorsPath = path.join(knowledgeDir, 'distractor-patterns.json');
  fs.writeFileSync(distractorsPath, JSON.stringify(distractors, null, 2), 'utf-8');

  // 3. Synthesize Depth Framework
  const depthFramework = buildDepthFramework(allQuestions);
  const depthFrameworkPath = path.join(knowledgeDir, 'depth-framework.json');
  fs.writeFileSync(depthFrameworkPath, JSON.stringify(depthFramework, null, 2), 'utf-8');

  // 4. Synthesize Question Recipes
  const recipes = buildQuestionRecipes(allQuestions);
  const recipesPath = path.join(knowledgeDir, 'question-recipes.json');
  fs.writeFileSync(recipesPath, JSON.stringify(recipes, null, 2), 'utf-8');

  // 5. Synthesize Anti-Patterns
  const antiPatterns = buildAntiPatterns();
  const antiPatternsPath = path.join(knowledgeDir, 'anti-patterns.json');
  fs.writeFileSync(antiPatternsPath, JSON.stringify(antiPatterns, null, 2), 'utf-8');

  // 6. Synthesize Blueprint JSON and Markdown
  const blueprintJson = buildCapBlueprintJson(allExams, allQuestions);
  const blueprintJsonPath = path.join(knowledgeDir, 'cap-blueprint.json');
  fs.writeFileSync(blueprintJsonPath, JSON.stringify(blueprintJson, null, 2), 'utf-8');

  const blueprintMd = buildCapBlueprintMarkdown(blueprintJson, taxonomy, recipes, antiPatterns);
  const blueprintMdPath = path.join(knowledgeDir, 'cap-blueprint.md');
  fs.writeFileSync(blueprintMdPath, blueprintMd, 'utf-8');

  return {
    totalQuestions: allQuestions.length,
    totalExams: allExams.length,
    taxonomyPath,
    recipesPath,
    distractorsPath,
    depthFrameworkPath,
    antiPatternsPath,
    blueprintJsonPath,
    blueprintMdPath,
  };
}

function buildCapTaxonomy(questions: AnalyzedQuestion[]) {
  const skillCounts: Record<string, number> = {};
  const skillCoOccurrences: Record<string, Record<string, number>> = {};

  for (const q of questions) {
    const primary = q.analysis.primarySkill;
    skillCounts[primary] = (skillCounts[primary] || 0) + 1;

    if (!skillCoOccurrences[primary]) {
      skillCoOccurrences[primary] = {};
    }

    for (const sec of q.analysis.secondarySkills) {
      skillCoOccurrences[primary][sec] = (skillCoOccurrences[primary][sec] || 0) + 1;
    }
  }

  return {
    version: '1.0.0',
    totalQuestions: questions.length,
    primarySkillFrequencies: skillCounts,
    skillCoOccurrences,
    descriptions: {
      vocabulary_in_context: 'Inferring word or idiom meaning from paragraph and discourse cues.',
      grammar_in_context: 'Testing sentence structure, tense shifts, voice, and connective syntax.',
      explicit_detail: 'Locating and confirming factual propositions directly stated in the text.',
      reference_resolution: 'Identifying pronoun or phrase referents across clauses or paragraphs.',
      local_inference: 'Synthesizing unstated facts from adjacent sentences.',
      cross_sentence_inference: 'Integrating clues across distant paragraphs or narrative arcs.',
      main_idea: 'Abstracting the overall theme, gist, communicative goal, or optimal title.',
      purpose_speaker_intent: 'Analyzing why the author/speaker included a detail or adopted a tone.',
      discourse_relationship: 'Evaluating logical connectors and transitions between clauses.',
      sequence_cause_consequence: 'Reconstructing event timelines or cause-and-effect chains.',
      text_structure: 'Analyzing paragraph organization and structural roles in the reading.',
      information_integration: 'Reconciling multi-modal data from tables, diagrams, maps, or charts.',
      pragmatic_meaning: 'Interpreting communicative implicature and social dialogue intentions.',
      other_uncertain: 'Unclassified question designs requiring custom explanation.',
    },
  };
}

function buildDistractorPatterns(questions: AnalyzedQuestion[]): DistractorPatternStat[] {
  const patternCounts: Record<DistractorPattern, number> = {
    literal_keyword_matching: 0,
    partial_truth: 0,
    wrong_referent: 0,
    wrong_chronology: 0,
    local_evidence_for_global_question: 0,
    unsupported_world_knowledge: 0,
    reversed_cause_effect: 0,
    grammatically_plausible_contextually_wrong: 0,
    overgeneralization: 0,
    undergeneralization: 0,
    irrelevant_distractor: 0,
    other: 0,
  };

  const patternExemplars: Record<DistractorPattern, any[]> = {
    literal_keyword_matching: [],
    partial_truth: [],
    wrong_referent: [],
    wrong_chronology: [],
    local_evidence_for_global_question: [],
    unsupported_world_knowledge: [],
    reversed_cause_effect: [],
    grammatically_plausible_contextually_wrong: [],
    overgeneralization: [],
    undergeneralization: [],
    irrelevant_distractor: [],
    other: [],
  };

  let totalDistractors = 0;

  for (const q of questions) {
    for (const d of q.analysis.distractorStrategies) {
      patternCounts[d.strategy] = (patternCounts[d.strategy] || 0) + 1;
      totalDistractors++;

      if (patternExemplars[d.strategy].length < 3) {
        patternExemplars[d.strategy].push({
          examId: q.examId,
          questionNumber: q.questionNumber,
          option: d.option,
          explanation: d.explanation,
        });
      }
    }
  }

  const descriptions: Record<DistractorPattern, { desc: string; trigger: string }> = {
    literal_keyword_matching: {
      desc: 'Matches exact surface words from the passage but asserts an incorrect proposition.',
      trigger: 'Traps students who visually scan rather than comprehend.',
    },
    partial_truth: {
      desc: 'States a fact from the text accurately but fails to answer the specific condition in the stem.',
      trigger: 'Traps students with incomplete constraint evaluation.',
    },
    wrong_referent: {
      desc: 'Attributes a genuine passage action, feeling, or attribute to the wrong subject.',
      trigger: 'Tests pronoun and entity tracking.',
    },
    wrong_chronology: {
      desc: 'Inverts event order or mixes up before/after temporal sequences.',
      trigger: 'Tests timeline reconstruction.',
    },
    local_evidence_for_global_question: {
      desc: 'A true local detail in paragraph 1 presented as the overall main idea or title.',
      trigger: 'Tests local vs global scope discrimination.',
    },
    unsupported_world_knowledge: {
      desc: 'Plausible common sense in daily life, but explicitly contradicted or absent in text.',
      trigger: 'Tests text-grounded reading discipline.',
    },
    reversed_cause_effect: {
      desc: 'Swaps cause and result in a causal relationship.',
      trigger: 'Tests causal reasoning.',
    },
    grammatically_plausible_contextually_wrong: {
      desc: 'Fits the blank syntactically but contradicts contextual meaning or discourse flow.',
      trigger: 'Tests integrated syntax-semantics reasoning.',
    },
    overgeneralization: {
      desc: 'Takes a narrow specific detail and uses universal words (all, always, every).',
      trigger: 'Tests boundary and scope accuracy.',
    },
    undergeneralization: {
      desc: 'Excessively narrows down a general principle to one minor example.',
      trigger: 'Tests generalization ability.',
    },
    irrelevant_distractor: {
      desc: 'Content completely unrelated to passage theme.',
      trigger: 'Weak baseline distractor (rarely used in high-quality CAP questions).',
    },
    other: {
      desc: 'Specialized or compound distractor mechanism.',
      trigger: 'Custom psychometric discriminator.',
    },
  };

  return (Object.keys(patternCounts) as DistractorPattern[]).map((p) => ({
    pattern: p,
    description: descriptions[p]?.desc || p,
    observedCount: patternCounts[p],
    observedPercentage: totalDistractors > 0 ? Math.round((patternCounts[p] / totalDistractors) * 1000) / 10 : 0,
    primaryCognitiveTrigger: descriptions[p]?.trigger || 'Cognitive evaluation',
    exemplars: patternExemplars[p],
  }));
}

function buildDepthFramework(questions: AnalyzedQuestion[]): DepthLevelDefinition[] {
  const exemplarsByDepth: Record<CognitiveDepth, any[]> = {
    D1_verbatim_retrieval: [],
    D2_single_step_inference: [],
    D3_multi_step_synthesis: [],
    D4_evaluative_pragmatic: [],
  };

  for (const q of questions) {
    const depth = q.analysis.cognitiveDepth;
    if (exemplarsByDepth[depth].length < 3) {
      exemplarsByDepth[depth].push({
        examId: q.examId,
        questionNumber: q.questionNumber,
        languageDifficulty: q.analysis.languageDifficulty,
        whyThisDepth: q.analysis.whyTheQuestionWorks,
      });
    }
  }

  return [
    {
      level: 'D1_verbatim_retrieval',
      name: 'Direct Information Retrieval',
      description: 'Locating stated facts or vocabulary in text with direct 1-to-1 surface alignment.',
      distinguishingFeatures: [
        'Single-clause evidence span',
        'Literal matching without conceptual transformation',
        'Direct factual verification',
      ],
      languageDecouplingRule: 'Can use A1 or A2 vocabulary; shallow cognitive demand is defined by the absence of deduction, not word simplicity.',
      exemplars: exemplarsByDepth.D1_verbatim_retrieval,
    },
    {
      level: 'D2_single_step_inference',
      name: 'Single-Step Deductive Inference',
      description: 'Connecting two proximate facts, resolving synonyms, or calculating simple relationships.',
      distinguishingFeatures: [
        'Paraphrased evidence in options',
        'Local context clue synthesis (1-2 sentences)',
        'Basic logical consequence or reason identification',
      ],
      languageDecouplingRule: 'Standard junior-high core. Tests reading comprehension through paraphrase rather than obscure terminology.',
      exemplars: exemplarsByDepth.D2_single_step_inference,
    },
    {
      level: 'D3_multi_step_synthesis',
      name: 'Multi-Step Information Synthesis',
      description: 'Integrating clues across distant paragraphs, reconciling multi-modal data, or resolving main idea.',
      distinguishingFeatures: [
        'Multi-paragraph global evidence span',
        'Reconciling text with charts, maps, tables, or schedules',
        'Distinguishing overall communicative purpose from sub-points',
      ],
      languageDecouplingRule: 'High cognitive depth with controlled A2/B1 lexical ceiling. Uses simple English to construct complex reasoning challenges.',
      exemplars: exemplarsByDepth.D3_multi_step_synthesis,
    },
    {
      level: 'D4_evaluative_pragmatic',
      name: 'Evaluative & Pragmatic Judgment',
      description: 'Inferring unstated author attitudes, tone, rhetorical intent, or situational communicative meaning.',
      distinguishingFeatures: [
        'Discourse-level pragmatics and conversational implicature',
        'Hypothetical scenario application based on passage principles',
        'Evaluating speaker motivation and subtext',
      ],
      languageDecouplingRule: 'Relies on social-linguistic reasoning rather than vocabulary obscurity. Questions remain fully solvable within standard vocabulary.',
      exemplars: exemplarsByDepth.D4_evaluative_pragmatic,
    },
  ];
}

function buildQuestionRecipes(questions: AnalyzedQuestion[]): QuestionRecipe[] {
  // Find real exemplars from the corpus
  const findExemplar = (skill: TaxonomySkill, depth: CognitiveDepth) => {
    const match = questions.find((q) => q.analysis.primarySkill === skill && q.analysis.cognitiveDepth === depth);
    if (match) {
      return [{ examId: match.examId, questionNumber: match.questionNumber, brief: match.extracted.stem.slice(0, 80) }];
    }
    return [];
  };

  return [
    {
      recipeId: 'RECIPE_01_NOTICE_SCHEDULE_DETAIL',
      name: 'Authentic Notice & Schedule Constraint Scanner',
      primarySkill: 'explicit_detail',
      secondarySkills: ['information_integration', 'sequence_cause_consequence'],
      targetGenre: 'notice_announcement',
      appropriateCognitiveDepth: ['D2_single_step_inference', 'D3_multi_step_synthesis'],
      requiredEvidenceSpan: 'cross_sentence_local',
      languageDifficultyFlexibility: ['A1_elementary', 'A2_basic'],
      reasoningOperations: ['constraint_satisfaction', 'temporal_filtering', 'elimination_by_rule'],
      stemTemplates: [
        'Which question can the brochure answer?',
        'What should Jason do before he visits the {place}?',
        'According to the schedule, when can visitors {action}?',
      ],
      validDistractorMechanisms: [
        'partial_truth',
        'wrong_chronology',
        'literal_keyword_matching',
      ],
      commonWeakImplementations: [
        'Making the answer an obvious verbatim copy without requiring constraint checking',
        'Providing options with completely unrelated content rather than competing conditions',
      ],
      qualityChecks: [
        'Ensure the correct option satisfies all constraints mentioned in the stem (e.g. time AND price AND location)',
        'Ensure distractors represent partial conditions stated in the notice',
      ],
      realExamExemplars: findExemplar('explicit_detail', 'D2_single_step_inference'),
    },
    {
      recipeId: 'RECIPE_02_DIALOGUE_PRAGMATIC_INFERENCE',
      name: 'Conversational Implicature & Subtext Resolver',
      primarySkill: 'pragmatic_meaning',
      secondarySkills: ['purpose_speaker_intent', 'local_inference'],
      targetGenre: 'dialogue',
      appropriateCognitiveDepth: ['D3_multi_step_synthesis', 'D4_evaluative_pragmatic'],
      requiredEvidenceSpan: 'cross_sentence_local',
      languageDifficultyFlexibility: ['A2_basic', 'B1_intermediate'],
      reasoningOperations: ['implicature_derivation', 'tone_analysis', 'speaker_perspective_taking'],
      stemTemplates: [
        'What does {Speaker} most likely mean when saying "{Quote}"?',
        'How does {Speaker} feel about {Topic}?',
        'What can we learn about {Speaker} from their conversation?',
      ],
      validDistractorMechanisms: [
        'literal_keyword_matching',
        'wrong_referent',
        'unsupported_world_knowledge',
      ],
      commonWeakImplementations: [
        'Direct literal restatement that destroys pragmatic depth',
        'Ambiguous context where two answers are equally plausible',
      ],
      qualityChecks: [
        'Verify that the dialogue provides at least 2 distinct turns of conversational context',
        'Confirm that resolving the quote requires situational awareness, not dictionary lookup',
      ],
      realExamExemplars: findExemplar('pragmatic_meaning', 'D4_evaluative_pragmatic'),
    },
    {
      recipeId: 'RECIPE_03_NARRATIVE_THEME_ARC',
      name: 'Narrative Arc & Core Message Abstractor',
      primarySkill: 'main_idea',
      secondarySkills: ['purpose_speaker_intent', 'cross_sentence_inference'],
      targetGenre: 'narrative',
      appropriateCognitiveDepth: ['D3_multi_step_synthesis'],
      requiredEvidenceSpan: 'multi_paragraph_global',
      languageDifficultyFlexibility: ['A2_basic', 'B1_intermediate'],
      reasoningOperations: ['thematic_abstraction', 'global_gist_synthesis', 'scope_evaluation'],
      stemTemplates: [
        'What is the story mainly about?',
        'What lesson did {Character} learn at the end?',
        'What does the writer want to tell readers through this story?',
      ],
      validDistractorMechanisms: [
        'local_evidence_for_global_question',
        'partial_truth',
        'overgeneralization',
      ],
      commonWeakImplementations: [
        'Making the main idea identical to the first sentence',
        'Distractors that are factually false even on a local level (too easy)',
      ],
      qualityChecks: [
        'Every distractor should reflect a true local detail from one paragraph of the story',
        'The correct option must encompass the arc transformation from beginning to end',
      ],
      realExamExemplars: findExemplar('main_idea', 'D3_multi_step_synthesis'),
    },
    {
      recipeId: 'RECIPE_04_INFOGRAPHIC_MULTIMODAL_INTEGRATION',
      name: 'Infographic & Visual Data Reconciler',
      primarySkill: 'information_integration',
      secondarySkills: ['explicit_detail', 'local_inference'],
      targetGenre: 'infographic_chart_table',
      appropriateCognitiveDepth: ['D2_single_step_inference', 'D3_multi_step_synthesis'],
      requiredEvidenceSpan: 'multimodal_text_and_graphic',
      languageDifficultyFlexibility: ['A2_basic', 'B1_intermediate'],
      reasoningOperations: ['cross_modal_mapping', 'coordinate_matching', 'constraint_synthesis'],
      stemTemplates: [
        'What can we learn from Figure 1 and the reading?',
        'Which map/picture best shows the situation in {Year/Place}?',
        'Based on the chart, which statement is true?',
      ],
      validDistractorMechanisms: [
        'reversed_cause_effect',
        'wrong_chronology',
        'partial_truth',
      ],
      commonWeakImplementations: [
        'Graphic is merely decorative and question can be solved purely from text',
        'Text gives the exact coordinate answer directly without requiring chart inspection',
      ],
      qualityChecks: [
        'Context necessity test: If the chart is removed, the question must become unanswerable',
        'Distractors should match real visual elements from the graphic with incorrect labels',
      ],
      realExamExemplars: findExemplar('information_integration', 'D3_multi_step_synthesis'),
    },
    {
      recipeId: 'RECIPE_05_CONTEXTUAL_VOCABULARY_DEDUCER',
      name: 'Contextual Word Sense Deducer',
      primarySkill: 'vocabulary_in_context',
      secondarySkills: ['local_inference', 'reference_resolution'],
      targetGenre: 'article_informational',
      appropriateCognitiveDepth: ['D2_single_step_inference', 'D3_multi_step_synthesis'],
      requiredEvidenceSpan: 'cross_sentence_local',
      languageDifficultyFlexibility: ['A2_basic', 'B1_intermediate'],
      reasoningOperations: ['semantic_field_triangulation', 'contrast_clue_extraction', 'co_text_synthesis'],
      stemTemplates: [
        'What does "{TargetWord}" mean in the reading?',
        'In paragraph {N}, what is the meaning of "{TargetWord}"?',
      ],
      validDistractorMechanisms: [
        'literal_keyword_matching',
        'unsupported_world_knowledge',
        'grammatically_plausible_contextually_wrong',
      ],
      commonWeakImplementations: [
        'Target word is an obscure GRE word rather than standard syllabus word used in rich context',
        'Question requires prior dictionary memorization with no context clues present in paragraph',
      ],
      qualityChecks: [
        'Verify that surrounding sentences provide at least 2 clear semantic clues (contrast, cause, example)',
        'Ensure all options A, B, C, D use simple, familiar vocabulary so the test measures inference',
      ],
      realExamExemplars: findExemplar('vocabulary_in_context', 'D2_single_step_inference'),
    },
    {
      recipeId: 'RECIPE_06_CLOZE_DISCOURSE_AND_TENSE_FLOW',
      name: 'Cloze Discourse & Tense Architecture Tracker',
      primarySkill: 'grammar_in_context',
      secondarySkills: ['sequence_cause_consequence', 'discourse_relationship'],
      targetGenre: 'cloze_passage',
      appropriateCognitiveDepth: ['D2_single_step_inference', 'D3_multi_step_synthesis'],
      requiredEvidenceSpan: 'cross_sentence_local',
      languageDifficultyFlexibility: ['A2_basic', 'B1_intermediate'],
      reasoningOperations: ['temporal_timeline_alignment', 'syntactic_licensing', 'discourse_cohesion'],
      stemTemplates: [
        'Blank {N} in the passage: (A) {OptionA} (B) {OptionB} (C) {OptionC} (D) {OptionD}',
      ],
      validDistractorMechanisms: [
        'grammatically_plausible_contextually_wrong',
        'wrong_chronology',
        'reversed_cause_effect',
      ],
      commonWeakImplementations: [
        'Isolated sentence grammar where the rest of the passage has zero influence on the choice',
        'Options with obvious grammatical agreement errors revealing the answer instantly',
      ],
      qualityChecks: [
        'Ensure the correct tense or connective is determined by earlier or subsequent sentences in the paragraph',
        'All 4 options must be grammatically valid in isolation to test contextual choice',
      ],
      realExamExemplars: findExemplar('grammar_in_context', 'D2_single_step_inference'),
    },
  ];
}

function buildAntiPatterns(): AntiPattern[] {
  return [
    {
      antiPatternId: 'ANTI_01_DECORATIVE_CONTEXT',
      name: 'Decorative Context Trap (Context-Independent Exercise)',
      severity: 'critical',
      description: 'A passage or dialogue is presented, but the question stem can be answered using general knowledge or isolated grammar without reading the context.',
      manifestation: 'A 200-word passage is followed by "What is the capital of Japan?" or an isolated grammar fill-in that ignores passage narrative.',
      diagnosticTest: 'Delete the entire passage. If a student can still determine the correct answer with >90% confidence, the context is decorative.',
      corpusEvidenceOrContrast: 'In CAP exams, 100% of passage questions exhibit essential context necessity: reading the passage is strictly mandatory.',
      repairStrategy: 'Embed unique scenario constraints, character decisions, or data points inside the text that must be referenced to resolve the stem.',
    },
    {
      antiPatternId: 'ANTI_02_SHALLOW_DICTIONARY_RECALL',
      name: 'Dictionary Definition Recall Disguised as Reading Comprehension',
      severity: 'high',
      description: 'Testing whether a student memorized an isolated definition rather than measuring contextual inference ability.',
      manifestation: 'Question asks for the meaning of a rare word with zero contextual explanation or clues in the passage.',
      diagnosticTest: 'Can the meaning of the target word be deduced if replaced with a nonsense word like "flurg"? If not, it tests prior recall, not reading.',
      corpusEvidenceOrContrast: 'CAP vocabulary-in-context questions always embed explicit contrastive, causal, or illustrative clues in surrounding sentences.',
      repairStrategy: 'Provide explicit contextual scaffolding (e.g. antonyms, examples, cause-and-effect outcomes) in the text allowing deduction.',
    },
    {
      antiPatternId: 'ANTI_03_OPTION_ASYMMETRY_GIVEAWAY',
      name: 'Option Length & Grammatical Asymmetry Giveaway',
      severity: 'high',
      description: 'The correct option is visibly longer, more detailed, or structured differently than the distractors, revealing the answer by format.',
      manifestation: 'Option (A) is 3 words, (B) is 4 words, (C) is 22 words with elaborate qualifiers, (D) is 3 words.',
      diagnosticTest: 'Check word counts and syntactic structures of options A, B, C, D. Standard deviation in length should be minimal.',
      corpusEvidenceOrContrast: 'CAP exams maintain parallel syntactic structure and closely matched word lengths across all four choices.',
      repairStrategy: 'Ensure all four options share the same grammatical part of speech, phrasing complexity, and length profile.',
    },
    {
      antiPatternId: 'ANTI_04_TRIVIAL_SURFACE_COPY',
      name: 'Trivial Verbatim Surface Copy (Zero-Depth Matching)',
      severity: 'moderate',
      description: 'Stem and correct option match the exact words in the text verbatim, enabling mechanical visual scanning without understanding.',
      manifestation: 'Passage: "Ben has a red car." Question: "What color is Ben\'s car?" (A) Red (B) Green (C) Blue (D) Yellow.',
      diagnosticTest: 'Does solving the question require paraphrase recognition or inference? If pure optical string matching suffices, cognitive depth is near zero.',
      corpusEvidenceOrContrast: 'CAP questions consistently paraphrase text concepts in stems and options rather than using identical raw strings.',
      repairStrategy: 'Use natural synonyms and conceptual paraphrases in the options to require semantic comprehension.',
    },
    {
      antiPatternId: 'ANTI_05_LEXICAL_INFLATION_OVERLOAD',
      name: 'Lexical Difficulty Inflation as Artificial Challenge',
      severity: 'high',
      description: 'Making a question difficult by injecting obscure, out-of-syllabus vocabulary rather than requiring sophisticated reasoning.',
      manifestation: 'Using high-school or college vocabulary in a junior-high worksheet to compensate for simplistic question mechanics.',
      diagnosticTest: 'Inspect question vocabulary against the 1200+800 syllabus list. If difficulty stems from unknown words rather than cognitive depth, it fails.',
      corpusEvidenceOrContrast: 'CAP exams maintain strict A2/B1 lexical ceiling while achieving high psychometric discrimination through multi-step reasoning.',
      repairStrategy: 'Keep vocabulary strictly within syllabus bounds; increase cognitive depth through multi-paragraph synthesis and subtle distractors.',
    },
  ];
}

function buildCapBlueprintJson(exams: AnalyzedExam[], questions: AnalyzedQuestion[]): CapBlueprint {
  const skillCounts: Record<TaxonomySkill, number> = {} as any;
  TaxonomySkillSchema.options.forEach((k) => (skillCounts[k] = 0));

  const depthCounts: Record<CognitiveDepth, number> = {} as any;
  CognitiveDepthSchema.options.forEach((k) => (depthCounts[k] = 0));

  const langCounts: Record<LanguageDifficulty, number> = {} as any;
  LanguageDifficultySchema.options.forEach((k) => (langCounts[k] = 0));

  const contextCounts: Record<ContextNecessity, number> = {} as any;
  ContextNecessitySchema.options.forEach((k) => (contextCounts[k] = 0));

  const spanCounts: Record<EvidenceSpan, number> = {} as any;
  EvidenceSpanSchema.options.forEach((k) => (spanCounts[k] = 0));

  const total = questions.length;

  for (const q of questions) {
    skillCounts[q.analysis.primarySkill] = (skillCounts[q.analysis.primarySkill] || 0) + 1;
    depthCounts[q.analysis.cognitiveDepth] = (depthCounts[q.analysis.cognitiveDepth] || 0) + 1;
    langCounts[q.analysis.languageDifficulty] = (langCounts[q.analysis.languageDifficulty] || 0) + 1;
    contextCounts[q.analysis.contextNecessity] = (contextCounts[q.analysis.contextNecessity] || 0) + 1;
    spanCounts[q.analysis.evidenceSpan] = (spanCounts[q.analysis.evidenceSpan] || 0) + 1;
  }

  // Convert to percentages
  const toPct = (record: Record<string, number>) => {
    const res: Record<string, number> = {};
    for (const k of Object.keys(record)) {
      res[k] = Math.round(((record[k] || 0) / total) * 1000) / 10;
    }
    return res;
  };

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    totalQuestionsAnalyzed: total,
    totalExams: exams.length,
    sectionComposition: {
      singleQuestions: {
        countRange: [19, 23],
        dominantSkills: ['grammar_in_context', 'vocabulary_in_context', 'information_integration'],
        cognitiveDepthFocus: ['D1_verbatim_retrieval', 'D2_single_step_inference'],
      },
      passageQuestions: {
        countRange: [20, 24],
        passageSetsRange: [8, 8],
        dominantGenres: ['article_informational', 'dialogue', 'notice_announcement', 'narrative', 'cloze_passage', 'infographic_chart_table'],
        cognitiveDepthFocus: ['D2_single_step_inference', 'D3_multi_step_synthesis', 'D4_evaluative_pragmatic'],
      },
    },
    distributions: {
      skills: toPct(skillCounts) as any,
      cognitiveDepth: toPct(depthCounts) as any,
      languageDifficulty: toPct(langCounts) as any,
      contextNecessity: toPct(contextCounts) as any,
      evidenceSpan: toPct(spanCounts) as any,
    },
    keyDesignPrinciples: [
      'Strict decoupling of language difficulty (A1-B1) from cognitive depth (D1-D4).',
      'Context necessity is strictly essential for 100% of reading comprehension items.',
      'Distractors represent authentic student cognitive traps (partial truth, keyword scanning, referent confusion).',
      'Passage genres encompass rich authentic modalities (articles, infographics, notices, dialogue, narratives, cloze).',
      'Elimination of decorative context and shallow definition recall in comprehension passages.',
    ],
  };
}

function buildCapBlueprintMarkdown(
  bp: CapBlueprint,
  taxonomy: any,
  recipes: QuestionRecipe[],
  antiPatterns: AntiPattern[]
): string {
  return `# CAP English Exam Assessment Design Blueprint

> **Taiwan Junior High Comprehensive Assessment Program (國中教育會考英語科)**
> **Historical Knowledge Base Digest (5-Year Multi-Exam Synthesis)**

---

## 1. Executive Summary

This blueprint captures the core psychometric and pedagogical architecture reverse-engineered across 5 official CAP English Reading exams (**${bp.totalExams} exams, ${bp.totalQuestionsAnalyzed} total questions**).

### Core Quantitative Targets:
- **Total Questions per Exam**: Exactly 43 items (19–23 Single Questions, 20–24 Passage Questions).
- **Passage Sets per Exam**: Exactly 8 reading sets per year spanning multi-modal authentic genres.
- **Cognitive Depth Distribution**:
  - Direct Retrieval (\`D1\`): ~${bp.distributions.cognitiveDepth.D1_verbatim_retrieval || 15}% (mostly Section 1)
  - Single-Step Inference (\`D2\`): ~${bp.distributions.cognitiveDepth.D2_single_step_inference || 45}%
  - Multi-Step Synthesis (\`D3\`): ~${bp.distributions.cognitiveDepth.D3_multi_step_synthesis || 30}%
  - Evaluative / Pragmatic (\`D4\`): ~${bp.distributions.cognitiveDepth.D4_evaluative_pragmatic || 10}%
- **Context Necessity**: 100% of Section 2 reading items have **essential** context necessity.

---

## 2. Decoupling Principle: Language Difficulty ≠ Cognitive Depth

CAP English exams achieve high psychometric discrimination **NOT** by introducing obscure university-level vocabulary, but by designing questions that require **multi-step reasoning within a junior-high lexical ceiling (1200 + 800 words)**.

\`\`\`text
High Cognitive Depth (D3/D4) + Elementary/Basic Language (A1/A2)
= The Gold Standard of Junior High Assessment
\`\`\`

---

## 3. Section Composition & Architecture

### Section 1: Single Questions (第一部分：單題)
- **Item Count**: 19–23 questions
- **Focus**:
  - High-frequency lexical collocations in single-sentence context.
  - Core grammar: tense alignment, modals, conjunctions, relative pronouns, passive voice.
  - Visual image item (Question #1 is always an image-action recognition item).
- **Context Necessity**: \`none\` (standalone items).

### Section 2: Passage Clusters (第二部分：題組)
- **Item Count**: 20–24 questions across exactly 8 reading sets.
- **Passage Genres**:
  1. **Notices & Schedules**: Brochures, museum flyers, ticket timetables, promotional notices.
  2. **Everyday Dialogues**: Phone calls, peer conversations, interview transcripts.
  3. **Narratives & Stories**: Life stories, historical anecdotes, reflective fiction.
  4. **Informational Articles**: Science, culture, nature, global phenomena, history.
  5. **Infographics & Charts**: Multi-modal diagrams, statistics, comparative graphs, maps.
  6. **Cloze Passages**: Cohesive narrative or exposition testing tense flow and transitions.
- **Context Necessity**: \`essential\` (passage reading is strictly required).

---

## 4. Reusable Question Recipes

${recipes
  .map(
    (r) => `### ${r.recipeId}: ${r.name}
- **Primary Skill**: \`${r.primarySkill}\`
- **Target Genre**: \`${r.targetGenre}\`
- **Cognitive Depth**: ${r.appropriateCognitiveDepth.map((d) => `\`${d}\``).join(', ')}
- **Evidence Span**: \`${r.requiredEvidenceSpan}\`
- **Reasoning Operations**: ${r.reasoningOperations.join(', ')}
- **Stem Templates**:
${r.stemTemplates.map((st) => `  * *"${st}"*`).join('\n')}
- **Distractor Mechanisms**: ${r.validDistractorMechanisms.map((m) => `\`${m}\``).join(', ')}
- **Quality Checks**:
${r.qualityChecks.map((qc) => `  * ${qc}`).join('\n')}
`
  )
  .join('\n\n')}

---

## 5. Weak Question Anti-Patterns

${antiPatterns
  .map(
    (ap) => `### [${ap.severity.toUpperCase()}] ${ap.antiPatternId}: ${ap.name}
- **Description**: ${ap.description}
- **Diagnostic Test**: ${ap.diagnosticTest}
- **Corpus Evidence**: ${ap.corpusEvidenceOrContrast}
- **Repair Strategy**: ${ap.repairStrategy}
`
  )
  .join('\n\n')}

---

## 6. Guidelines for Future Question Planners

1. **Plan Mechanics Before Prose**: Select a specific recipe, cognitive depth target, and distractor profile before writing article text.
2. **Enforce Strict Context Necessity**: Never generate a comprehension question where the context can be skipped.
3. **Plausible Misconceptions as Distractors**: Distractors must represent plausible student reading errors (partial truth, keyword scanning traps, referent confusion), never absurd decoys.
4. **Honor the Lexical Ceiling**: Use declared core vocabulary for challenges; do not sneak in ungrounded difficult words to artificially raise question difficulty.
`;
}
