import { z } from 'zod';
import {
  TaxonomySkillSchema,
  CognitiveDepthSchema,
  LanguageDifficultySchema,
  EvidenceNecessitySchema,
  EvidenceSpanSchema,
  DistractorPatternSchema,
} from './analyzed.ts';
import { KnowledgeProvenanceSchema } from './knowledge.ts';

export const BenchmarkMetricDistributionSchema = z.record(z.string(), z.number());

export const BenchmarkHoldoutItemSchema = z.object({
  examId: z.string(),
  questionNumber: z.number().int(),
  section: z.string(),
  evidenceMode: z.string().default('text_only'),
  primarySkill: TaxonomySkillSchema,
  cognitiveDepth: CognitiveDepthSchema,
  languageDifficulty: LanguageDifficultySchema,
  evidenceNecessity: EvidenceNecessitySchema,
  evidenceSpan: EvidenceSpanSchema,
  benchmarkEvaluationFocus: z.string(),
  // Backward compatibility alias
  contextNecessity: EvidenceNecessitySchema.optional(),
});
export type BenchmarkHoldoutItem = z.infer<typeof BenchmarkHoldoutItemSchema>;

export const HoldoutManifestSchema = z.object({
  version: z.string(),
  generatedAt: z.string(),
  description: z.string(),
  totalHoldoutQuestions: z.number().int(),
  stratificationRules: z.array(z.string()),
  holdoutQuestions: z.array(
    z.object({
      examId: z.string(),
      questionNumber: z.number().int(),
      section: z.string(),
      genre: z.string().optional(),
      evidenceMode: z.string(),
      primarySkillTarget: TaxonomySkillSchema,
      cognitiveDepthTarget: CognitiveDepthSchema,
      rationale: z.string(),
    })
  ),
});
export type HoldoutManifest = z.infer<typeof HoldoutManifestSchema>;

export const CapBenchmarkSchema = z.object({
  provenance: KnowledgeProvenanceSchema,
  benchmarkVersion: z.string(),
  generatedAt: z.string(),
  referenceCorpus: z.object({
    examIds: z.array(z.string()),
    totalQuestions: z.number().int(),
    nonHoldoutQuestions: z.number().int().default(195),
  }),
  distributions: z.object({
    skillDistribution: z.record(TaxonomySkillSchema, z.number()),
    cognitiveDepthDistribution: z.record(CognitiveDepthSchema, z.number()),
    languageDifficultyDistribution: z.record(LanguageDifficultySchema, z.number()),
    evidenceNecessityDistribution: z.record(EvidenceNecessitySchema, z.number()),
    evidenceSpanDistribution: z.record(EvidenceSpanSchema, z.number()),
    distractorPatternDistribution: z.record(DistractorPatternSchema, z.number()),
    contextNecessityDistribution: z.record(EvidenceNecessitySchema, z.number()).optional(),
  }),
  rates: z.object({
    shallowRecallRateOverall: z.number(),
    shallowRecallRateSingleSection: z.number(),
    shallowRecallRatePassageSection: z.number(),
    essentialEvidenceRatePassageSection: z.number(),
    essentialContextRatePassageSection: z.number().optional(),
  }),
  holdoutReferenceSet: z.array(BenchmarkHoldoutItemSchema),
});
export type CapBenchmark = z.infer<typeof CapBenchmarkSchema>;

