import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runExtractionPipeline } from '../../scripts/history-exams/src/extractor';
import { ExtractedExamSchema } from '../../scripts/history-exams/src/schemas';

describe('Historical CAP English Exam Extractor', () => {
  const rawDir = path.resolve(__dirname, '../../history_exams/raw');
  const outputDir = path.resolve(__dirname, '../../history_exams/extracted');

  it('discovers and extracts all raw exam PDFs in history_exams/raw', async () => {
    const rawFiles = fs.readdirSync(rawDir).filter((f) => f.endsWith('.pdf'));
    expect(rawFiles.length).toBeGreaterThanOrEqual(5);

    const summaries = await runExtractionPipeline({
      rawDir,
      outputDir,
    });

    expect(summaries.length).toBe(rawFiles.length);

    for (const summary of summaries) {
      if (!summary.validation.valid) {
        console.error(`Validation errors for ${summary.examId}:`, summary.validation.errors);
      }
      expect(summary.questionCount).toBe(43);
      expect(summary.validation.valid).toBe(true);
      expect(summary.validation.errors).toEqual([]);
      expect(fs.existsSync(summary.outputPath)).toBe(true);

      // Verify file matches Zod schema
      const jsonContent = JSON.parse(fs.readFileSync(summary.outputPath, 'utf-8'));
      const parsed = ExtractedExamSchema.parse(jsonContent);
      expect(parsed.examId).toBe(summary.examId);
      expect(parsed.questions.length).toBe(43);

      // Verify sequence from 1 to 43
      const questionNums = parsed.questions.map((q) => q.questionNumber);
      expect(questionNums).toEqual(Array.from({ length: 43 }, (_, i) => i + 1));

      // Verify all options (A, B, C, D) are non-empty
      for (const q of parsed.questions) {
        expect(q.options.A.trim().length).toBeGreaterThan(0);
        expect(q.options.B.trim().length).toBeGreaterThan(0);
        expect(q.options.C.trim().length).toBeGreaterThan(0);
        expect(q.options.D.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('allows single-exam targeted extraction via examIdFilter', async () => {
    const summaries = await runExtractionPipeline({
      rawDir,
      outputDir,
      examIdFilter: '115',
    });

    expect(summaries.length).toBe(1);
    expect(summaries[0].examId).toBe('115');
    expect(summaries[0].questionCount).toBe(43);
    expect(summaries[0].validation.valid).toBe(true);
  });
});
