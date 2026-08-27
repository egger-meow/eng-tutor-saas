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

export const ExtractionConfidenceSchema = z.enum(['high', 'medium', 'low']);
export type ExtractionConfidence = z.infer<typeof ExtractionConfidenceSchema>;

export const ExtractedQuestionSchema = z.object({
  examId: z.string(), // e.g. "111", "112", "113", "114", "115"
  questionNumber: z.number().int().min(1).max(100),
  section: QuestionSectionSchema,
  page: z.number().int().min(1),
  passageId: z.string().nullable().optional(), // e.g. "111-p21-22" or null for single
  passageRange: z.tuple([z.number().int(), z.number().int()]).nullable().optional(),
  stem: z.string(),
  options: QuestionOptionsSchema,
  answer: z.enum(['A', 'B', 'C', 'D']).nullable().optional(), // strict null unless reliably present in source
  glossary: z.record(z.string(), z.string()).optional(), // per-question footnotes like  stir 攪拌
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
  'article_informational',
  'letter_email',
  'cloze_passage',
  'other',
]);
export type PassageGenre = z.infer<typeof PassageGenreSchema>;

export const ExtractedPassageSchema = z.object({
  id: z.string(), // e.g. "111-p21-22"
  examId: z.string(),
  questionRange: z.tuple([z.number().int(), z.number().int()]),
  genre: PassageGenreSchema,
  title: z.string().nullable().optional(),
  text: z.string(),
  glossary: z.record(z.string(), z.string()).optional(),
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
