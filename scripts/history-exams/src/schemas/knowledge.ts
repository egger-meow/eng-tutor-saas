import { z } from 'zod';
import {
  TaxonomySkillSchema,
  CognitiveDepthSchema,
  LanguageDifficultySchema,
  EvidenceSpanSchema,
  EvidenceNecessitySchema,
  DistractorPatternSchema,
} from './analyzed.ts';
import { PassageGenreSchema } from './extracted.ts';

export const KnowledgeAuthorityStatusSchema = z.enum(['authoritative', 'provisional']);
export type KnowledgeAuthorityStatus = z.infer<typeof KnowledgeAuthorityStatusSchema>;

export const KnowledgeProvenanceSchema = z.object({
  knowledgeVersion: z.string(),
  sourceExamIds: z.array(z.string()),
  sourceQuestionCount: z.number().int(),
  excludedHoldoutCount: z.number().int(),
  providerName: z.string(),
  modelName: z.string(),
  analysisPromptVersion: z.string(),
  synthesisPromptVersion: z.string(),
  generatedAt: z.string(),
  sourceCorpusHash: z.string(),
  authorityStatus: KnowledgeAuthorityStatusSchema,
});
export type KnowledgeProvenance = z.infer<typeof KnowledgeProvenanceSchema>;

export const QuestionRecipeSchema = z.object({
  recipeId: z.string(),
  name: z.string(),
  primarySkill: TaxonomySkillSchema,
  secondarySkills: z.array(TaxonomySkillSchema).default([]),
  supportedGenres: z.array(z.union([PassageGenreSchema, z.literal('single_standalone')])),
  evidenceModes: z.array(z.enum(['text_only', 'visual_only', 'multimodal_mixed', 'spatial'])).default(['text_only']),
  typicalLanguageDifficultyRange: z.array(LanguageDifficultySchema),
  typicalCognitiveDepthRange: z.array(CognitiveDepthSchema),
  requiredEvidenceSpan: EvidenceSpanSchema,
  requiredEvidenceStructure: z.string().default('Single-clause or multi-sentence textual proof'),
  reasoningOperations: z.array(z.string()),
  stemTemplates: z.array(z.string()),
  correctAnswerConstructionPrinciples: z.array(z.string()).default([]),
  distractorConstructionPrinciples: z.array(z.string()).default([]),
  difficultyAdjustmentRules: z.array(z.string()).default([]),
  validDistractorMechanisms: z.array(DistractorPatternSchema),
  commonWeakImplementations: z.array(z.string()),
  qualityChecks: z.array(z.string()),
  sourceEvidence: z
    .array(
      z.object({
        examId: z.string(),
        questionNumber: z.number().int(),
        brief: z.string(),
      })
    )
    .min(1),
  supportCount: z.number().int().min(1),
  supportYears: z.array(z.number().int()).min(1),
  confidence: z.enum(['high', 'medium', 'low']).default('high'),
  rarePattern: z.boolean().default(false),
  // Backward compatibility alias
  targetGenre: z.union([PassageGenreSchema, z.literal('single_standalone')]).optional(),
  realExamExemplars: z
    .array(
      z.object({
        examId: z.string(),
        questionNumber: z.number().int(),
        brief: z.string(),
      })
    )
    .optional(),
});
export type QuestionRecipe = z.infer<typeof QuestionRecipeSchema>;

export const QuestionRecipesArtifactSchema = z.object({
  provenance: KnowledgeProvenanceSchema,
  recipes: z.array(QuestionRecipeSchema),
});
export type QuestionRecipesArtifact = z.infer<typeof QuestionRecipesArtifactSchema>;

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

export const DistractorPatternsArtifactSchema = z.object({
  provenance: KnowledgeProvenanceSchema,
  totalDistractorsAnalyzed: z.number().int(),
  patterns: z.array(DistractorPatternStatSchema),
});
export type DistractorPatternsArtifact = z.infer<typeof DistractorPatternsArtifactSchema>;

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

export const DepthFrameworkArtifactSchema = z.object({
  provenance: KnowledgeProvenanceSchema,
  framework: z.array(DepthLevelDefinitionSchema),
});
export type DepthFrameworkArtifact = z.infer<typeof DepthFrameworkArtifactSchema>;

export const AntiPatternSchema = z.object({
  antiPatternId: z.string(),
  name: z.string(),
  severity: z.enum(['critical', 'high', 'moderate']),
  description: z.string(),
  manifestation: z.string(),
  diagnosticTest: z.string(),
  whyWeak: z.string().default('Degrades psychometric discrimination'),
  repairStrategy: z.string(),
  evidenceBasis: z.enum(['observed', 'comparative_inference']).default('comparative_inference'),
  sourceEvidence: z
    .array(
      z.object({
        examId: z.string(),
        questionNumber: z.number().int(),
        note: z.string(),
      })
    )
    .default([]),
  confidence: z.enum(['high', 'medium', 'low']).default('high'),
  corpusEvidenceOrContrast: z.string().optional(),
});
export type AntiPattern = z.infer<typeof AntiPatternSchema>;

export const AntiPatternsArtifactSchema = z.object({
  provenance: KnowledgeProvenanceSchema,
  antiPatterns: z.array(AntiPatternSchema),
});
export type AntiPatternsArtifact = z.infer<typeof AntiPatternsArtifactSchema>;

export const CapTaxonomySchema = z.object({
  provenance: KnowledgeProvenanceSchema,
  version: z.string(),
  totalQuestions: z.number().int(),
  primarySkillFrequencies: z.record(TaxonomySkillSchema, z.number()),
  skillCoOccurrences: z.record(TaxonomySkillSchema, z.record(TaxonomySkillSchema, z.number())),
  descriptions: z.record(TaxonomySkillSchema, z.string()),
});
export type CapTaxonomy = z.infer<typeof CapTaxonomySchema>;

export const CapBlueprintSchema = z.object({
  provenance: KnowledgeProvenanceSchema,
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
    evidenceNecessity: z.record(EvidenceNecessitySchema, z.number()),
    evidenceSpan: z.record(EvidenceSpanSchema, z.number()),
    contextNecessity: z.record(EvidenceNecessitySchema, z.number()).optional(),
  }),
  keyDesignPrinciples: z.array(z.string()),
});
export type CapBlueprint = z.infer<typeof CapBlueprintSchema>;

