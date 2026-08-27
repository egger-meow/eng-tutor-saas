import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
import {
  ANALYSIS_SCHEMA_VERSION,
  buildCriticReviewPrompt,
  buildPedagogicalAnalysisPrompt,
  CRITIC_PROMPT_VERSION,
  PROMPT_VERSION,
} from './prompt.ts';

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
  questionNumbersFilter?: number[];
  force?: boolean;
  allowOfflineMock?: boolean;
  aiProvider?: AiProvider;
}

export interface AnalysisSummary {
  examId: string;
  totalQuestions: number;
  analyzedCount: number;
  cachedCount: number;
  repairedCount: number;
  outputPath: string;
}

export interface RunManifest {
  gitSha: string;
  corpusHash: string;
  provider: string;
  model: string;
  analysisPromptVersion: string;
  criticPromptVersion: string;
  analysisSchemaVersion: string;
  startedAt: string;
  completedAt: string;
  totalQuestions: number;
  successfulQuestions: number;
  failedQuestions: number;
  visualQuestionCount: number;
  criticPassedCount: number;
  criticRepairedCount: number;
  criticFailedCount: number;
  criticNotReviewedCount: number;
  repairedByCriticCount: number;
  unresolvedCount: number;
}

function getGitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown-git-sha';
  }
}

/**
 * Runs Stage 2: Pedagogical Deep Analysis over extracted exams with 2-Pass Quality Control (Analyst + Critic)
 */
export async function runAnalysisPipeline(options: RunAnalysisOptions): Promise<AnalysisSummary[]> {
  const {
    extractedDir,
    analyzedDir,
    examIdFilter,
    questionNumberFilter,
    questionNumbersFilter,
    force,
    allowOfflineMock,
  } = options;
  const aiProvider = options.aiProvider || createAiProvider({ allowOfflineMock });
  const startedAt = new Date().toISOString();

  if (!fs.existsSync(analyzedDir)) {
    fs.mkdirSync(analyzedDir, { recursive: true });
  }

  const extractedFiles = fs
    .readdirSync(extractedDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  const summaries: AnalysisSummary[] = [];
  let globalSuccessful = 0;
  let globalFailed = 0;
  let globalVisual = 0;
  let globalRepaired = 0;
  let globalTotal = 0;
  const allQuestionHashes: string[] = [];

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
    let examRepairedCount = 0;

    for (const question of extractedContent.questions) {
      globalTotal++;
      if (question.visualEvidenceRequired) {
        globalVisual++;
      }

      // Check if targeted by question filters
      if (questionNumberFilter && question.questionNumber !== questionNumberFilter) {
        const existing = existingMap.get(question.questionNumber);
        if (existing) {
          analyzedQuestions.push(existing);
          allQuestionHashes.push(existing.contentHash);
        }
        continue;
      }
      if (questionNumbersFilter && !questionNumbersFilter.includes(question.questionNumber)) {
        const existing = existingMap.get(question.questionNumber);
        if (existing) {
          analyzedQuestions.push(existing);
          allQuestionHashes.push(existing.contentHash);
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
        imageHashes,
        CRITIC_PROMPT_VERSION,
        ANALYSIS_SCHEMA_VERSION
      );
      allQuestionHashes.push(contentHash);

      const existingRecord = existingMap.get(question.questionNumber);

      // Check cache validity (must match hash AND must not be an offline-mock record if running live provider)
      const isMockCached =
        existingRecord?.modelName === 'rule-based-mock' ||
        existingRecord?.modelName === 'offline-mock';
      const isExistingLiveOrAgent =
        existingRecord &&
        existingRecord.modelName !== 'rule-based-mock' &&
        existingRecord.modelName !== 'offline-mock';
      const isLiveRun = aiProvider.name !== 'offline-mock';

      // Strict Real Data Rule: Offline mock must NEVER overwrite live or agent-authored records under any circumstances
      if (aiProvider.name === 'offline-mock' && isExistingLiveOrAgent) {
        analyzedQuestions.push(existingRecord);
        cachedCount++;
        globalSuccessful++;
        continue;
      }

      if (
        !force &&
        existingRecord &&
        existingRecord.contentHash === contentHash &&
        !(isLiveRun && isMockCached)
      ) {
        analyzedQuestions.push(existingRecord);
        cachedCount++;
        globalSuccessful++;
        continue;
      }

      // === Pass A: Analyst ===
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
            globalFailed++;
            throw new Error(
              `Pedagogical analysis Pass A failed for Exam ${examId} Q${question.questionNumber}: ${repairErr.message}`
            );
          }
        }
      }

      // === Pass B: Evidence Critic ===
      if (aiProvider.generateCriticReview && aiProvider.name !== 'offline-mock') {
        try {
          const criticPrompt = buildCriticReviewPrompt(question, analysisResult, passage);
          const criticRaw = await aiProvider.generateCriticReview(criticPrompt, {
            question,
            passage,
            images: images.length > 0 ? images : undefined,
          });
          const criticData = JSON.parse(criticRaw);

          if (criticData.criticStatus === 'repaired' && criticData.repairedFields) {
            const merged = { ...analysisResult, ...criticData.repairedFields };
            analysisResult = PedagogicalAnalysisSchema.parse(merged);
            analysisResult.criticStatus = 'repaired';
            analysisResult.criticIssues = criticData.criticIssues || ['Critic applied targeted repairs'];
            examRepairedCount++;
            globalRepaired++;
          } else if (criticData.criticStatus === 'failed') {
            analysisResult.criticStatus = 'failed';
            analysisResult.criticIssues = criticData.criticIssues || ['Critic flagged unrepairable grounding or distractor defect'];
          } else {
            analysisResult.criticStatus = 'passed';
            analysisResult.criticIssues = [];
          }
        } catch (criticErr: any) {
          // If critic fails or errors, explicitly record not_reviewed (never falsely claim passed)
          analysisResult.criticStatus = 'not_reviewed';
          analysisResult.criticIssues = [`Critic review execution failed: ${criticErr.message}`];
          analysisResult.uncertainties = [
            ...(analysisResult.uncertainties || []),
            `Critic pass review skipped due to execution error: ${criticErr.message}`,
          ];
        }
      }

      analyzedQuestions.push({
        examId,
        questionNumber: question.questionNumber,
        contentHash,
        providerName: aiProvider.name,
        modelName: aiProvider.modelName,
        promptVersion: PROMPT_VERSION,
        criticPromptVersion: CRITIC_PROMPT_VERSION,
        analysisSchemaVersion: ANALYSIS_SCHEMA_VERSION,
        analyzedAt: new Date().toISOString(),
        extracted: question,
        analysis: analysisResult,
      });

      freshAnalyzedCount++;
      globalSuccessful++;
    }

    analyzedQuestions.sort((a, b) => a.questionNumber - b.questionNumber);

    const analyzedExam: AnalyzedExam = {
      examId,
      year: extractedContent.year,
      promptVersion: PROMPT_VERSION,
      criticPromptVersion: CRITIC_PROMPT_VERSION,
      analysisSchemaVersion: ANALYSIS_SCHEMA_VERSION,
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
      repairedCount: examRepairedCount,
      outputPath: analyzedPath,
    });
  }

  // Write Run Manifest: Scan all analyzed files in directory for comprehensive ledger
  const allAnalyzedInDir: AnalyzedQuestion[] = [];
  const analyzedJsonFiles = fs
    .readdirSync(analyzedDir)
    .filter((f) => f.endsWith('.json') && f !== 'run-manifest.json');
  for (const f of analyzedJsonFiles) {
    try {
      const examData = JSON.parse(fs.readFileSync(path.join(analyzedDir, f), 'utf-8'));
      if (examData && Array.isArray(examData.questions)) {
        allAnalyzedInDir.push(...examData.questions);
      }
    } catch {}
  }

  const criticPassedCount = allAnalyzedInDir.filter((q) => q.analysis?.criticStatus === 'passed').length;
  const criticRepairedCount = allAnalyzedInDir.filter((q) => q.analysis?.criticStatus === 'repaired').length;
  const criticFailedCount = allAnalyzedInDir.filter((q) => q.analysis?.criticStatus === 'failed').length;
  const criticNotReviewedCount = allAnalyzedInDir.filter(
    (q) => !q.analysis?.criticStatus || q.analysis.criticStatus === 'not_reviewed'
  ).length;

  const corpusHash = createHash('sha256').update(allQuestionHashes.sort().join(':')).digest('hex');
  const manifest: RunManifest = {
    gitSha: getGitSha(),
    corpusHash,
    provider: aiProvider.name,
    model: aiProvider.modelName,
    analysisPromptVersion: PROMPT_VERSION,
    criticPromptVersion: CRITIC_PROMPT_VERSION,
    analysisSchemaVersion: ANALYSIS_SCHEMA_VERSION,
    startedAt,
    completedAt: new Date().toISOString(),
    totalQuestions: globalTotal,
    successfulQuestions: globalSuccessful,
    failedQuestions: globalFailed,
    visualQuestionCount: globalVisual,
    criticPassedCount,
    criticRepairedCount,
    criticFailedCount,
    criticNotReviewedCount,
    repairedByCriticCount: criticRepairedCount,
    unresolvedCount: globalFailed + criticFailedCount + criticNotReviewedCount,
  };

  const manifestPath = path.join(analyzedDir, 'run-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  return summaries;
}

