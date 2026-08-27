import { z } from 'zod';
import { ExtractedQuestionSchema } from './extracted.ts';

export const TaxonomySkillSchema = z.enum([
  'vocabulary_in_context',
  'grammar_in_context',
  'explicit_detail',
  'reference_resolution',
  'local_inference',
  'cross_sentence_inference',
  'main_idea',
  'purpose_speaker_intent',
  'discourse_relationship',
  'sequence_cause_consequence',
  'text_structure',
  'information_integration',
  'pragmatic_meaning',
  'other_uncertain',
]);
export type TaxonomySkill = z.infer<typeof TaxonomySkillSchema>;

export const LanguageDifficultySchema = z.enum([
  'A1_elementary',
  'A2_basic',
  'B1_intermediate',
]);
export type LanguageDifficulty = z.infer<typeof LanguageDifficultySchema>;

export const CognitiveDepthSchema = z.enum([
  'D1_verbatim_retrieval',
  'D2_single_step_inference',
  'D3_multi_step_synthesis',
  'D4_evaluative_pragmatic',
]);
export type CognitiveDepth = z.infer<typeof CognitiveDepthSchema>;

export const EvidenceSpanSchema = z.enum([
  'single_word',
  'single_clause',
  'single_sentence',
  'cross_sentence_local',
  'multi_paragraph_global',
  'multimodal_text_and_graphic',
]);
export type EvidenceSpan = z.infer<typeof EvidenceSpanSchema>;

export const EvidenceNecessitySchema = z.enum([
  'essential',
  'helpful',
  'decorative',
  'none',
]);
export type EvidenceNecessity = z.infer<typeof EvidenceNecessitySchema>;

// Deprecated alias for backwards compatibility
export const ContextNecessitySchema = EvidenceNecessitySchema;
export type ContextNecessity = EvidenceNecessity;

export const DistractorPatternSchema = z.enum([
  'literal_keyword_matching',
  'partial_truth',
  'wrong_referent',
  'wrong_chronology',
  'local_evidence_for_global_question',
  'unsupported_world_knowledge',
  'reversed_cause_effect',
  'grammatically_plausible_contextually_wrong',
  'overgeneralization',
  'undergeneralization',
  'irrelevant_distractor',
  'other',
]);
export type DistractorPattern = z.infer<typeof DistractorPatternSchema>;

export const EvidenceReferenceSchema = z.object({
  type: z.enum([
    'passage_text',
    'sub_document',
    'table_cell',
    'visual_coordinate',
    'glossary',
    'visual_page_asset',
    'stem_clue',
  ]),
  location: z.string(),
  quoteOrDescription: z.string(),
  role: z.enum(['primary_proof', 'counter_evidence', 'constraint_filter', 'contextual_clue']),
});
export type EvidenceReference = z.infer<typeof EvidenceReferenceSchema>;

export const OptionAnalysisItemSchema = z
  .object({
    option: z.enum(['A', 'B', 'C', 'D']),
    isCorrect: z.boolean(),
    correctRationale: z.string().optional(),
    distractorStrategy: DistractorPatternSchema.optional(),
    distractorRationale: z.string().optional(),
    evidenceRefs: z.array(EvidenceReferenceSchema).default([]),
    misconceptionTarget: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isCorrect) {
      if (!data.correctRationale || data.correctRationale.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Correct option must provide correctRationale',
          path: ['correctRationale'],
        });
      }
      if (data.distractorStrategy) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Correct option must NOT have a distractorStrategy',
          path: ['distractorStrategy'],
        });
      }
    } else {
      if (!data.distractorStrategy) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Distractor option must have a distractorStrategy',
          path: ['distractorStrategy'],
        });
      }
      if (!data.distractorRationale || data.distractorRationale.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Distractor option must provide distractorRationale',
          path: ['distractorRationale'],
        });
      }
    }
  });
export type OptionAnalysisItem = z.infer<typeof OptionAnalysisItemSchema>;

export const DemandLevelSchema = z.enum(['low', 'medium', 'high']);
export type DemandLevel = z.infer<typeof DemandLevelSchema>;

export const ReasoningComplexitySchema = z.enum([
  'simple_single_step',
  'compound_dual_step',
  'complex_multi_step_deduction',
]);
export type ReasoningComplexity = z.infer<typeof ReasoningComplexitySchema>;

export const ShallowRecallSchema = z.object({
  isShallowRecall: z.boolean(),
  recallType: z.enum([
    'none',
    'isolated_dictionary_definition',
    'mechanical_grammar_pattern',
    'uncontextualized_idiom',
    'intentional_retrieval_drill',
    'shallow_comprehension_artifact',
  ]),
  explanation: z.string(),
});
export type ShallowRecall = z.infer<typeof ShallowRecallSchema>;

export const DifficultyAdjustmentSchema = z.object({
  canSimplifyLanguageWithoutBreakingMechanism: z.boolean(),
  simplificationConstraints: z.array(z.string()).default([]),
  canIncreaseDepthWithoutIncreasingVocabulary: z.boolean(),
  depthAdjustmentStrategies: z.array(z.string()).default([]),
});
export type DifficultyAdjustment = z.infer<typeof DifficultyAdjustmentSchema>;

export const PedagogicalAnalysisSchema = z.object({
  primarySkill: TaxonomySkillSchema,
  secondarySkills: z.array(TaxonomySkillSchema).default([]),
  skillExplanation: z.string().optional(),
  languageDifficulty: LanguageDifficultySchema,
  cognitiveDepth: CognitiveDepthSchema,
  evidenceMode: z.enum(['text_only', 'visual_only', 'multimodal_mixed', 'spatial']),
  evidenceNecessity: EvidenceNecessitySchema,
  evidenceSpan: EvidenceSpanSchema,
  reasoningOperations: z.array(z.string()).min(1),
  reasoningComplexity: ReasoningComplexitySchema.default('simple_single_step'),
  optionAnalyses: z
    .array(OptionAnalysisItemSchema)
    .length(4)
    .superRefine((opts, ctx) => {
      const correctOpts = opts.filter((o) => o.isCorrect);
      if (correctOpts.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Expected exactly 1 correct option, found ${correctOpts.length}`,
        });
      }
      const optionLetters = new Set(opts.map((o) => o.option));
      if (optionLetters.size !== 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Must include all four options A, B, C, D',
        });
      }
    }),
  readingDemand: DemandLevelSchema,
  grammarDemand: DemandLevelSchema,
  vocabularyDemand: DemandLevelSchema,
  inferenceDemand: DemandLevelSchema,
  visualIntegrationDemand: DemandLevelSchema.default('low'),
  questionMechanism: z.string(),
  whyTheQuestionWorks: z.string(),
  studentFailureModes: z.array(z.string()).min(1),
  misconceptionsTargeted: z.array(z.string()).min(1),
  shallowRecall: ShallowRecallSchema,
  reusableDesignPrinciple: z.string(),
  difficultyAdjustment: DifficultyAdjustmentSchema,
  analysisConfidence: z.enum(['high', 'medium', 'low']).default('high'),
  uncertainties: z.array(z.string()).default([]),
  evidenceReferences: z.array(EvidenceReferenceSchema).default([]),
  criticStatus: z.enum(['passed', 'repaired']).default('passed'),
  criticIssues: z.array(z.string()).default([]),
});
export type PedagogicalAnalysis = z.infer<typeof PedagogicalAnalysisSchema>;

export const AnalyzedQuestionSchema = z.object({
  examId: z.string(),
  questionNumber: z.number().int().min(1).max(100),
  contentHash: z.string(),
  providerName: z.string().default('unknown'),
  modelName: z.string(),
  promptVersion: z.string(),
  criticPromptVersion: z.string().default('v3.0.0'),
  analysisSchemaVersion: z.string().default('1.0.0'),
  analyzedAt: z.string(),
  extracted: ExtractedQuestionSchema,
  analysis: PedagogicalAnalysisSchema,
});
export type AnalyzedQuestion = z.infer<typeof AnalyzedQuestionSchema>;

export const AnalyzedExamSchema = z.object({
  examId: z.string(),
  year: z.number().int(),
  promptVersion: z.string(),
  criticPromptVersion: z.string().default('v3.0.0'),
  analysisSchemaVersion: z.string().default('1.0.0'),
  analyzedAt: z.string(),
  questions: z.array(AnalyzedQuestionSchema),
});
export type AnalyzedExam = z.infer<typeof AnalyzedExamSchema>;
