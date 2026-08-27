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

export const ContextNecessitySchema = z.enum([
  'essential',
  'helpful',
  'decorative',
  'none',
]);
export type ContextNecessity = z.infer<typeof ContextNecessitySchema>;

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

export const DistractorAnalysisItemSchema = z.object({
  option: z.enum(['A', 'B', 'C', 'D']),
  strategy: DistractorPatternSchema,
  explanation: z.string(),
});
export type DistractorAnalysisItem = z.infer<typeof DistractorAnalysisItemSchema>;

export const DemandLevelSchema = z.enum(['low', 'medium', 'high']);
export type DemandLevel = z.infer<typeof DemandLevelSchema>;

export const ShallowRecallSchema = z.object({
  isShallowRecall: z.boolean(),
  recallType: z.enum(['none', 'intentional_retrieval_drill', 'shallow_comprehension_artifact']),
  explanation: z.string(),
});
export type ShallowRecall = z.infer<typeof ShallowRecallSchema>;

export const PedagogicalAnalysisSchema = z.object({
  primarySkill: TaxonomySkillSchema,
  secondarySkills: z.array(TaxonomySkillSchema).default([]),
  skillExplanation: z.string().optional(),
  languageDifficulty: LanguageDifficultySchema,
  cognitiveDepth: CognitiveDepthSchema,
  evidenceSpan: EvidenceSpanSchema,
  contextNecessity: ContextNecessitySchema,
  reasoningOperations: z.array(z.string()).min(1),
  questionMechanism: z.string(),
  distractorStrategies: z.array(DistractorAnalysisItemSchema),
  requiredKnowledge: z.array(z.string()),
  readingDemand: DemandLevelSchema,
  grammarDemand: DemandLevelSchema,
  vocabularyDemand: DemandLevelSchema,
  inferenceDemand: DemandLevelSchema,
  whyTheQuestionWorks: z.string(),
  possibleStudentFailureModes: z.array(z.string()),
  reusableDesignPrinciple: z.string(),
  shallowRecall: ShallowRecallSchema,
});
export type PedagogicalAnalysis = z.infer<typeof PedagogicalAnalysisSchema>;

export const AnalyzedQuestionSchema = z.object({
  examId: z.string(),
  questionNumber: z.number().int().min(1).max(100),
  contentHash: z.string(),
  promptVersion: z.string(),
  analyzedAt: z.string(),
  modelName: z.string(),
  extracted: ExtractedQuestionSchema,
  analysis: PedagogicalAnalysisSchema,
});
export type AnalyzedQuestion = z.infer<typeof AnalyzedQuestionSchema>;

export const AnalyzedExamSchema = z.object({
  examId: z.string(),
  year: z.number().int(),
  promptVersion: z.string(),
  analyzedAt: z.string(),
  questions: z.array(AnalyzedQuestionSchema),
});
export type AnalyzedExam = z.infer<typeof AnalyzedExamSchema>;
