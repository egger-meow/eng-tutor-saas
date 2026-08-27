import { z } from 'zod';
import {
  TaxonomySkillSchema,
  CognitiveDepthSchema,
  LanguageDifficultySchema,
  ContextNecessitySchema,
  EvidenceSpanSchema,
  DistractorPatternSchema,
} from './analyzed.ts';

export const BenchmarkMetricDistributionSchema = z.record(z.string(), z.number());

export const BenchmarkHoldoutItemSchema = z.object({
  examId: z.string(),
  questionNumber: z.number().int(),
  section: z.string(),
  primarySkill: TaxonomySkillSchema,
  cognitiveDepth: CognitiveDepthSchema,
  languageDifficulty: LanguageDifficultySchema,
  contextNecessity: ContextNecessitySchema,
  evidenceSpan: EvidenceSpanSchema,
  benchmarkEvaluationFocus: z.string(),
});
export type BenchmarkHoldoutItem = z.infer<typeof BenchmarkHoldoutItemSchema>;

export const CapBenchmarkSchema = z.object({
  benchmarkVersion: z.string(),
  generatedAt: z.string(),
  referenceCorpus: z.object({
    examIds: z.array(z.string()),
    totalQuestions: z.number().int(),
  }),
  distributions: z.object({
    skillDistribution: z.record(TaxonomySkillSchema, z.number()),
    cognitiveDepthDistribution: z.record(CognitiveDepthSchema, z.number()),
    languageDifficultyDistribution: z.record(LanguageDifficultySchema, z.number()),
    contextNecessityDistribution: z.record(ContextNecessitySchema, z.number()),
    evidenceSpanDistribution: z.record(EvidenceSpanSchema, z.number()),
    distractorPatternDistribution: z.record(DistractorPatternSchema, z.number()),
  }),
  rates: z.object({
    shallowRecallRateOverall: z.number(),
    shallowRecallRateSingleSection: z.number(),
    shallowRecallRatePassageSection: z.number(),
    essentialContextRatePassageSection: z.number(),
  }),
  holdoutReferenceSet: z.array(BenchmarkHoldoutItemSchema),
});
export type CapBenchmark = z.infer<typeof CapBenchmarkSchema>;
