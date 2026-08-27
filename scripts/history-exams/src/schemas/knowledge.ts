import { z } from 'zod';
import {
  TaxonomySkillSchema,
  CognitiveDepthSchema,
  LanguageDifficultySchema,
  EvidenceSpanSchema,
  ContextNecessitySchema,
  DistractorPatternSchema,
} from './analyzed.ts';
import { PassageGenreSchema } from './extracted.ts';

export const QuestionRecipeSchema = z.object({
  recipeId: z.string(),
  name: z.string(),
  primarySkill: TaxonomySkillSchema,
  secondarySkills: z.array(TaxonomySkillSchema).default([]),
  targetGenre: z.union([PassageGenreSchema, z.literal('single_standalone')]),
  appropriateCognitiveDepth: z.array(CognitiveDepthSchema),
  requiredEvidenceSpan: EvidenceSpanSchema,
  languageDifficultyFlexibility: z.array(LanguageDifficultySchema),
  reasoningOperations: z.array(z.string()),
  stemTemplates: z.array(z.string()),
  validDistractorMechanisms: z.array(DistractorPatternSchema),
  commonWeakImplementations: z.array(z.string()),
  qualityChecks: z.array(z.string()),
  realExamExemplars: z.array(
    z.object({
      examId: z.string(),
      questionNumber: z.number().int(),
      brief: z.string(),
    })
  ),
});
export type QuestionRecipe = z.infer<typeof QuestionRecipeSchema>;

export const DistractorPatternStatSchema = z.object({
  pattern: DistractorPatternSchema,
  description: z.string(),
  observedCount: z.number().int(),
  observedPercentage: z.number(),
  primaryCognitiveTrigger: z.string(),
  exemplars: z.array(
    z.object({
      examId: z.string(),
      questionNumber: z.number().int(),
      option: z.enum(['A', 'B', 'C', 'D']),
      explanation: z.string(),
    })
  ),
});
export type DistractorPatternStat = z.infer<typeof DistractorPatternStatSchema>;

export const DepthLevelDefinitionSchema = z.object({
  level: CognitiveDepthSchema,
  name: z.string(),
  description: z.string(),
  distinguishingFeatures: z.array(z.string()),
  languageDecouplingRule: z.string(),
  exemplars: z.array(
    z.object({
      examId: z.string(),
      questionNumber: z.number().int(),
      languageDifficulty: LanguageDifficultySchema,
      whyThisDepth: z.string(),
    })
  ),
});
export type DepthLevelDefinition = z.infer<typeof DepthLevelDefinitionSchema>;

export const AntiPatternSchema = z.object({
  antiPatternId: z.string(),
  name: z.string(),
  severity: z.enum(['critical', 'high', 'moderate']),
  description: z.string(),
  manifestation: z.string(),
  diagnosticTest: z.string(),
  corpusEvidenceOrContrast: z.string(),
  repairStrategy: z.string(),
});
export type AntiPattern = z.infer<typeof AntiPatternSchema>;

export const CapBlueprintSchema = z.object({
  version: z.string(),
  generatedAt: z.string(),
  totalQuestionsAnalyzed: z.number().int(),
  totalExams: z.number().int(),
  sectionComposition: z.object({
    singleQuestions: z.object({
      countRange: z.tuple([z.number().int(), z.number().int()]),
      dominantSkills: z.array(TaxonomySkillSchema),
      cognitiveDepthFocus: z.array(CognitiveDepthSchema),
    }),
    passageQuestions: z.object({
      countRange: z.tuple([z.number().int(), z.number().int()]),
      passageSetsRange: z.tuple([z.number().int(), z.number().int()]),
      dominantGenres: z.array(PassageGenreSchema),
      cognitiveDepthFocus: z.array(CognitiveDepthSchema),
    }),
  }),
  distributions: z.object({
    skills: z.record(TaxonomySkillSchema, z.number()),
    cognitiveDepth: z.record(CognitiveDepthSchema, z.number()),
    languageDifficulty: z.record(LanguageDifficultySchema, z.number()),
    contextNecessity: z.record(ContextNecessitySchema, z.number()),
    evidenceSpan: z.record(EvidenceSpanSchema, z.number()),
  }),
  keyDesignPrinciples: z.array(z.string()),
});
export type CapBlueprint = z.infer<typeof CapBlueprintSchema>;
