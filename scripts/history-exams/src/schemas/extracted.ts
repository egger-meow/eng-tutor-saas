import { z } from 'zod';

export const QuestionOptionKeySchema = z.enum(['A', 'B', 'C', 'D']);
export type QuestionOptionKey = z.infer<typeof QuestionOptionKeySchema>;

export const QuestionOptionsSchema = z.object({
  A: z.string(),
  B: z.string(),
  C: z.string(),
  D: z.string(),
});
export type QuestionOptions = z.infer<typeof QuestionOptionsSchema>;

export const QuestionSectionSchema = z.enum(['single', 'passage_comprehension', 'cloze']);
export type QuestionSection = z.infer<typeof QuestionSectionSchema>;

export const ExtractionConfidenceSchema = z.enum([
  'high',
  'partial_visual_pending',
  'needs_multimodal_review',
  'medium',
  'low',
]);
export type ExtractionConfidence = z.infer<typeof ExtractionConfidenceSchema>;

export const EvidenceModeSchema = z.enum([
  'text_only',
  'visual_only',
  'text_visual',
  'spatial',
  'multi_document',
]);
export type EvidenceMode = z.infer<typeof EvidenceModeSchema>;

export const RequiredAssetRoleSchema = z.enum([
  'single_image',
  'comic',
  'map',
  'infographic',
  'diagram',
  'table',
  'full_page',
]);
export type RequiredAssetRole = z.infer<typeof RequiredAssetRoleSchema>;

export const RequiredAssetSchema = z.object({
  page: z.number().int().min(1),
  role: RequiredAssetRoleSchema,
  imagePath: z.string(),
  description: z.string().optional(),
});
export type RequiredAsset = z.infer<typeof RequiredAssetSchema>;

export const ExtractedQuestionSchema = z.object({
  examId: z.string(), // e.g. "111", "112", "113", "114", "115"
  questionNumber: z.number().int().min(1).max(100),
  section: QuestionSectionSchema,
  page: z.number().int().min(1),
  passageId: z.string().nullable().optional(), // e.g. "115-p20-21" or null for single
  passageRange: z.tuple([z.number().int(), z.number().int()]).nullable().optional(),
  stem: z.string(),
  options: QuestionOptionsSchema,
  answer: z.enum(['A', 'B', 'C', 'D']).nullable().optional(),
  evidenceMode: EvidenceModeSchema.default('text_only'),
  visualEvidenceRequired: z.boolean().default(false),
  requiredAssets: z.array(RequiredAssetSchema).default([]),
  glossary: z.record(z.string(), z.string()).optional(),
  extractionConfidence: ExtractionConfidenceSchema,
  extractionWarnings: z.array(z.string()).default([]),
});
export type ExtractedQuestion = z.infer<typeof ExtractedQuestionSchema>;

export const PassageGenreSchema = z.enum([
  'narrative',
  'dialogue',
  'notice_announcement',
  'brochure_flyer',
  'infographic_chart_table',
  'comic_strip',
  'multi_document_comparison',
  'article_informational',
  'letter_email',
  'cloze_passage',
  'other',
]);
export type PassageGenre = z.infer<typeof PassageGenreSchema>;

export const SubDocumentSchema = z.object({
  title: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  text: z.string(),
});
export type SubDocument = z.infer<typeof SubDocumentSchema>;

export const ExtractedPassageSchema = z.object({
  id: z.string(), // e.g. "115-p20-21"
  examId: z.string(),
  questionRange: z.tuple([z.number().int(), z.number().int()]),
  genre: PassageGenreSchema,
  title: z.string().nullable().optional(),
  text: z.string(),
  evidenceMode: EvidenceModeSchema.default('text_only'),
  visualEvidenceRequired: z.boolean().default(false),
  requiredAssets: z.array(RequiredAssetSchema).default([]),
  glossary: z.record(z.string(), z.string()).optional(),
  subDocuments: z.array(SubDocumentSchema).optional(),
  pageStart: z.number().int().min(1),
  pageEnd: z.number().int().min(1),
  questionNumbers: z.array(z.number().int()),
});
export type ExtractedPassage = z.infer<typeof ExtractedPassageSchema>;

export const ExtractedExamSchema = z.object({
  examId: z.string(), // "111" .. "115"
  year: z.number().int(),
  title: z.string(),
  sourcePdf: z.string(),
  pageCount: z.number().int().min(1),
  questionCount: z.number().int().min(1),
  singleQuestionRange: z.tuple([z.number().int(), z.number().int()]),
  passageQuestionRange: z.tuple([z.number().int(), z.number().int()]),
  passages: z.array(ExtractedPassageSchema),
  questions: z.array(ExtractedQuestionSchema),
  extractedAt: z.string(),
  extractorVersion: z.string(),
});
export type ExtractedExam = z.infer<typeof ExtractedExamSchema>;
