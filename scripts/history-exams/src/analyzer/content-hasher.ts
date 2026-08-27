import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ExtractedQuestion, RequiredAsset } from '../schemas/extracted.ts';

export function computeFileSha256(filePath: string): string {
  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Cannot compute SHA-256 hash: Image asset file not found at ${absPath}`);
  }
  const buffer = fs.readFileSync(absPath);
  return createHash('sha256').update(buffer).digest('hex');
}

export function computeAssetImageHashes(assets: RequiredAsset[]): string[] {
  return assets.map((asset) => computeFileSha256(asset.imagePath));
}

export function computeQuestionContentHash(
  question: ExtractedQuestion,
  passageText: string | null | undefined,
  promptVersion: string,
  providerName = 'gemini',
  modelName = 'gemini-2.5-flash',
  imageHashes: string[] = [],
  criticPromptVersion = 'v3.0.0',
  analysisSchemaVersion = '1.0.0'
): string {
  const payload = {
    provider: providerName,
    model: modelName,
    promptVersion,
    criticPromptVersion,
    analysisSchemaVersion,
    examId: question.examId,
    questionNumber: question.questionNumber,
    section: question.section,
    stem: question.stem,
    options: question.options,
    answer: question.answer || null,
    evidenceMode: question.evidenceMode,
    visualEvidenceRequired: question.visualEvidenceRequired,
    requiredAssets: question.requiredAssets.map((a) => ({ page: a.page, role: a.role, imagePath: a.imagePath })),
    imageHashes,
    passage: passageText || '',
  };

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
