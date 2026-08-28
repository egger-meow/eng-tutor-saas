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

export const HoldoutManifestSchema = z
  .object({
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
  })
  .superRefine((data, ctx) => {
    if (data.totalHoldoutQuestions !== 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `totalHoldoutQuestions must be exactly 20, found ${data.totalHoldoutQuestions}`,
        path: ['totalHoldoutQuestions'],
      });
    }
    if (data.holdoutQuestions.length !== 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `holdoutQuestions array must contain exactly 20 items, found ${data.holdoutQuestions.length}`,
        path: ['holdoutQuestions'],
      });
    }
    const uniqueKeys = new Set(data.holdoutQuestions.map((h) => `${h.examId}-Q${h.questionNumber}`));
    if (uniqueKeys.size !== data.holdoutQuestions.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `holdoutQuestions contains duplicate keys, unique count is ${uniqueKeys.size}`,
        path: ['holdoutQuestions'],
      });
    }
    const yearCounts: Record<string, number> = {};
    for (const h of data.holdoutQuestions) {
      yearCounts[h.examId] = (yearCounts[h.examId] || 0) + 1;
    }
    const years = [...new Set(data.holdoutQuestions.map((h) => h.examId))].sort();
    if (years.length !== 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Holdout manifest must cover exactly 5 years, found ${years.length}`, path: ['holdoutQuestions'] });
    }
    for (const yr of years) {
      if (yearCounts[yr] !== 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Year ${yr} must have exactly 4 holdout items, found ${yearCounts[yr] || 0}`,
          path: ['holdoutQuestions'],
        });
      }
    }
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
