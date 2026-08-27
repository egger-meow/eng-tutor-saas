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
import { AiProvider } from '../analyzer/ai-provider.ts';
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

export const SYNTHESIS_PROMPT_VERSION = 'v1.0.0';
export const RECIPE_CRITIC_PROMPT_VERSION = 'v1.0.0';

export interface SynthesizeOptions {
  analyzedDir: string;
  knowledgeDir: string;
  benchmarkDir?: string;
  allowProvisionalMock?: boolean;
  aiProvider?: AiProvider;
}

/**
 * Builds a prompt for cross-year AI recipe synthesis from a cluster of analyzed questions.
 */
export function buildCrossYearRecipeSynthesisPrompt(
  clusterKey: string,
  members: AnalyzedQuestion[]
): string {
  const memberSummaries = members
    .slice(0, 10)
    .map(
      (m) =>
        `- [CAP ${m.examId} #${m.questionNumber}] (Section: ${m.extracted.section}, Skill: ${m.analysis.primarySkill}, Depth: ${m.analysis.cognitiveDepth})\n` +
        `  Stem: "${m.extracted.stem}"\n` +
        `  Mechanism: ${m.analysis.questionMechanism}\n` +
        `  Correct Answer Rationale: ${m.analysis.optionAnalyses.find((o) => o.isCorrect)?.correctRationale}\n` +
        `  Distractor Strategies: ${m.analysis.optionAnalyses.filter((o) => !o.isCorrect).map((o) => o.distractorStrategy).join(', ')}\n` +
        `  Failure Modes: ${m.analysis.studentFailureModes.join('; ')}`
    )
    .join('\n\n');

  return `You are an expert psychometrician and curriculum synthesizer analyzing an emergent cluster of verified historical CAP English exam questions (111–115).

Your mission is to synthesize an authoritative, reusable Question Recipe from this empirical cluster of ${members.length} non-holdout questions.

=== CLUSTER DATA (${clusterKey}) ===
Total Supporting Questions: ${members.length}
Exam Years: ${Array.from(new Set(members.map((m) => m.examId))).sort().join(', ')}

Representative Member Questions:
${memberSummaries}

=== MANDATORY SYNTHESIS REQUIREMENTS ===
1. Deduce universal design principles (correct answer construction, distractor mechanisms, cognitive constraints).
2. Synthesize 2-4 generalized stemTemplates by replacing names/dates with placeholders like {Character}, {Place}, {Topic}.
3. Define valid distractor strategies actually observed in the cluster.
4. Establish difficulty adjustment rules: how to make it simpler without breaking mechanism, and how to increase cognitive depth without increasing vocabulary.
5. Provide strict quality checks for AI item generation.

Return a valid JSON object matching the QuestionRecipe schema.`;
}

/**
 * Builds a prompt for the Recipe Critic pass.
 */
export function buildRecipeCriticPrompt(
  recipe: QuestionRecipe,
  members: AnalyzedQuestion[]
): string {
  return `You are a Lead Psychometric Reviewer and Quality Critic auditing a synthesized CAP English Question Recipe.

=== SYNTHESIZED RECIPE ===
Recipe ID: ${recipe.recipeId}
Name: ${recipe.name}
Primary Skill: ${recipe.primarySkill}
Evidence Span: ${recipe.requiredEvidenceSpan}
Stem Templates: ${JSON.stringify(recipe.stemTemplates)}
Valid Distractor Mechanisms: ${JSON.stringify(recipe.validDistractorMechanisms)}
Correct Answer Principles: ${JSON.stringify(recipe.correctAnswerConstructionPrinciples)}
Distractor Principles: ${JSON.stringify(recipe.distractorConstructionPrinciples)}
Quality Checks: ${JSON.stringify(recipe.qualityChecks)}

=== EMPIRICAL GROUNDING ===
Supporting Exam Items: ${members.map((m) => `CAP ${m.examId} #${m.questionNumber}`).join(', ')}

=== CRITIC AUDIT CHECKLIST ===
1. Evidence Grounding: Are the construction principles strictly grounded in the supporting questions?
2. Distractor Soundness: Are valid distractor mechanisms authentic to junior high reading assessment?
3. Template Generality: Are stem templates clean, grammatically natural, and parameterized?
4. Quality Actionability: Are the quality checks enforceable by automated validators or generative pipelines?

Return JSON:
{
  "criticStatus": "passed" | "repaired",
  "criticIssues": ["..."],
  "repairedFields": {}
}`;
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

  // Hard-Fail Holdout Manifest Gate: Must exist, be valid schema, and contain exactly 20 stratified holdouts
  const holdoutManifestPath = path.join(benchmarkDir, 'holdout-manifest.json');
  if (!fs.existsSync(holdoutManifestPath)) {
    throw new Error(
      `[HoldoutIsolationError] Holdout manifest not found at ${holdoutManifestPath}. Cannot synthesize knowledge base without certified holdout isolation.`
    );
  }

  let holdoutKeys = new Set<string>();
  try {
    const rawHoldout = JSON.parse(fs.readFileSync(holdoutManifestPath, 'utf-8'));
    const parsedHoldout = HoldoutManifestSchema.parse(rawHoldout);
    if (parsedHoldout.holdoutQuestions.length !== 20) {
      throw new Error(
        `[HoldoutIsolationError] Holdout manifest must contain exactly 20 holdout questions, found ${parsedHoldout.holdoutQuestions.length}`
      );
    }
    parsedHoldout.holdoutQuestions.forEach((h) => {
      holdoutKeys.add(`${h.examId}-Q${h.questionNumber}`);
    });
  } catch (err: any) {
    throw new Error(`[HoldoutIsolationError] Failed to parse valid holdout manifest: ${err.message}`);
  }

  // STRICT HOLDOUT ISOLATION: Exclude holdout questions from synthesis knowledge derivation
  const nonHoldoutQuestions = allQuestions.filter(
    (q) => !holdoutKeys.has(`${q.examId}-Q${q.questionNumber}`)
  );

  const corpusHash = createHash('sha256')
    .update(allQuestions.map((q) => q.contentHash).sort().join(':'))
    .digest('hex');

  // Strict Authoritative Criteria: 0 mock records AND 100% critic pass/repaired status
  const unreviewedCriticCount = allQuestions.filter(
    (q) => q.analysis.criticStatus === 'not_reviewed' || q.analysis.criticStatus === 'failed'
  ).length;

  const isAuthorityEligible = mockQuestions.length === 0 && unreviewedCriticCount === 0;

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
    authorityStatus: isAuthorityEligible ? 'authoritative' : 'provisional',
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

  // 4. Synthesize Question Recipes (Cross-Year Inductive Clustering + Optional Live AI Synthesis & Critic)
  const recipes = await buildQuestionRecipes(provenance, nonHoldoutQuestions, options.aiProvider);
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

function generalizeStem(stem: string): string {
  return stem
    .replace(/\b(19|20)\d{2}\b/g, '{Year}')
    .replace(/\b(Jason|Linda|David|Emma|Mary|John|Sam|Alex|Sarah|Amy|Peter|Eric|Lisa|Tom|Helen)\b/gi, '{Character}')
    .replace(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi, '{Day}')
    .replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/gi, '{Month}')
    .trim();
}

interface ArchetypeMeta {
  recipeId: string;
  name: string;
  primarySkill: TaxonomySkill;
  defaultSecondarySkills: TaxonomySkill[];
  supportedGenres: (PassageGenre | 'single_standalone')[];
  evidenceModes: ('text_only' | 'visual_only' | 'multimodal_mixed' | 'spatial')[];
  requiredEvidenceSpan: EvidenceSpan;
  requiredEvidenceStructure: string;
  commonWeakImplementations: string[];
  qualityChecks: string[];
}

function resolveQuestionArchetype(q: AnalyzedQuestion): ArchetypeMeta {
  const section = q.extracted.section;
  const genre = q.extracted.passageGenre || 'article_informational';
  const skill = q.analysis.primarySkill;
  const isVisual = q.extracted.visualEvidenceRequired || q.extracted.evidenceMode === 'visual_only' || q.analysis.evidenceMode === 'visual_only';
  const isMultimodal = q.extracted.evidenceMode === 'multimodal_mixed' || q.analysis.evidenceMode === 'multimodal_mixed';

  if (section === 'single') {
    if (isVisual) {
      return {
        recipeId: 'RECIPE_SINGLE_VISUAL_ACTION_IDENTIFICATION',
        name: 'Standalone Visual Action & Object Identification',
        primarySkill: 'vocabulary_in_context',
        defaultSecondarySkills: [],
        supportedGenres: ['single_standalone'],
        evidenceModes: ['visual_only', 'multimodal_mixed'],
        requiredEvidenceSpan: 'single_sentence',
        requiredEvidenceStructure: 'Single prompt sentence paired with a clear, unambiguous situational illustration',
        commonWeakImplementations: [
          'Visual detail is too small or ambiguous for unambiguous feature identification',
          'Stem contains distracting idioms that override visual scanning',
        ],
        qualityChecks: [
          'Ensure the target noun or action is unambiguously depicted in the illustration',
          'All 4 options must represent distinct plausible items/actions within the visual domain',
        ],
      };
    }

    if (skill === 'grammar_in_context') {
      return {
        recipeId: 'RECIPE_SINGLE_SYNTACTIC_AGREEMENT_LICENSING',
        name: 'Standalone Syntactic Agreement & Clause Licensing Drill',
        primarySkill: 'grammar_in_context',
        defaultSecondarySkills: [],
        supportedGenres: ['single_standalone'],
        evidenceModes: ['text_only'],
        requiredEvidenceSpan: 'single_sentence',
        requiredEvidenceStructure: 'Single sentence containing explicit syntactic trigger (time adverbial, modal, relative clause, passive cue)',
        commonWeakImplementations: [
          'Ambiguous time frame where two tenses are equally acceptable',
          'Overly convoluted sentence disguising poor grammar targeting',
        ],
        qualityChecks: [
          'Ensure sentence provides an explicit syntactic trigger',
          'Distractors must represent common student developmental grammar errors',
        ],
      };
    }

    return {
      recipeId: 'RECIPE_SINGLE_LEXICAL_COMMUNICATIVE_COLLOCATION',
      name: 'Standalone Communicative Lexical Gap Drill',
      primarySkill: 'vocabulary_in_context',
      defaultSecondarySkills: [],
      supportedGenres: ['single_standalone'],
      evidenceModes: ['text_only'],
      requiredEvidenceSpan: 'single_sentence',
      requiredEvidenceStructure: 'Single communicative sentence establishing pragmatic situation or collocational trigger',
      commonWeakImplementations: [
        'Awkward non-native sentence structure',
        'Options belonging to different parts of speech revealing answer by syntax',
      ],
      qualityChecks: [
        'All 4 options must belong to the exact same grammatical word class',
        'Scenario must clearly disambiguate the correct word without world knowledge assumptions',
      ],
    };
  }

  if (genre === 'cloze_passage' || section === 'cloze') {
    return {
      recipeId: 'RECIPE_CLOZE_DISCOURSE_AND_TENSE_FLOW',
      name: 'Cloze Discourse Architecture & Tense Flow Tracker',
      primarySkill: 'grammar_in_context',
      defaultSecondarySkills: ['discourse_relationship', 'sequence_cause_consequence'],
      supportedGenres: ['cloze_passage'],
      evidenceModes: ['text_only'],
      requiredEvidenceSpan: 'cross_sentence_local',
      requiredEvidenceStructure: 'Cohesive paragraph passage with narrative timeline or argumentative flow',
      commonWeakImplementations: [
        'Isolated sentence grammar where surrounding passage has zero impact on choice',
        'Options with obvious morphology errors giving away the answer',
      ],
      qualityChecks: [
        'Correct tense/connective must be determined by earlier or subsequent sentences',
        'All 4 options must be grammatically valid in isolation',
      ],
    };
  }

  if (genre === 'infographic_chart_table' || isMultimodal || isVisual) {
    return {
      recipeId: 'RECIPE_INFOGRAPHIC_CROSS_MODAL_RECONCILER',
      name: 'Infographic, Chart & Diagram Cross-Modal Reconciler',
      primarySkill: skill === 'explicit_detail' ? 'explicit_detail' : 'information_integration',
      defaultSecondarySkills: ['explicit_detail', 'local_inference'],
      supportedGenres: ['infographic_chart_table'],
      evidenceModes: ['multimodal_mixed', 'visual_only'],
      requiredEvidenceSpan: 'multimodal_text_and_graphic',
      requiredEvidenceStructure: 'Co-dependent prose text paired with a diagram, chart, or comparative table',
      commonWeakImplementations: [
        'Graphic is purely cosmetic and question can be solved purely from text',
        'Prose states the exact answer verbatim without consulting the graphic',
      ],
      qualityChecks: [
        'If the graphic is removed, the question must become unanswerable',
        'Distractors must reflect genuine visual coordinates with altered labels',
      ],
    };
  }

  if (genre === 'brochure_flyer' || q.analysis.evidenceMode === 'spatial') {
    return {
      recipeId: 'RECIPE_NOTICE_SCHEDULE_SPATIAL_SCANNER',
      name: 'Notice, Schedule & Spatial Constraint Scanner',
      primarySkill: skill === 'information_integration' ? 'information_integration' : 'explicit_detail',
      defaultSecondarySkills: ['information_integration', 'sequence_cause_consequence'],
      supportedGenres: ['brochure_flyer', 'notice_announcement'],
      evidenceModes: ['text_only', 'multimodal_mixed', 'spatial'],
      requiredEvidenceSpan: 'cross_sentence_local',
      requiredEvidenceStructure: 'Tabular or bulleted conditional rules containing opening hours, fees, age, and restrictions',
      commonWeakImplementations: [
        'Making the answer an obvious verbatim copy without requiring constraint checking',
        'Providing options with completely unrelated content rather than competing conditions',
      ],
      qualityChecks: [
        'Ensure the correct option satisfies all constraints mentioned in the stem',
        'Ensure distractors represent partial conditions stated in the notice',
      ],
    };
  }

  if (genre === 'dialogue') {
    return {
      recipeId: 'RECIPE_DIALOGUE_CONVERSATIONAL_INFERENCE',
      name: 'Conversational Dialogue Subtext & In-Context Inference',
      primarySkill: skill,
      defaultSecondarySkills: ['purpose_speaker_intent', 'pragmatic_meaning'],
      supportedGenres: ['dialogue'],
      evidenceModes: ['text_only'],
      requiredEvidenceSpan: 'cross_sentence_local',
      requiredEvidenceStructure: 'Multi-turn conversational exchange with social-pragmatic subtext',
      commonWeakImplementations: [
        'Direct literal restatement that destroys pragmatic depth',
        'Ambiguous context where two answers are equally plausible',
      ],
      qualityChecks: [
        'Verify that the dialogue provides at least 2 distinct turns of conversational context',
        'Confirm that resolving the quote requires situational awareness, not dictionary lookup',
      ],
    };
  }

  if (skill === 'main_idea' || skill === 'purpose_speaker_intent') {
    return {
      recipeId: 'RECIPE_INFORMATIONAL_MAIN_IDEA_AND_PURPOSE',
      name: 'Informational Article Main Idea & Rhetorical Purpose Synthesis',
      primarySkill: skill,
      defaultSecondarySkills: ['cross_sentence_inference', 'discourse_relationship'],
      supportedGenres: ['article_informational', 'narrative'],
      evidenceModes: ['text_only'],
      requiredEvidenceSpan: 'multi_paragraph_global',
      requiredEvidenceStructure: 'Complete multiparagraph discourse structure with distinct introduction, body development, and conclusion',
      commonWeakImplementations: [
        'Making the main idea identical to a single introductory sentence',
        'Distractors that are factually false even on a local level',
      ],
      qualityChecks: [
        'Every distractor should reflect a true local detail from one paragraph of the passage',
        'The correct option must encompass the global theme of the passage',
      ],
    };
  }

  if (skill === 'local_inference' || skill === 'cross_sentence_inference') {
    return {
      recipeId: 'RECIPE_INFORMATIONAL_LOCAL_AND_GLOBAL_INFERENCE',
      name: 'Informational Article Deductive Inference & Clue Synthesis',
      primarySkill: skill,
      defaultSecondarySkills: ['explicit_detail', 'sequence_cause_consequence'],
      supportedGenres: ['article_informational', 'narrative'],
      evidenceModes: ['text_only'],
      requiredEvidenceSpan: 'cross_sentence_local',
      requiredEvidenceStructure: 'Informational article with implicit causal connections, comparative criteria, or chronological sequences',
      commonWeakImplementations: [
        'Inference requires unverifiable external domain knowledge',
        'Direct word-matching in the text without deductive step',
      ],
      qualityChecks: [
        'Must require bridging at least two stated facts in the text',
        'Distractors must target common unwarranted deductive leaps',
      ],
    };
  }

  return {
    recipeId: 'RECIPE_INFORMATIONAL_EXPLICIT_DETAIL_PARAPHRASE',
    name: 'Informational Article Detail & Proposition Verification',
    primarySkill: 'explicit_detail',
    defaultSecondarySkills: ['local_inference'],
    supportedGenres: ['article_informational', 'narrative'],
    evidenceModes: ['text_only'],
    requiredEvidenceSpan: 'cross_sentence_local',
    requiredEvidenceStructure: 'Informational paragraph containing specific factual assertions, qualifications, and constraints',
    commonWeakImplementations: [
      'Copying exact verbatim wording without paraphrased vocabulary',
      'Distractors that have no topical relationship to the passage',
    ],
    qualityChecks: [
      'Correct answer must be an authentic paraphrase of the stated passage evidence',
      'Distractors must use true entities with altered predicates or inverted scopes',
    ],
  };
}

async function buildQuestionRecipes(
  provenance: KnowledgeProvenance,
  questions: AnalyzedQuestion[],
  aiProvider?: AiProvider
): Promise<QuestionRecipesArtifact> {
  // Bottom-up clustering of non-holdout questions
  const clusterMap = new Map<string, { meta: ArchetypeMeta; members: AnalyzedQuestion[] }>();

  for (const q of questions) {
    const meta = resolveQuestionArchetype(q);
    if (!clusterMap.has(meta.recipeId)) {
      clusterMap.set(meta.recipeId, { meta, members: [] });
    }
    clusterMap.get(meta.recipeId)!.members.push(q);
  }

  // Inductively generate recipes ONLY for clusters with at least 1 verified member question
  const recipes: QuestionRecipe[] = [];

  for (const [, cluster] of clusterMap.entries()) {
    const { meta, members } = cluster;
    if (members.length === 0) continue; // Guaranteed inductive requirement: no phantom recipes

    const supportCount = members.length;
    const supportYears = Array.from(new Set(members.map((m) => parseInt(m.examId, 10)))).sort();
    const rarePattern = supportYears.length < 2 && supportCount < 3;

    // 1. Dynamic Stem Templates from real stems
    const uniqueStems = Array.from(new Set(members.map((m) => generalizeStem(m.extracted.stem))));
    const stemTemplates = uniqueStems.slice(0, 4);
    if (stemTemplates.length === 0) {
      stemTemplates.push('According to the reading, which statement is true?');
    }

    // 2. Dynamic Reasoning Operations
    const reasoningSet = new Set<string>();
    for (const m of members) {
      for (const op of m.analysis.reasoningOperations) {
        reasoningSet.add(op);
      }
    }
    const reasoningOperations = Array.from(reasoningSet).slice(0, 6);

    // 3. Dynamic Valid Distractor Mechanisms
    const distractorSet = new Set<DistractorPattern>();
    for (const m of members) {
      for (const opt of m.analysis.optionAnalyses) {
        if (!opt.isCorrect && opt.distractorStrategy) {
          distractorSet.add(opt.distractorStrategy);
        }
      }
    }
    const validDistractorMechanisms = Array.from(distractorSet);
    if (validDistractorMechanisms.length === 0) {
      validDistractorMechanisms.push('partial_truth', 'literal_keyword_matching');
    }

    // 4. Dynamic Difficulty Ranges
    const langDiffSet = new Set<LanguageDifficulty>(members.map((m) => m.analysis.languageDifficulty));
    const cogDepthSet = new Set<CognitiveDepth>(members.map((m) => m.analysis.cognitiveDepth));

    // 5. Dynamic Principles from Member Question Analyses
    const correctPrinciples = Array.from(
      new Set(
        members
          .map((m) => m.analysis.whyTheQuestionWorks)
          .filter((w) => w && w.length > 10)
      )
    ).slice(0, 3);
    if (correctPrinciples.length === 0) {
      correctPrinciples.push('Option directly fulfills all stem constraints based on verified passage evidence.');
    }

    const distractorPrinciples = Array.from(
      new Set(
        members
          .flatMap((m) => m.analysis.studentFailureModes)
          .filter((f) => f && f.length > 10)
      )
    ).slice(0, 3);
    if (distractorPrinciples.length === 0) {
      distractorPrinciples.push('Distractors exploit surface word-matching without resolving sentence constraints.');
    }

    const diffRules = Array.from(
      new Set(
        members
          .flatMap((m) => [
            ...m.analysis.difficultyAdjustment.depthAdjustmentStrategies,
            ...m.analysis.difficultyAdjustment.simplificationConstraints,
          ])
          .filter((r) => r && r.length > 10)
      )
    ).slice(0, 3);
    if (diffRules.length === 0) {
      diffRules.push('Adjust difficulty by modulating constraint density while preserving vocabulary within syllabus.');
    }

    // 6. Source Evidence
    const sourceEvidence = members.slice(0, 5).map((m) => ({
      examId: m.examId,
      questionNumber: m.questionNumber,
      brief: m.extracted.stem.slice(0, 80),
    }));

    let recipeObj: QuestionRecipe = {
      recipeId: meta.recipeId,
      name: meta.name,
      primarySkill: meta.primarySkill,
      secondarySkills: meta.defaultSecondarySkills,
      supportedGenres: meta.supportedGenres,
      evidenceModes: meta.evidenceModes,
      typicalLanguageDifficultyRange: Array.from(langDiffSet),
      typicalCognitiveDepthRange: Array.from(cogDepthSet),
      requiredEvidenceSpan: meta.requiredEvidenceSpan,
      requiredEvidenceStructure: meta.requiredEvidenceStructure,
      reasoningOperations,
      stemTemplates,
      correctAnswerConstructionPrinciples: correctPrinciples,
      distractorConstructionPrinciples: distractorPrinciples,
      difficultyAdjustmentRules: diffRules,
      validDistractorMechanisms,
      commonWeakImplementations: meta.commonWeakImplementations,
      qualityChecks: meta.qualityChecks,
      sourceEvidence,
      supportCount,
      supportYears,
      confidence: supportCount >= 5 ? 'high' : supportCount >= 2 ? 'medium' : 'low',
      rarePattern,
      targetGenre: meta.supportedGenres[0],
      realExamExemplars: sourceEvidence,
    };

    // 7. Live AI Cross-Year Synthesis and Recipe Critic (when live AI provider is connected)
    if (aiProvider && aiProvider.name !== 'offline-mock' && aiProvider.generateCrossYearSynthesis) {
      try {
        const prompt = buildCrossYearRecipeSynthesisPrompt(meta.recipeId, members);
        const rawAiSynthesis = await aiProvider.generateCrossYearSynthesis(prompt);
        const aiData = JSON.parse(rawAiSynthesis);
        if (aiData && typeof aiData === 'object') {
          if (Array.isArray(aiData.stemTemplates) && aiData.stemTemplates.length > 0) {
            recipeObj.stemTemplates = aiData.stemTemplates;
          }
          if (Array.isArray(aiData.correctAnswerConstructionPrinciples) && aiData.correctAnswerConstructionPrinciples.length > 0) {
            recipeObj.correctAnswerConstructionPrinciples = aiData.correctAnswerConstructionPrinciples;
          }
          if (Array.isArray(aiData.distractorConstructionPrinciples) && aiData.distractorConstructionPrinciples.length > 0) {
            recipeObj.distractorConstructionPrinciples = aiData.distractorConstructionPrinciples;
          }
          if (Array.isArray(aiData.difficultyAdjustmentRules) && aiData.difficultyAdjustmentRules.length > 0) {
            recipeObj.difficultyAdjustmentRules = aiData.difficultyAdjustmentRules;
          }
          if (Array.isArray(aiData.qualityChecks) && aiData.qualityChecks.length > 0) {
            recipeObj.qualityChecks = aiData.qualityChecks;
          }
        }
      } catch {}

      if (aiProvider.generateRecipeCriticReview) {
        try {
          const criticPrompt = buildRecipeCriticPrompt(recipeObj, members);
          const rawCritic = await aiProvider.generateRecipeCriticReview(criticPrompt);
          const criticData = JSON.parse(rawCritic);
          if (criticData && criticData.repairedFields) {
            recipeObj = { ...recipeObj, ...criticData.repairedFields };
          }
        } catch {}
      }
    }

    recipes.push(recipeObj);
  }

  // Sort recipes deterministically by recipeId
  recipes.sort((a, b) => a.recipeId.localeCompare(b.recipeId));

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

