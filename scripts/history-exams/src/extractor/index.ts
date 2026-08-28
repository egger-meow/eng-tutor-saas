import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ExtractedExam } from '../schemas/extracted.ts';
import { ExtractionValidationResult, validateExtractedExam } from './extractor-validator.ts';
import { getOfficialAnswer, OFFICIAL_CAP_ANSWERS } from './official-answers.ts';
import { parseExamFromPages } from './parser.ts';
import { renderExamPagesToImages } from './pdf-page-renderer.ts';
import { extractPdfText } from './pdf-reader.ts';
import { applySourceFidelityOverrides } from './source-fidelity-overrides.ts';

export * from './pdf-reader.ts';
export * from './parser.ts';
export * from './extractor-validator.ts';
export * from './official-answers.ts';
export * from './pdf-page-renderer.ts';
export * from './source-fidelity-overrides.ts';

export interface ExtractAllOptions {
  rawDir: string;
  outputDir: string;
  assetsDir?: string;
  examIdFilter?: string;
  renderImages?: boolean;
  examIdsToProcess?: string[];
}

export interface ExtractSummary {
  examId: string;
  year: number;
  questionCount: number;
  passageCount: number;
  renderedImagesCount: number;
  validation: ExtractionValidationResult;
  outputPath: string;
}

/**
 * Runs the deterministic extraction and multimodal rendering pipeline across all historical exam PDFs
 */
export async function runExtractionPipeline(options: ExtractAllOptions): Promise<ExtractSummary[]> {
  const { rawDir, outputDir, examIdFilter, renderImages = true, examIdsToProcess } = options;
  const assetsDir = options.assetsDir || path.resolve(outputDir, '../assets');

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
    if (examIdsToProcess && !examIdsToProcess.includes(examId)) continue;
    if (examIdFilter && examId !== examIdFilter) {
      continue;
    }

    const pdfPath = path.join(rawDir, file);

    // 1. Render high-resolution page images for multimodal AI analysis
    let renderedImagesCount = 0;
    if (renderImages) {
      const renderRes = await renderExamPagesToImages(pdfPath, examId, assetsDir, { scale: 2.0 });
      renderedImagesCount = renderRes.renderedPages.length;
    }

    // 2. Extract geometry-aware text, then apply deterministic corrections verified
    // against the official source PDFs during multimodal corpus review.
    const pages = await extractPdfText(pdfPath);
    const extractedExam = applySourceFidelityOverrides(
      parseExamFromPages(pages, {
        examId,
        sourcePdfPath: pdfPath,
      }),
    );

    // 2.5 Compute and embed asset SHA-256 byte hashes
    for (const q of extractedExam.questions) {
      for (const asset of q.requiredAssets) {
        const fullAssetPath = path.isAbsolute(asset.imagePath)
          ? asset.imagePath
          : path.resolve(process.cwd(), asset.imagePath);
        if (fs.existsSync(fullAssetPath)) {
          const fileBuf = fs.readFileSync(fullAssetPath);
          asset.sha256 = crypto.createHash('sha256').update(fileBuf).digest('hex');
        }
      }
    }
    for (const p of extractedExam.passages) {
      for (const asset of p.requiredAssets) {
        const fullAssetPath = path.isAbsolute(asset.imagePath)
          ? asset.imagePath
          : path.resolve(process.cwd(), asset.imagePath);
        if (fs.existsSync(fullAssetPath)) {
          const fileBuf = fs.readFileSync(fullAssetPath);
          asset.sha256 = crypto.createHash('sha256').update(fileBuf).digest('hex');
        }
      }
    }

    // 3. Validate extracted schema
    const validation = validateExtractedExam(extractedExam);

    const outputPath = path.join(outputDir, `${examId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(extractedExam, null, 2), 'utf-8');

    results.push({
      examId,
      year: extractedExam.year,
      questionCount: extractedExam.questions.length,
      passageCount: extractedExam.passages.length,
      renderedImagesCount,
      validation,
      outputPath,
    });
  }

  return results;
}
