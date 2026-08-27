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
import { computeQuestionContentHash } from './content-hasher.ts';
import { buildPedagogicalAnalysisPrompt, PROMPT_VERSION } from './prompt.ts';

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
      const contentHash = computeQuestionContentHash(
        question,
        passage?.text,
        PROMPT_VERSION,
        aiProvider.name,
        aiProvider.modelName
      );

      const existingRecord = existingMap.get(question.questionNumber);

      // Check cache validity (must match hash AND must not be an offline-mock record if running live provider)
      const isMockCached = existingRecord?.analysis?.explanation?.includes('rule-based') || false;
      const isLiveRun = aiProvider.name !== 'offline-mock';

      if (!force && existingRecord && existingRecord.contentHash === contentHash && !(isLiveRun && isMockCached)) {
        analyzedQuestions.push(existingRecord);
        cachedCount++;
        continue;
      }

      // Collect image attachments if multimodal evidence is required
      const images: ImageAttachment[] = [];
      if (question.visualEvidenceRequired && question.requiredAssets.length > 0) {
        for (const asset of question.requiredAssets) {
          const absAssetPath = path.isAbsolute(asset.imagePath)
            ? asset.imagePath
            : path.resolve(process.cwd(), asset.imagePath);
          if (fs.existsSync(absAssetPath)) {
            const imgData = fs.readFileSync(absAssetPath).toString('base64');
            images.push({
              mimeType: 'image/png',
              base64Data: imgData,
            });
          }
        }
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
