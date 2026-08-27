import fs from 'node:fs';
import path from 'node:path';
import {
  AnalyzedExam,
  AnalyzedExamSchema,
  AnalyzedQuestion,
  PedagogicalAnalysis,
  PedagogicalAnalysisSchema,
} from '../schemas/analyzed.ts';
import { ExtractedExam, ExtractedPassage, ExtractedQuestion } from '../schemas/extracted.ts';
import {
  AiProvider,
  createAiProvider,
  deriveDeterministicAnalysis,
  ImageAttachment,
} from './ai-provider.ts';
import { computeAssetImageHashes, computeQuestionContentHash } from './content-hasher.ts';
import { buildPedagogicalAnalysisPrompt, PROMPT_VERSION } from './prompt.ts';

export class VisualAssetMissingError extends Error {
  constructor(examId: string, questionNumber: number, assetPath: string) {
    super(
      `[VisualAssetMissingError] Missing required visual asset on disk for Exam ${examId} Q${questionNumber}: "${assetPath}". ` +
      `AI analysis aborted to prevent ungrounded or blind visual question reverse-engineering.`
    );
    this.name = 'VisualAssetMissingError';
  }
}

export interface RunAnalysisOptions {
  extractedDir: string;
  analyzedDir: string;
  examIdFilter?: string;
  questionNumberFilter?: number;
  force?: boolean;
  allowOfflineMock?: boolean;
  aiProvider?: AiProvider;
}

export interface AnalysisSummary {
  examId: string;
  totalQuestions: number;
  analyzedCount: number;
  cachedCount: number;
  outputPath: string;
}

/**
 * Runs Stage 2: Pedagogical Deep Analysis over extracted exams with live AI and multimodal evidence
 */
export async function runAnalysisPipeline(options: RunAnalysisOptions): Promise<AnalysisSummary[]> {
  const { extractedDir, analyzedDir, examIdFilter, questionNumberFilter, force, allowOfflineMock } = options;
  const aiProvider = options.aiProvider || createAiProvider({ allowOfflineMock });

  if (!fs.existsSync(analyzedDir)) {
    fs.mkdirSync(analyzedDir, { recursive: true });
  }

  const extractedFiles = fs
    .readdirSync(extractedDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  const summaries: AnalysisSummary[] = [];

  for (const file of extractedFiles) {
    const examId = path.basename(file, '.json');
    if (examIdFilter && examId !== examIdFilter) {
      continue;
    }

    const extractedContent: ExtractedExam = JSON.parse(
      fs.readFileSync(path.join(extractedDir, file), 'utf-8')
    );

    const analyzedPath = path.join(analyzedDir, `${examId}.json`);
    let existingAnalyzed: AnalyzedExam | null = null;
    const existingMap = new Map<number, AnalyzedQuestion>();

    if (fs.existsSync(analyzedPath)) {
      try {
        const rawJson = JSON.parse(fs.readFileSync(analyzedPath, 'utf-8'));
        const parseRes = AnalyzedExamSchema.safeParse(rawJson);
        if (parseRes.success) {
          existingAnalyzed = parseRes.data;
          existingAnalyzed.questions.forEach((q) => existingMap.set(q.questionNumber, q));
        }
      } catch {
        // Ignore parse error and recompute
      }
    }

    const passageMap = new Map<string, ExtractedPassage>();
    extractedContent.passages.forEach((p) => passageMap.set(p.id, p));

    const analyzedQuestions: AnalyzedQuestion[] = [];
    let cachedCount = 0;
    let freshAnalyzedCount = 0;

    for (const question of extractedContent.questions) {
      if (questionNumberFilter && question.questionNumber !== questionNumberFilter) {
        const existing = existingMap.get(question.questionNumber);
        if (existing) {
          analyzedQuestions.push(existing);
        }
        continue;
      }

      const passage = question.passageId ? passageMap.get(question.passageId) : null;

      // Safeguard 1 & 2: Hard-fail on missing visual assets and hash image bytes
      const images: ImageAttachment[] = [];
      let imageHashes: string[] = [];

      if (question.visualEvidenceRequired) {
        if (question.requiredAssets.length === 0) {
          throw new Error(
            `[VisualAssetError] Exam ${examId} Q${question.questionNumber} has visualEvidenceRequired=true but requiredAssets is empty.`
          );
        }

        for (const asset of question.requiredAssets) {
          const absAssetPath = path.isAbsolute(asset.imagePath)
            ? asset.imagePath
            : path.resolve(process.cwd(), asset.imagePath);

          if (!fs.existsSync(absAssetPath)) {
            throw new VisualAssetMissingError(examId, question.questionNumber, absAssetPath);
          }

          const imgBuffer = fs.readFileSync(absAssetPath);
          images.push({
            mimeType: 'image/png',
            base64Data: imgBuffer.toString('base64'),
          });
        }

        imageHashes = computeAssetImageHashes(question.requiredAssets);
      }

      const contentHash = computeQuestionContentHash(
        question,
        passage?.text,
        PROMPT_VERSION,
        aiProvider.name,
        aiProvider.modelName,
        imageHashes
      );

      const existingRecord = existingMap.get(question.questionNumber);

      // Check cache validity (must match hash AND must not be an offline-mock record if running live provider)
      const isMockCached = existingRecord?.modelName === 'rule-based-mock' || existingRecord?.modelName === 'offline-mock';
      const isLiveRun = aiProvider.name !== 'offline-mock';

      if (!force && existingRecord && existingRecord.contentHash === contentHash && !(isLiveRun && isMockCached)) {
        analyzedQuestions.push(existingRecord);
        cachedCount++;
        continue;
      }

      const prompt = buildPedagogicalAnalysisPrompt(question, passage);
      let analysisResult: PedagogicalAnalysis;

      try {
        const rawResponse = await aiProvider.generateAnalysis(prompt, {
          question,
          passage,
          images: images.length > 0 ? images : undefined,
        });
        const parsedJson = JSON.parse(rawResponse);
        analysisResult = PedagogicalAnalysisSchema.parse(parsedJson);
      } catch (err: any) {
        // Attempt single bounded targeted repair
        try {
          const repairPrompt = `${prompt}\n\n[ERROR]: Your previous response failed schema validation: ${err.message}.\nReturn strictly valid JSON conforming to PedagogicalAnalysis schema.`;
          const repairResponse = await aiProvider.generateAnalysis(repairPrompt, {
            question,
            passage,
            images: images.length > 0 ? images : undefined,
          });
          analysisResult = PedagogicalAnalysisSchema.parse(JSON.parse(repairResponse));
        } catch (repairErr: any) {
          if (aiProvider.name === 'offline-mock') {
            analysisResult = deriveDeterministicAnalysis(question, passage);
          } else {
            throw new Error(
              `Pedagogical analysis failed for Exam ${examId} Q${question.questionNumber}: ${repairErr.message}`
            );
          }
        }
      }

      analyzedQuestions.push({
        examId,
        questionNumber: question.questionNumber,
        contentHash,
        promptVersion: PROMPT_VERSION,
        modelName: aiProvider.modelName,
        analyzedAt: new Date().toISOString(),
        extracted: question,
        analysis: analysisResult,
      });

      freshAnalyzedCount++;
    }

    analyzedQuestions.sort((a, b) => a.questionNumber - b.questionNumber);

    const analyzedExam: AnalyzedExam = {
      examId,
      year: extractedContent.year,
      promptVersion: PROMPT_VERSION,
      analyzedAt: new Date().toISOString(),
      questions: analyzedQuestions,
    };

    AnalyzedExamSchema.parse(analyzedExam);
    fs.writeFileSync(analyzedPath, JSON.stringify(analyzedExam, null, 2), 'utf-8');

    summaries.push({
      examId,
      totalQuestions: analyzedQuestions.length,
      analyzedCount: freshAnalyzedCount,
      cachedCount,
      outputPath: analyzedPath,
    });
  }

  return summaries;
}
