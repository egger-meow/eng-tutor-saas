import fs from 'node:fs';
import path from 'node:path';
import { ExtractedExam } from '../schemas/extracted.ts';
import { ExtractionValidationResult, validateExtractedExam } from './extractor-validator.ts';
import { parseExamFromPages } from './parser.ts';
import { extractPdfText } from './pdf-reader.ts';

export * from './pdf-reader.ts';
export * from './parser.ts';
export * from './extractor-validator.ts';

export interface ExtractAllOptions {
  rawDir: string;
  outputDir: string;
  examIdFilter?: string;
}

export interface ExtractSummary {
  examId: string;
  year: number;
  questionCount: number;
  passageCount: number;
  validation: ExtractionValidationResult;
  outputPath: string;
}

/**
 * Runs the deterministic extraction pipeline across all historical exam PDFs
 */
export async function runExtractionPipeline(options: ExtractAllOptions): Promise<ExtractSummary[]> {
  const { rawDir, outputDir, examIdFilter } = options;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const rawFiles = fs
    .readdirSync(rawDir)
    .filter((f) => f.endsWith('.pdf'))
    .sort();

  const results: ExtractSummary[] = [];

  for (const file of rawFiles) {
    const match = file.match(/^(\d{3})P_English\.pdf$/i);
    if (!match) continue;

    const examId = match[1];
    if (examIdFilter && examId !== examIdFilter) {
      continue;
    }

    const pdfPath = path.join(rawDir, file);
    const pages = await extractPdfText(pdfPath);
    const extractedExam = parseExamFromPages(pages, {
      examId,
      sourcePdfPath: pdfPath,
    });

    const validation = validateExtractedExam(extractedExam);

    const outputPath = path.join(outputDir, `${examId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(extractedExam, null, 2), 'utf-8');

    results.push({
      examId,
      year: extractedExam.year,
      questionCount: extractedExam.questions.length,
      passageCount: extractedExam.passages.length,
      validation,
      outputPath,
    });
  }

  return results;
}
