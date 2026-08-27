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
import { AiProvider, createAiProvider, deriveDeterministicAnalysis } from './ai-provider.ts';
import { computeQuestionContentHash } from './content-hasher.ts';
import { buildPedagogicalAnalysisPrompt, PROMPT_VERSION } from './prompt.ts';

export interface RunAnalysisOptions {
  extractedDir: string;
  analyzedDir: string;
  examIdFilter?: string;
  questionNumberFilter?: number;
  force?: boolean;
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
 * Runs Stage 2: Pedagogical Deep Analysis over the extracted exams
 */
export async function runAnalysisPipeline(options: RunAnalysisOptions): Promise<AnalysisSummary[]> {
  const { extractedDir, analyzedDir, examIdFilter, questionNumberFilter, force } = options;
  const aiProvider = options.aiProvider || createAiProvider();

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
        // If filtering by question, preserve existing if present
        const existing = existingMap.get(question.questionNumber);
        if (existing) {
          analyzedQuestions.push(existing);
        }
        continue;
      }

      const passage = question.passageId ? passageMap.get(question.passageId) : null;
      const contentHash = computeQuestionContentHash(question, passage?.text, PROMPT_VERSION);

      const existingRecord = existingMap.get(question.questionNumber);

      if (!force && existingRecord && existingRecord.contentHash === contentHash) {
        analyzedQuestions.push(existingRecord);
        cachedCount++;
        continue;
      }

      // Analyze question
      const analysis = await analyzeSingleQuestion(question, passage, aiProvider);

      const record: AnalyzedQuestion = {
        examId,
        questionNumber: question.questionNumber,
        contentHash,
        promptVersion: PROMPT_VERSION,
        analyzedAt: new Date().toISOString(),
        modelName: aiProvider.name,
        extracted: question,
        analysis,
      };

      analyzedQuestions.push(record);
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

/**
 * Analyzes a single question with schema validation and bounded targeted repair
 */
async function analyzeSingleQuestion(
  question: ExtractedQuestion,
  passage: ExtractedPassage | null | undefined,
  aiProvider: AiProvider
): Promise<PedagogicalAnalysis> {
  const prompt = buildPedagogicalAnalysisPrompt(question, passage);

  try {
    const rawOutput = await aiProvider.generateAnalysis(prompt, { question, passage });
    const cleaned = cleanJsonString(rawOutput);
    const parsedJson = JSON.parse(cleaned);

    const parseResult = PedagogicalAnalysisSchema.safeParse(parsedJson);
    if (parseResult.success) {
      return parseResult.data;
    }

    // Bounded retry / repair: if model output violates schema, attempt 1 targeted fix
    const repairPrompt = `${prompt}\n\n[PREVIOUS ATTEMPT OUTPUT FAILED SCHEMA VALIDATION]:\n${JSON.stringify(
      parseResult.error.issues,
      null,
      2
    )}\nPlease fix all schema errors and return strictly valid JSON.`;

    const repairOutput = await aiProvider.generateAnalysis(repairPrompt, { question, passage });
    const repairCleaned = cleanJsonString(repairOutput);
    const repairParsed = JSON.parse(repairCleaned);
    const repairResult = PedagogicalAnalysisSchema.safeParse(repairParsed);

    if (repairResult.success) {
      return repairResult.data;
    }

    // If repair also fails, fallback to deterministic pedagogical rule
    return deriveDeterministicAnalysis(question, passage);
  } catch {
    // On network or parsing failure, derive deterministic analysis
    return deriveDeterministicAnalysis(question, passage);
  }
}

function cleanJsonString(str: string): string {
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}
