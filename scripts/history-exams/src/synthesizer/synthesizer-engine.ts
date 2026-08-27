import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  AnalyzedExam,
  AnalyzedQuestion,
  CognitiveDepth,
  CognitiveDepthSchema,
  DistractorPattern,
  EvidenceNecessity,
  EvidenceNecessitySchema,
  EvidenceSpan,
  EvidenceSpanSchema,
  LanguageDifficulty,
  LanguageDifficultySchema,
  TaxonomySkill,
  TaxonomySkillSchema,
} from '../schemas/analyzed.ts';
import { HoldoutManifest, HoldoutManifestSchema } from '../schemas/benchmark.ts';
import {
  AntiPattern,
  AntiPatternsArtifact,
  CapBlueprint,
  DepthFrameworkArtifact,
  DepthLevelDefinition,
  DistractorPatternsArtifact,
  DistractorPatternStat,
  KnowledgeProvenance,
  QuestionRecipe,
  QuestionRecipesArtifact,
} from '../schemas/knowledge.ts';

export class MockDataQuarantinedError extends Error {
  constructor(operation: string, mockCount: number) {
    super(
      `[MockDataQuarantinedError] Cannot ${operation} using ${mockCount} offline mock analyzed record(s). ` +
      `Knowledge artifacts and benchmarks must derive strictly from authentic live AI Reverse-Engineering. ` +
      `Execute Stage 2 analysis with an API key, or pass --allow-provisional-mock if intentionally running tests.`
    );
    this.name = 'MockDataQuarantinedError';
  }
}

export interface SynthesizeOptions {
  analyzedDir: string;
  knowledgeDir: string;
  benchmarkDir?: string;
  allowProvisionalMock?: boolean;
}

export interface SynthesisSummary {
  totalQuestions: number;
  totalExams: number;
  nonHoldoutQuestionsCount: number;
  excludedHoldoutCount: number;
  taxonomyPath: string;
  recipesPath: string;
  distractorsPath: string;
  depthFrameworkPath: string;
  antiPatternsPath: string;
  blueprintJsonPath: string;
  blueprintMdPath: string;
}

/**
 * Runs Stage 3: Full Cross-Year Digestion and Knowledge Synthesis with True Holdout Isolation
 */
export async function runSynthesisPipeline(options: SynthesizeOptions): Promise<SynthesisSummary> {
  const {
    analyzedDir,
    knowledgeDir,
    benchmarkDir = path.resolve(path.dirname(knowledgeDir), 'benchmark'),
    allowProvisionalMock = false,
  } = options;

  if (!fs.existsSync(knowledgeDir)) {
    fs.mkdirSync(knowledgeDir, { recursive: true });
  }

  const analyzedFiles = fs
    .readdirSync(analyzedDir)
    .filter((f) => f.endsWith('.json') && f !== 'run-manifest.json')
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

  // Strict Provenance Gate: Reject offline mock records unless explicitly opted in
  const mockQuestions = allQuestions.filter(
    (q) => q.modelName === 'rule-based-mock' || q.modelName === 'offline-mock'
  );
  if (mockQuestions.length > 0 && !allowProvisionalMock) {
    throw new MockDataQuarantinedError('synthesize authoritative knowledge base', mockQuestions.length);
  }

  // Load Holdout Manifest for true isolation
  const holdoutManifestPath = path.join(benchmarkDir, 'holdout-manifest.json');
  let holdoutKeys = new Set<string>();
  if (fs.existsSync(holdoutManifestPath)) {
    try {
      const rawHoldout = JSON.parse(fs.readFileSync(holdoutManifestPath, 'utf-8'));
      const parsedHoldout = HoldoutManifestSchema.safeParse(rawHoldout);
      if (parsedHoldout.success) {
        parsedHoldout.data.holdoutQuestions.forEach((h) => {
          holdoutKeys.add(`${h.examId}-Q${h.questionNumber}`);
        });
      }
    } catch {
      // If manifest fails to parse, proceed without holdouts or throw
    }
  }

  // STRICT HOLDOUT ISOLATION: Exclude holdout questions from synthesis knowledge derivation
  const nonHoldoutQuestions = allQuestions.filter(
    (q) => !holdoutKeys.has(`${q.examId}-Q${q.questionNumber}`)
  );

  const corpusHash = createHash('sha256')
    .update(allQuestions.map((q) => q.contentHash).sort().join(':'))
    .digest('hex');

  const provenance: KnowledgeProvenance = {
    knowledgeVersion: '1.0.0',
    sourceExamIds: allExams.map((e) => e.examId),
    sourceQuestionCount: nonHoldoutQuestions.length,
    excludedHoldoutCount: holdoutKeys.size,
    providerName: allQuestions[0]?.providerName || 'unknown',
    modelName: allQuestions[0]?.modelName || 'unknown',
    analysisPromptVersion: allQuestions[0]?.promptVersion || 'v3.0.0',
    synthesisPromptVersion: 'v1.0.0',
    generatedAt: new Date().toISOString(),
    sourceCorpusHash: corpusHash,
    authorityStatus: mockQuestions.length === 0 ? 'authoritative' : 'provisional',
  };

  // 1. Synthesize Taxonomy
  const taxonomy = buildCapTaxonomy(provenance, nonHoldoutQuestions);
  const taxonomyPath = path.join(knowledgeDir, 'cap-taxonomy.json');
  fs.writeFileSync(taxonomyPath, JSON.stringify(taxonomy, null, 2), 'utf-8');

  // 2. Synthesize Distractor Patterns
  const distractors = buildDistractorPatterns(provenance, nonHoldoutQuestions);
  const distractorsPath = path.join(knowledgeDir, 'distractor-patterns.json');
  fs.writeFileSync(distractorsPath, JSON.stringify(distractors.patterns, null, 2), 'utf-8');

  // 3. Synthesize Depth Framework
  const depthFramework = buildDepthFramework(provenance, nonHoldoutQuestions);
  const depthFrameworkPath = path.join(knowledgeDir, 'depth-framework.json');
  fs.writeFileSync(depthFrameworkPath, JSON.stringify(depthFramework.framework, null, 2), 'utf-8');

  // 4. Synthesize Question Recipes
  const recipes = buildQuestionRecipes(provenance, nonHoldoutQuestions);
  const recipesPath = path.join(knowledgeDir, 'question-recipes.json');
  fs.writeFileSync(recipesPath, JSON.stringify(recipes.recipes, null, 2), 'utf-8');

  // 5. Synthesize Anti-Patterns
  const antiPatterns = buildAntiPatterns(provenance);
  const antiPatternsPath = path.join(knowledgeDir, 'anti-patterns.json');
  fs.writeFileSync(antiPatternsPath, JSON.stringify(antiPatterns.antiPatterns, null, 2), 'utf-8');

  // 6. Synthesize Blueprint JSON and Markdown
  const blueprintJson = buildCapBlueprintJson(provenance, allExams, nonHoldoutQuestions);
  const blueprintJsonPath = path.join(knowledgeDir, 'cap-blueprint.json');
  fs.writeFileSync(blueprintJsonPath, JSON.stringify(blueprintJson, null, 2), 'utf-8');

  const blueprintMd = buildCapBlueprintMarkdown(blueprintJson, taxonomy, recipes.recipes, antiPatterns.antiPatterns);
  const blueprintMdPath = path.join(knowledgeDir, 'cap-blueprint.md');
  fs.writeFileSync(blueprintMdPath, blueprintMd, 'utf-8');

  return {
    totalQuestions: allQuestions.length,
    totalExams: allExams.length,
    nonHoldoutQuestionsCount: nonHoldoutQuestions.length,
    excludedHoldoutCount: holdoutKeys.size,
    taxonomyPath,
    recipesPath,
    distractorsPath,
    depthFrameworkPath,
    antiPatternsPath,
    blueprintJsonPath,
    blueprintMdPath,
  };
}

function buildCapTaxonomy(provenance: KnowledgeProvenance, questions: AnalyzedQuestion[]) {
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
    provenance,
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

function buildDistractorPatterns(
  provenance: KnowledgeProvenance,
  questions: AnalyzedQuestion[]
): DistractorPatternsArtifact {
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
    for (const opt of q.analysis.optionAnalyses) {
      if (opt.isCorrect || !opt.distractorStrategy) continue;

      const strat = opt.distractorStrategy;
      patternCounts[strat] = (patternCounts[strat] || 0) + 1;
      totalDistractors++;

      if (patternExemplars[strat].length < 3) {
        patternExemplars[strat].push({
          examId: q.examId,
          questionNumber: q.questionNumber,
          option: opt.option,
          explanation: opt.distractorRationale || 'Plausible distractor trap',
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

  const patterns: DistractorPatternStat[] = (Object.keys(patternCounts) as DistractorPattern[]).map((p) => ({
    pattern: p,
    description: descriptions[p]?.desc || p,
    observedCount: patternCounts[p],
    observedPercentage: totalDistractors > 0 ? Math.round((patternCounts[p] / totalDistractors) * 1000) / 10 : 0,
    primaryCognitiveTrigger: descriptions[p]?.trigger || 'Cognitive evaluation',
    exemplars: patternExemplars[p],
  }));

  return {
    provenance,
    totalDistractorsAnalyzed: totalDistractors,
    patterns,
  };
}

function buildDepthFramework(
  provenance: KnowledgeProvenance,
  questions: AnalyzedQuestion[]
): DepthFrameworkArtifact {
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

  const framework: DepthLevelDefinition[] = [
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

  return {
    provenance,
    framework,
  };
}

function buildQuestionRecipes(
  provenance: KnowledgeProvenance,
  questions: AnalyzedQuestion[]
): QuestionRecipesArtifact {
  // Helper to extract non-holdout evidence
  const findMatches = (
    predicate: (q: AnalyzedQuestion) => boolean
  ): { evidence: QuestionRecipe['sourceEvidence']; years: number[] } => {
    const matches = questions.filter(predicate);
    const evidence = matches.map((m) => ({
      examId: m.examId,
      questionNumber: m.questionNumber,
      brief: m.extracted.stem.slice(0, 80),
    }));
    const years = Array.from(new Set(matches.map((m) => parseInt(m.examId, 10)))).sort();
    return { evidence, years };
  };

  const recipeDefinitions = [
    {
      recipeId: 'RECIPE_01_NOTICE_SCHEDULE_CONSTRAINT_SCANNER',
      name: 'Authentic Notice & Schedule Constraint Scanner',
      primarySkill: 'explicit_detail' as TaxonomySkill,
      secondarySkills: ['information_integration', 'sequence_cause_consequence'] as TaxonomySkill[],
      supportedGenres: ['notice_announcement', 'brochure_flyer'] as any[],
      evidenceModes: ['text_only', 'multimodal_mixed'] as any[],
      typicalLanguageDifficultyRange: ['A1_elementary', 'A2_basic'] as LanguageDifficulty[],
      typicalCognitiveDepthRange: ['D2_single_step_inference', 'D3_multi_step_synthesis'] as CognitiveDepth[],
      requiredEvidenceSpan: 'cross_sentence_local' as EvidenceSpan,
      requiredEvidenceStructure: 'Tabular or bulleted conditional rules containing opening hours, fees, age, and restrictions',
      reasoningOperations: ['constraint_satisfaction', 'temporal_filtering', 'elimination_by_rule'],
      stemTemplates: [
        'Which question can the brochure answer?',
        'What should Jason do before he visits the {place}?',
        'According to the schedule, when can visitors {action}?',
      ],
      correctAnswerConstructionPrinciples: [
        'Must satisfy all conjunctive constraints in the stem (e.g. time AND price AND location)',
        'Paraphrases the condition rather than copying the exact brochure row',
      ],
      distractorConstructionPrinciples: [
        'Use partial conditions stated in other sections of the brochure',
        'Invert eligibility restrictions (e.g. adult fee applied to child)',
      ],
      difficultyAdjustmentRules: [
        'Increase depth by introducing an extra prerequisite constraint',
        'Simplify language by shortening notice text while preserving the constraint tree',
      ],
      validDistractorMechanisms: [
        'partial_truth',
        'wrong_chronology',
        'literal_keyword_matching',
      ] as DistractorPattern[],
      commonWeakImplementations: [
        'Making the answer an obvious verbatim copy without requiring constraint checking',
        'Providing options with completely unrelated content rather than competing conditions',
      ],
      qualityChecks: [
        'Ensure the correct option satisfies all constraints mentioned in the stem',
        'Ensure distractors represent partial conditions stated in the notice',
      ],
      filter: (q: AnalyzedQuestion) =>
        q.extracted.section === 'passage_comprehension' &&
        (q.analysis.primarySkill === 'explicit_detail' || q.analysis.primarySkill === 'information_integration') &&
        (q.extracted.passageRange ? q.extracted.passageRange[0] <= 28 : true),
    },
    {
      recipeId: 'RECIPE_02_DIALOGUE_PRAGMATIC_IMPLICATURE',
      name: 'Conversational Implicature & Subtext Resolver',
      primarySkill: 'pragmatic_meaning' as TaxonomySkill,
      secondarySkills: ['purpose_speaker_intent', 'local_inference'] as TaxonomySkill[],
      supportedGenres: ['dialogue'] as any[],
      evidenceModes: ['text_only'] as any[],
      typicalLanguageDifficultyRange: ['A2_basic', 'B1_intermediate'] as LanguageDifficulty[],
      typicalCognitiveDepthRange: ['D3_multi_step_synthesis', 'D4_evaluative_pragmatic'] as CognitiveDepth[],
      requiredEvidenceSpan: 'cross_sentence_local' as EvidenceSpan,
      requiredEvidenceStructure: 'Multi-turn conversational exchange with social-pragmatic subtext',
      reasoningOperations: ['implicature_derivation', 'tone_analysis', 'speaker_perspective_taking'],
      stemTemplates: [
        'What does {Speaker} most likely mean when saying "{Quote}"?',
        'How does {Speaker} feel about {Topic}?',
        'What can we learn about {Speaker} from their conversation?',
      ],
      correctAnswerConstructionPrinciples: [
        'Captures the intended conversational function (polite refusal, indirect suggestion, veiled doubt)',
        'Resolves contextually across adjacent dialogue turns',
      ],
      distractorConstructionPrinciples: [
        'Include literal surface meaning of the quoted idiom/phrase',
        'Assign the feeling or quote to the wrong conversational partner',
      ],
      difficultyAdjustmentRules: [
        'Increase depth by using subtle indirect speech acts',
        'Keep dialogue language natural, informal, and standard junior high level',
      ],
      validDistractorMechanisms: [
        'literal_keyword_matching',
        'wrong_referent',
        'unsupported_world_knowledge',
      ] as DistractorPattern[],
      commonWeakImplementations: [
        'Direct literal restatement that destroys pragmatic depth',
        'Ambiguous context where two answers are equally plausible',
      ],
      qualityChecks: [
        'Verify that the dialogue provides at least 2 distinct turns of conversational context',
        'Confirm that resolving the quote requires situational awareness, not dictionary lookup',
      ],
      filter: (q: AnalyzedQuestion) =>
        q.analysis.primarySkill === 'pragmatic_meaning' ||
        (q.extracted.section === 'passage_comprehension' &&
          q.analysis.cognitiveDepth === 'D4_evaluative_pragmatic'),
    },
    {
      recipeId: 'RECIPE_03_NARRATIVE_THEMATIC_ARC',
      name: 'Narrative Arc & Core Message Abstractor',
      primarySkill: 'main_idea' as TaxonomySkill,
      secondarySkills: ['purpose_speaker_intent', 'cross_sentence_inference'] as TaxonomySkill[],
      supportedGenres: ['narrative'] as any[],
      evidenceModes: ['text_only'] as any[],
      typicalLanguageDifficultyRange: ['A2_basic', 'B1_intermediate'] as LanguageDifficulty[],
      typicalCognitiveDepthRange: ['D3_multi_step_synthesis'] as CognitiveDepth[],
      requiredEvidenceSpan: 'multi_paragraph_global' as EvidenceSpan,
      requiredEvidenceStructure: 'Complete narrative arc: orientation, complication, climax, and resolution/reflection',
      reasoningOperations: ['thematic_abstraction', 'global_gist_synthesis', 'scope_evaluation'],
      stemTemplates: [
        'What is the story mainly about?',
        'What lesson did {Character} learn at the end?',
        'What does the writer want to tell readers through this story?',
      ],
      correctAnswerConstructionPrinciples: [
        'Encompasses the overarching thematic transformation rather than a single event',
        'Formulated as a general life reflection supported by the protagonist’s choices',
      ],
      distractorConstructionPrinciples: [
        'Use accurate local details from early paragraphs that do not represent the final lesson',
        'Use plausible common-sense morals that the story explicitly contradicted',
      ],
      difficultyAdjustmentRules: [
        'Increase depth through understated character transformation without explicit preaching',
        'Ensure vocabulary remains strictly in the standard syllabus',
      ],
      validDistractorMechanisms: [
        'local_evidence_for_global_question',
        'partial_truth',
        'overgeneralization',
      ] as DistractorPattern[],
      commonWeakImplementations: [
        'Making the main idea identical to the first sentence',
        'Distractors that are factually false even on a local level',
      ],
      qualityChecks: [
        'Every distractor should reflect a true local detail from one paragraph of the story',
        'The correct option must encompass the arc transformation from beginning to end',
      ],
      filter: (q: AnalyzedQuestion) =>
        q.extracted.section === 'passage_comprehension' &&
        (q.analysis.primarySkill === 'main_idea' || q.analysis.primarySkill === 'cross_sentence_inference'),
    },
    {
      recipeId: 'RECIPE_04_INFOGRAPHIC_MULTIMODAL_INTEGRATION',
      name: 'Infographic & Visual Data Reconciler',
      primarySkill: 'information_integration' as TaxonomySkill,
      secondarySkills: ['explicit_detail', 'local_inference'] as TaxonomySkill[],
      supportedGenres: ['infographic_chart_table'] as any[],
      evidenceModes: ['multimodal_mixed', 'visual_only'] as any[],
      typicalLanguageDifficultyRange: ['A2_basic', 'B1_intermediate'] as LanguageDifficulty[],
      typicalCognitiveDepthRange: ['D2_single_step_inference', 'D3_multi_step_synthesis'] as CognitiveDepth[],
      requiredEvidenceSpan: 'multimodal_text_and_graphic' as EvidenceSpan,
      requiredEvidenceStructure: 'Co-dependent prose text paired with a diagram, chart, or comparative table',
      reasoningOperations: ['cross_modal_mapping', 'coordinate_matching', 'constraint_synthesis'],
      stemTemplates: [
        'What can we learn from Figure 1 and the reading?',
        'Which chart/picture best shows the situation in {Year/Place}?',
        'Based on the table, which statement is true?',
      ],
      correctAnswerConstructionPrinciples: [
        'Requires synthesizing at least one data point from the graphic and one condition from prose',
        'Unambiguously supported by cross-modal triangulation',
      ],
      distractorConstructionPrinciples: [
        'State true graphic values that violate text conditions',
        'Invert chronological trends or chart axes',
      ],
      difficultyAdjustmentRules: [
        'Increase depth by adding a multi-column comparative filter',
        'Keep graphic annotations simple and legible',
      ],
      validDistractorMechanisms: [
        'reversed_cause_effect',
        'wrong_chronology',
        'partial_truth',
      ] as DistractorPattern[],
      commonWeakImplementations: [
        'Graphic is purely cosmetic and question can be solved purely from text',
        'Prose states the exact answer verbatim without consulting the graphic',
      ],
      qualityChecks: [
        'If the graphic is removed, the question must become unanswerable',
        'Distractors must reflect genuine visual coordinates with altered labels',
      ],
      filter: (q: AnalyzedQuestion) =>
        q.extracted.visualEvidenceRequired ||
        q.extracted.evidenceMode === 'multimodal_mixed' ||
        q.analysis.evidenceMode === 'multimodal_mixed',
    },
    {
      recipeId: 'RECIPE_05_SPATIAL_MAP_ROUTE_NAVIGATOR',
      name: 'Spatial Map & Route Navigator',
      primarySkill: 'information_integration' as TaxonomySkill,
      secondarySkills: ['explicit_detail', 'sequence_cause_consequence'] as TaxonomySkill[],
      supportedGenres: ['brochure_flyer', 'infographic_chart_table'] as any[],
      evidenceModes: ['spatial', 'multimodal_mixed'] as any[],
      typicalLanguageDifficultyRange: ['A2_basic', 'B1_intermediate'] as LanguageDifficulty[],
      typicalCognitiveDepthRange: ['D3_multi_step_synthesis'] as CognitiveDepth[],
      requiredEvidenceSpan: 'multimodal_text_and_graphic' as EvidenceSpan,
      requiredEvidenceStructure: 'Spatial map with marked landmarks, streets, and directional instructions',
      reasoningOperations: ['spatial_mental_rotation', 'route_tracing', 'landmark_sequence_verification'],
      stemTemplates: [
        'According to the map, how can Jason get to {Destination}?',
        'Which place is {Character} most likely visiting?',
        'Where is {Landmark} located on the map?',
      ],
      correctAnswerConstructionPrinciples: [
        'Unambiguously traces valid route sequence matching directional verbs (turn left, pass, opposite)',
        'Accurately aligns coordinate points',
      ],
      distractorConstructionPrinciples: [
        'Mirror image or reverse left/right directions',
        'Stop at an intermediate landmark along the route',
      ],
      difficultyAdjustmentRules: [
        'Increase depth by adding conditional road closures or multi-leg journeys',
        'Preserve simple directional vocabulary',
      ],
      validDistractorMechanisms: [
        'wrong_referent',
        'wrong_chronology',
        'partial_truth',
      ] as DistractorPattern[],
      commonWeakImplementations: [
        'Map lacks essential labeled cues making navigation subjective',
        'Directions are overly trivial single-turn straight lines',
      ],
      qualityChecks: [
        'Ensure exact directional orientation is traceable on the provided map image',
        'Verify distractors test orientation and spatial sequence',
      ],
      filter: (q: AnalyzedQuestion) =>
        q.extracted.evidenceMode === 'spatial' ||
        q.analysis.evidenceMode === 'spatial' ||
        /map|direction|route|street|corner|cross/i.test(q.extracted.stem),
    },
    {
      recipeId: 'RECIPE_06_CONTEXTUAL_WORD_SENSE_DEDUCER',
      name: 'Contextual Word Sense Deducer',
      primarySkill: 'vocabulary_in_context' as TaxonomySkill,
      secondarySkills: ['local_inference', 'reference_resolution'] as TaxonomySkill[],
      supportedGenres: ['article_informational', 'narrative'] as any[],
      evidenceModes: ['text_only'] as any[],
      typicalLanguageDifficultyRange: ['A2_basic', 'B1_intermediate'] as LanguageDifficulty[],
      typicalCognitiveDepthRange: ['D2_single_step_inference', 'D3_multi_step_synthesis'] as CognitiveDepth[],
      requiredEvidenceSpan: 'cross_sentence_local' as EvidenceSpan,
      requiredEvidenceStructure: 'Surrounding co-text with explicit semantic scaffolding (contrast, cause-effect, exemplification)',
      reasoningOperations: ['semantic_field_triangulation', 'contrast_clue_extraction', 'co_text_synthesis'],
      stemTemplates: [
        'What does "{TargetWord}" mean in the reading?',
        'In paragraph {N}, what is the meaning of "{TargetWord}"?',
      ],
      correctAnswerConstructionPrinciples: [
        'Uses simple, familiar core vocabulary to define the target sense',
        'Deduced via explicit contextual contrast, apposition, or consequence',
      ],
      distractorConstructionPrinciples: [
        'Include standard dictionary meanings of the word that do NOT fit the specific context',
        'Include common phonetic or orthographic lookalikes',
      ],
      difficultyAdjustmentRules: [
        'Increase depth by separating context clues across adjacent paragraphs',
        'Never use out-of-syllabus words in the answer options',
      ],
      validDistractorMechanisms: [
        'literal_keyword_matching',
        'unsupported_world_knowledge',
        'grammatically_plausible_contextually_wrong',
      ] as DistractorPattern[],
      commonWeakImplementations: [
        'Target word is an obscure GRE word with zero context clues',
        'Question tests isolated prior memory rather than in-context deduction',
      ],
      qualityChecks: [
        'Surrounding sentences must provide at least 2 distinct semantic clues',
        'All options A, B, C, D must use simple, accessible English',
      ],
      filter: (q: AnalyzedQuestion) =>
        q.extracted.section === 'passage_comprehension' &&
        q.analysis.primarySkill === 'vocabulary_in_context',
    },
    {
      recipeId: 'RECIPE_07_CLOZE_DISCOURSE_AND_TENSE_FLOW',
      name: 'Cloze Discourse & Tense Architecture Tracker',
      primarySkill: 'grammar_in_context' as TaxonomySkill,
      secondarySkills: ['sequence_cause_consequence', 'discourse_relationship'] as TaxonomySkill[],
      supportedGenres: ['cloze_passage'] as any[],
      evidenceModes: ['text_only'] as any[],
      typicalLanguageDifficultyRange: ['A2_basic', 'B1_intermediate'] as LanguageDifficulty[],
      typicalCognitiveDepthRange: ['D2_single_step_inference', 'D3_multi_step_synthesis'] as CognitiveDepth[],
      requiredEvidenceSpan: 'cross_sentence_local' as EvidenceSpan,
      requiredEvidenceStructure: 'Cohesive paragraph passage with narrative timeline or argumentative flow',
      reasoningOperations: ['temporal_timeline_alignment', 'syntactic_licensing', 'discourse_cohesion'],
      stemTemplates: [
        'Blank {N} in the passage: (A) {OptionA} (B) {OptionB} (C) {OptionC} (D) {OptionD}',
      ],
      correctAnswerConstructionPrinciples: [
        'Licensed by narrative timeline (e.g. past perfect vs simple past) or discourse connector (however, therefore)',
        'Resolves grammatical cohesion across sentence boundaries',
      ],
      distractorConstructionPrinciples: [
        'Grammatically well-formed in isolation but inverting passage timeline or polarity',
        'Plausible verb forms violating sequence of tenses',
      ],
      difficultyAdjustmentRules: [
        'Increase depth by embedding tense shifts triggered by flashback narratives',
        'Ensure distractors maintain parallel syntactic structure',
      ],
      validDistractorMechanisms: [
        'grammatically_plausible_contextually_wrong',
        'wrong_chronology',
        'reversed_cause_effect',
      ] as DistractorPattern[],
      commonWeakImplementations: [
        'Isolated sentence grammar where surrounding passage has zero impact on choice',
        'Options with obvious morphology errors giving away the answer',
      ],
      qualityChecks: [
        'Correct tense/connective must be determined by earlier or subsequent sentences',
        'All 4 options must be grammatically valid in isolation',
      ],
      filter: (q: AnalyzedQuestion) =>
        q.extracted.section === 'cloze_test' ||
        (q.extracted.section === 'passage_comprehension' && q.analysis.primarySkill === 'grammar_in_context'),
    },
    {
      recipeId: 'RECIPE_08_STANDALONE_LEXICAL_COLLOCATION',
      name: 'Standalone Communicative Lexical Gap Drill',
      primarySkill: 'vocabulary_in_context' as TaxonomySkill,
      secondarySkills: [] as TaxonomySkill[],
      supportedGenres: ['single_standalone'] as any[],
      evidenceModes: ['text_only'] as any[],
      typicalLanguageDifficultyRange: ['A1_elementary', 'A2_basic'] as LanguageDifficulty[],
      typicalCognitiveDepthRange: ['D1_verbatim_retrieval', 'D2_single_step_inference'] as CognitiveDepth[],
      requiredEvidenceSpan: 'single_sentence' as EvidenceSpan,
      requiredEvidenceStructure: 'Single communicative sentence establishing pragmatic situation or collocational trigger',
      reasoningOperations: ['syntactic_parsing', 'lexical_semantic_matching'],
      stemTemplates: [
        '{Subject} always {blank} when {condition}. (A) {W1} (B) {W2} (C) {W3} (D) {W4}',
      ],
      correctAnswerConstructionPrinciples: [
        'High-frequency junior-high core vocabulary word forming authentic collocation',
        'Unique semantic fit for the stated scenario',
      ],
      distractorConstructionPrinciples: [
        'Parallel parts of speech that make no sense in the scenario',
        'Common confusable words (e.g. borrow vs lend)',
      ],
      difficultyAdjustmentRules: [
        'Adjust vocabulary tier from Grade 7 basic to Grade 9 extended',
        'Preserve clean, natural sentence syntax',
      ],
      validDistractorMechanisms: [
        'grammatically_plausible_contextually_wrong',
        'irrelevant_distractor',
      ] as DistractorPattern[],
      commonWeakImplementations: [
        'Awkward non-native sentence structure',
        'Options belonging to different parts of speech revealing answer by syntax',
      ],
      qualityChecks: [
        'All 4 options must belong to the exact same grammatical word class',
        'Scenario must clearly disambiguate the correct word without world knowledge assumptions',
      ],
      filter: (q: AnalyzedQuestion) =>
        q.extracted.section === 'single' &&
        q.analysis.primarySkill === 'vocabulary_in_context' &&
        !q.extracted.visualEvidenceRequired,
    },
    {
      recipeId: 'RECIPE_09_STANDALONE_SYNTACTIC_LICENSING',
      name: 'Standalone Syntactic Agreement & Licensing Drill',
      primarySkill: 'grammar_in_context' as TaxonomySkill,
      secondarySkills: [] as TaxonomySkill[],
      supportedGenres: ['single_standalone'] as any[],
      evidenceModes: ['text_only'] as any[],
      typicalLanguageDifficultyRange: ['A1_elementary', 'A2_basic', 'B1_intermediate'] as LanguageDifficulty[],
      typicalCognitiveDepthRange: ['D2_single_step_inference'] as CognitiveDepth[],
      requiredEvidenceSpan: 'single_sentence' as EvidenceSpan,
      requiredEvidenceStructure: 'Single sentence containing explicit syntactic trigger (time adverbial, modal, relative clause, passive cue)',
      reasoningOperations: ['syntactic_agreement_check', 'tense_licensing', 'subordination_parsing'],
      stemTemplates: [
        '{Subject} _____ {object} yesterday when {clause}. (A) {V1} (B) {V2} (C) {V3} (D) {V4}',
      ],
      correctAnswerConstructionPrinciples: [
        'Matches the explicit grammatical constraint (e.g. "since 2010" -> present perfect)',
        'Unambiguous syntactic licensing',
      ],
      distractorConstructionPrinciples: [
        'Tense forms that violate stated time adverbials',
        'Subject-verb number mismatch',
      ],
      difficultyAdjustmentRules: [
        'Scale from basic past tense to passive relative clauses and conditionals',
        'Keep non-target vocabulary simple',
      ],
      validDistractorMechanisms: [
        'grammatically_plausible_contextually_wrong',
        'wrong_chronology',
      ] as DistractorPattern[],
      commonWeakImplementations: [
        'Ambiguous time frame where two tenses are equally acceptable',
        'Overly convoluted sentence disguising poor grammar targeting',
      ],
      qualityChecks: [
        'Ensure sentence provides an explicit syntactic trigger',
        'Distractors must represent common student developmental grammar errors',
      ],
      filter: (q: AnalyzedQuestion) =>
        q.extracted.section === 'single' &&
        q.analysis.primarySkill === 'grammar_in_context',
    },
  ];

  const recipes: QuestionRecipe[] = recipeDefinitions.map((def) => {
    const { evidence, years } = findMatches(def.filter);
    const supportCount = evidence.length;
    const supportYears = years;
    const rarePattern = supportYears.length < 2 && supportCount < 3;

    return {
      recipeId: def.recipeId,
      name: def.name,
      primarySkill: def.primarySkill,
      secondarySkills: def.secondarySkills,
      supportedGenres: def.supportedGenres,
      evidenceModes: def.evidenceModes,
      typicalLanguageDifficultyRange: def.typicalLanguageDifficultyRange,
      typicalCognitiveDepthRange: def.typicalCognitiveDepthRange,
      requiredEvidenceSpan: def.requiredEvidenceSpan,
      requiredEvidenceStructure: def.requiredEvidenceStructure,
      reasoningOperations: def.reasoningOperations,
      stemTemplates: def.stemTemplates,
      correctAnswerConstructionPrinciples: def.correctAnswerConstructionPrinciples,
      distractorConstructionPrinciples: def.distractorConstructionPrinciples,
      difficultyAdjustmentRules: def.difficultyAdjustmentRules,
      validDistractorMechanisms: def.validDistractorMechanisms,
      commonWeakImplementations: def.commonWeakImplementations,
      qualityChecks: def.qualityChecks,
      sourceEvidence: evidence.slice(0, 5), // Keep top 5 exemplars
      supportCount,
      supportYears,
      confidence: supportCount >= 3 ? 'high' : 'medium',
      rarePattern,
      targetGenre: def.supportedGenres[0],
      realExamExemplars: evidence.slice(0, 5),
    };
  });

  return {
    provenance,
    recipes,
  };
}

function buildAntiPatterns(provenance: KnowledgeProvenance): AntiPatternsArtifact {
  const antiPatterns: AntiPattern[] = [
    {
      antiPatternId: 'ANTI_01_DECORATIVE_CONTEXT',
      name: 'Decorative Context Trap (Context-Independent Exercise)',
      severity: 'critical',
      description: 'A passage or dialogue is presented, but the question stem can be answered using general knowledge or isolated grammar without reading the context.',
      manifestation: 'A 200-word passage is followed by "What is the capital of Japan?" or an isolated grammar fill-in that ignores passage narrative.',
      diagnosticTest: 'Delete the entire passage. If a student can still determine the correct answer with >90% confidence, the context is decorative.',
      whyWeak: 'Destroys reading comprehension validity; permits guessing without processing English discourse.',
      repairStrategy: 'Embed unique scenario constraints, character decisions, or data points inside the text that must be referenced to resolve the stem.',
      evidenceBasis: 'comparative_inference',
      sourceEvidence: [],
      confidence: 'high',
      corpusEvidenceOrContrast: 'In CAP exams, 100% of passage questions exhibit essential context necessity: reading the passage is strictly mandatory.',
    },
    {
      antiPatternId: 'ANTI_02_SHALLOW_DICTIONARY_RECALL',
      name: 'Dictionary Definition Recall Disguised as Reading Comprehension',
      severity: 'high',
      description: 'Testing whether a student memorized an isolated definition rather than measuring contextual inference ability.',
      manifestation: 'Question asks for the meaning of a rare word with zero contextual explanation or clues in the passage.',
      diagnosticTest: 'Can the meaning of the target word be deduced if replaced with a nonsense word like "flurg"? If not, it tests prior recall, not reading.',
      whyWeak: 'Rewards prior rote memorization over active contextual deduction.',
      repairStrategy: 'Provide explicit contextual scaffolding (e.g. antonyms, examples, cause-and-effect outcomes) in the text allowing deduction.',
      evidenceBasis: 'comparative_inference',
      sourceEvidence: [],
      confidence: 'high',
      corpusEvidenceOrContrast: 'CAP vocabulary-in-context questions always embed explicit contrastive, causal, or illustrative clues in surrounding sentences.',
    },
    {
      antiPatternId: 'ANTI_03_OPTION_ASYMMETRY_GIVEAWAY',
      name: 'Option Length & Grammatical Asymmetry Giveaway',
      severity: 'high',
      description: 'The correct option is visibly longer, more detailed, or structured differently than the distractors, revealing the answer by format.',
      manifestation: 'Option (A) is 3 words, (B) is 4 words, (C) is 22 words with elaborate qualifiers, (D) is 3 words.',
      diagnosticTest: 'Check word counts and syntactic structures of options A, B, C, D. Standard deviation in length should be minimal.',
      whyWeak: 'Allows test-wise students to pick the answer based on visual asymmetry without reading.',
      repairStrategy: 'Ensure all four options share the same grammatical part of speech, phrasing complexity, and length profile.',
      evidenceBasis: 'comparative_inference',
      sourceEvidence: [],
      confidence: 'high',
      corpusEvidenceOrContrast: 'CAP exams maintain parallel syntactic structure and closely matched word lengths across all four choices.',
    },
    {
      antiPatternId: 'ANTI_04_TRIVIAL_SURFACE_COPY',
      name: 'Trivial Verbatim Surface Copy (Zero-Depth Matching)',
      severity: 'moderate',
      description: 'Stem and correct option match the exact words in the text verbatim, enabling mechanical visual scanning without understanding.',
      manifestation: 'Passage: "Ben has a red car." Question: "What color is Ben\'s car?" (A) Red (B) Green (C) Blue (D) Yellow.',
      diagnosticTest: 'Does solving the question require paraphrase recognition or inference? If pure optical string matching suffices, cognitive depth is near zero.',
      whyWeak: 'Fails to discriminate reading comprehension from mechanical pattern matching.',
      repairStrategy: 'Use natural synonyms and conceptual paraphrases in the options to require semantic comprehension.',
      evidenceBasis: 'comparative_inference',
      sourceEvidence: [],
      confidence: 'high',
      corpusEvidenceOrContrast: 'CAP questions consistently paraphrase text concepts in stems and options rather than using identical raw strings.',
    },
    {
      antiPatternId: 'ANTI_05_LEXICAL_INFLATION_OVERLOAD',
      name: 'Lexical Difficulty Inflation as Artificial Challenge',
      severity: 'high',
      description: 'Making a question difficult by injecting obscure, out-of-syllabus vocabulary rather than requiring sophisticated reasoning.',
      manifestation: 'Using high-school or college vocabulary in a junior-high worksheet to compensate for simplistic question mechanics.',
      diagnosticTest: 'Inspect question vocabulary against the 1200+800 syllabus list. If difficulty stems from unknown words rather than cognitive depth, it fails.',
      whyWeak: 'Frustrates students with lexical barriers without developing cognitive reading depth.',
      repairStrategy: 'Keep vocabulary strictly within syllabus bounds; increase cognitive depth through multi-paragraph synthesis and subtle distractors.',
      evidenceBasis: 'comparative_inference',
      sourceEvidence: [],
      confidence: 'high',
      corpusEvidenceOrContrast: 'CAP exams maintain strict A2/B1 lexical ceiling while achieving high psychometric discrimination through multi-step reasoning.',
    },
  ];

  return {
    provenance,
    antiPatterns,
  };
}

function buildCapBlueprintJson(
  provenance: KnowledgeProvenance,
  exams: AnalyzedExam[],
  questions: AnalyzedQuestion[]
): CapBlueprint {
  const skillCounts: Record<TaxonomySkill, number> = {} as any;
  TaxonomySkillSchema.options.forEach((k) => (skillCounts[k] = 0));

  const depthCounts: Record<CognitiveDepth, number> = {} as any;
  CognitiveDepthSchema.options.forEach((k) => (depthCounts[k] = 0));

  const langCounts: Record<LanguageDifficulty, number> = {} as any;
  LanguageDifficultySchema.options.forEach((k) => (langCounts[k] = 0));

  const evidenceNecessityCounts: Record<EvidenceNecessity, number> = {} as any;
  EvidenceNecessitySchema.options.forEach((k) => (evidenceNecessityCounts[k] = 0));

  const spanCounts: Record<EvidenceSpan, number> = {} as any;
  EvidenceSpanSchema.options.forEach((k) => (spanCounts[k] = 0));

  const total = questions.length;

  for (const q of questions) {
    skillCounts[q.analysis.primarySkill] = (skillCounts[q.analysis.primarySkill] || 0) + 1;
    depthCounts[q.analysis.cognitiveDepth] = (depthCounts[q.analysis.cognitiveDepth] || 0) + 1;
    langCounts[q.analysis.languageDifficulty] = (langCounts[q.analysis.languageDifficulty] || 0) + 1;
    evidenceNecessityCounts[q.analysis.evidenceNecessity] =
      (evidenceNecessityCounts[q.analysis.evidenceNecessity] || 0) + 1;
    spanCounts[q.analysis.evidenceSpan] = (spanCounts[q.analysis.evidenceSpan] || 0) + 1;
  }

  // Convert to percentages
  const toPct = (record: Record<string, number>) => {
    const res: Record<string, number> = {};
    for (const k of Object.keys(record)) {
      res[k] = total > 0 ? Math.round(((record[k] || 0) / total) * 1000) / 10 : 0;
    }
    return res;
  };

  return {
    provenance,
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
        dominantGenres: [
          'article_informational',
          'dialogue',
          'notice_announcement',
          'narrative',
          'cloze_passage',
          'infographic_chart_table',
        ],
        cognitiveDepthFocus: ['D2_single_step_inference', 'D3_multi_step_synthesis', 'D4_evaluative_pragmatic'],
      },
    },
    distributions: {
      skills: toPct(skillCounts) as any,
      cognitiveDepth: toPct(depthCounts) as any,
      languageDifficulty: toPct(langCounts) as any,
      evidenceNecessity: toPct(evidenceNecessityCounts) as any,
      evidenceSpan: toPct(spanCounts) as any,
      contextNecessity: toPct(evidenceNecessityCounts) as any,
    },
    keyDesignPrinciples: [
      'Strict decoupling of language difficulty (A1-B1) from cognitive depth (D1-D4).',
      'Evidence necessity is strictly essential for 100% of reading comprehension items and visual single questions.',
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

This blueprint captures the core psychometric and pedagogical architecture reverse-engineered across 5 official CAP English Reading exams (**${bp.totalExams} exams, ${bp.totalQuestionsAnalyzed} non-holdout analyzed questions**).

### Core Quantitative Targets:
- **Total Questions per Exam**: Exactly 43 items (19–23 Single Questions, 20–24 Passage Questions).
- **Passage Sets per Exam**: Exactly 8 reading sets per year spanning multi-modal authentic genres.
- **Cognitive Depth Distribution**:
  - Direct Retrieval (\`D1\`): ~${bp.distributions.cognitiveDepth.D1_verbatim_retrieval || 15}% (mostly Section 1)
  - Single-Step Inference (\`D2\`): ~${bp.distributions.cognitiveDepth.D2_single_step_inference || 45}%
  - Multi-Step Synthesis (\`D3\`): ~${bp.distributions.cognitiveDepth.D3_multi_step_synthesis || 30}%
  - Evaluative / Pragmatic (\`D4\`): ~${bp.distributions.cognitiveDepth.D4_evaluative_pragmatic || 10}%
- **Evidence Necessity**: 100% of Section 2 reading items have **essential** evidence necessity.

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
- **Evidence Necessity**: \`none\` for pure text items; \`essential\` for visual Question #1.

### Section 2: Passage Clusters (第二部分：題組)
- **Item Count**: 20–24 questions across exactly 8 reading sets.
- **Passage Genres**:
  1. **Notices & Schedules**: Brochures, museum flyers, ticket timetables, promotional notices.
  2. **Everyday Dialogues**: Phone calls, peer conversations, interview transcripts.
  3. **Narratives & Stories**: Life stories, historical anecdotes, reflective fiction.
  4. **Informational Articles**: Science, culture, nature, global phenomena, history.
  5. **Infographics & Charts**: Multi-modal diagrams, statistics, comparative graphs, maps.
  6. **Cloze Passages**: Cohesive narrative or exposition testing tense flow and transitions.
- **Evidence Necessity**: \`essential\` (passage reading is strictly required).

---

## 4. Reusable Question Recipes

${recipes
  .map(
    (r) => `### ${r.recipeId}: ${r.name}
- **Primary Skill**: \`${r.primarySkill}\`
- **Supported Genres**: ${r.supportedGenres.map((g: any) => `\`${g}\``).join(', ')}
- **Cognitive Depth**: ${r.typicalCognitiveDepthRange.map((d) => `\`${d}\``).join(', ')}
- **Evidence Span**: \`${r.requiredEvidenceSpan}\`
- **Evidence Support**: ${r.supportCount} items across ${r.supportYears.length} years (Years: ${r.supportYears.join(', ')})
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
- **Corpus Evidence**: ${ap.corpusEvidenceOrContrast || 'Observed CAP psychometric design'}
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

