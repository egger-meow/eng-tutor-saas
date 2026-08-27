import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  AnalyzedExam,
  AnalyzedExamSchema,
  DemandLevelSchema,
  DistractorPatternSchema,
  EvidenceNecessitySchema,
  EvidenceReferenceSchema,
  EvidenceSpanSchema,
  LanguageDifficultySchema,
  CognitiveDepthSchema,
  PedagogicalAnalysis,
  PedagogicalAnalysisSchema,
  ReasoningComplexitySchema,
  ShallowRecallSchema,
  TaxonomySkillSchema,
} from '../schemas/analyzed.ts';
import { ExtractedExamSchema } from '../schemas/extracted.ts';
import { computeAssetImageHashes, computeQuestionContentHash } from '../analyzer/content-hasher.ts';

const OptionLetterSchema = z.enum(['A', 'B', 'C', 'D']);
type OptionLetter = z.infer<typeof OptionLetterSchema>;

const CompactDistractorSchema = z.object({
  strategy: DistractorPatternSchema,
  rationale: z.string().min(1),
  misconceptionTarget: z.string().min(1),
  evidenceRefs: z.array(EvidenceReferenceSchema).optional(),
});

const CompactQuestionSchema = z.object({
  questionNumber: z.number().int().min(1).max(43),
  primarySkill: TaxonomySkillSchema,
  secondarySkills: z.array(TaxonomySkillSchema).default([]),
  skillExplanation: z.string().optional(),
  languageDifficulty: LanguageDifficultySchema,
  cognitiveDepth: CognitiveDepthSchema,
  evidenceNecessity: EvidenceNecessitySchema,
  evidenceSpan: EvidenceSpanSchema,
  reasoningOperations: z.array(z.string().min(1)).min(1),
  reasoningComplexity: ReasoningComplexitySchema,
  readingDemand: DemandLevelSchema,
  grammarDemand: DemandLevelSchema,
  vocabularyDemand: DemandLevelSchema,
  inferenceDemand: DemandLevelSchema,
  visualIntegrationDemand: DemandLevelSchema,
  questionMechanism: z.string().min(1),
  whyTheQuestionWorks: z.string().min(1),
  correctRationale: z.string().min(1),
  correctEvidenceRefs: z.array(EvidenceReferenceSchema).optional(),
  distractors: z.record(OptionLetterSchema, CompactDistractorSchema),
  studentFailureModes: z.array(z.string().min(1)).min(1),
  misconceptionsTargeted: z.array(z.string().min(1)).min(1),
  shallowRecall: ShallowRecallSchema.optional(),
  reusableDesignPrinciple: z.string().min(1),
  canSimplifyLanguageWithoutBreakingMechanism: z.boolean(),
  simplificationConstraints: z.array(z.string()).default([]),
  canIncreaseDepthWithoutIncreasingVocabulary: z.boolean(),
  depthAdjustmentStrategies: z.array(z.string()).default([]),
  analysisConfidence: z.enum(['high', 'medium', 'low']).default('high'),
  uncertainties: z.array(z.string()).default([]),
  evidenceReferences: z.array(EvidenceReferenceSchema).min(1),
  criticStatus: z.enum(['passed', 'repaired', 'failed', 'not_reviewed']),
  criticIssues: z.array(z.string()).default([]),
});

const AgentSourceSchema = z.object({
  examId: z.string(),
  providerName: z.string().min(1),
  modelName: z.string().min(1),
  promptVersion: z.string().min(1),
  criticPromptVersion: z.string().min(1),
  analysisSchemaVersion: z.string().default('1.0.0'),
  questions: z.array(CompactQuestionSchema).min(1),
});

export type AgentSource = z.infer<typeof AgentSourceSchema>;

export interface IngestAgentAnalysisOptions {
  sourceDir: string;
  extractedDir: string;
  analyzedDir: string;
  examIdFilter?: string;
}

export interface IngestAgentAnalysisResult {
  ingestedExams: number;
  ingestedQuestions: number;
  outputPaths: string[];
}

function toAnalyzedEvidenceMode(mode: string): PedagogicalAnalysis['evidenceMode'] {
  if (mode === 'visual_only') return 'visual_only';
  if (mode === 'spatial') return 'spatial';
  if (mode === 'text_visual') return 'multimodal_mixed';
  return 'text_only';
}

function buildAnalysis(question: any, compact: z.infer<typeof CompactQuestionSchema>): PedagogicalAnalysis {
  const correct = OptionLetterSchema.parse(question.answer);
  const allOptions: OptionLetter[] = ['A', 'B', 'C', 'D'];
  const distractorLetters = Object.keys(compact.distractors).sort() as OptionLetter[];
  const expectedDistractors = allOptions.filter((option) => option !== correct).sort();

  if (distractorLetters.length !== 3 || distractorLetters.join(',') !== expectedDistractors.join(',')) {
    throw new Error(
      `[AgentAnalysisDistractorError] Exam ${question.examId} Q${question.questionNumber} must define exactly the three official wrong options as distractors. ` +
      `Official correct=${correct}; expected=${expectedDistractors.join(',')}; got=${distractorLetters.join(',')}`
    );
  }

  const optionAnalyses = allOptions.map((option) => {
    if (option === correct) {
      return {
        option,
        isCorrect: true,
        correctRationale: compact.correctRationale,
        evidenceRefs: compact.correctEvidenceRefs ?? compact.evidenceReferences,
      };
    }

    const distractor = compact.distractors[option]!;
    return {
      option,
      isCorrect: false,
      distractorStrategy: distractor.strategy,
      distractorRationale: distractor.rationale,
      evidenceRefs: distractor.evidenceRefs ?? compact.evidenceReferences,
      misconceptionTarget: distractor.misconceptionTarget,
    };
  });

  return PedagogicalAnalysisSchema.parse({
    primarySkill: compact.primarySkill,
    secondarySkills: compact.secondarySkills,
    skillExplanation: compact.skillExplanation,
    languageDifficulty: compact.languageDifficulty,
    cognitiveDepth: compact.cognitiveDepth,
    evidenceMode: toAnalyzedEvidenceMode(question.evidenceMode),
    evidenceNecessity: compact.evidenceNecessity,
    evidenceSpan: compact.evidenceSpan,
    reasoningOperations: compact.reasoningOperations,
    reasoningComplexity: compact.reasoningComplexity,
    optionAnalyses,
    readingDemand: compact.readingDemand,
    grammarDemand: compact.grammarDemand,
    vocabularyDemand: compact.vocabularyDemand,
    inferenceDemand: compact.inferenceDemand,
    visualIntegrationDemand: compact.visualIntegrationDemand,
    questionMechanism: compact.questionMechanism,
    whyTheQuestionWorks: compact.whyTheQuestionWorks,
    studentFailureModes: compact.studentFailureModes,
    misconceptionsTargeted: compact.misconceptionsTargeted,
    shallowRecall: compact.shallowRecall ?? {
      isShallowRecall: false,
      recallType: 'none',
      explanation: 'Answer selection depends on contextual evidence rather than isolated recall.',
    },
    reusableDesignPrinciple: compact.reusableDesignPrinciple,
    difficultyAdjustment: {
      canSimplifyLanguageWithoutBreakingMechanism: compact.canSimplifyLanguageWithoutBreakingMechanism,
      simplificationConstraints: compact.simplificationConstraints,
      canIncreaseDepthWithoutIncreasingVocabulary: compact.canIncreaseDepthWithoutIncreasingVocabulary,
      depthAdjustmentStrategies: compact.depthAdjustmentStrategies,
    },
    analysisConfidence: compact.analysisConfidence,
    uncertainties: compact.uncertainties,
    evidenceReferences: compact.evidenceReferences,
    criticStatus: compact.criticStatus,
    criticIssues: compact.criticIssues,
  });
}

export function ingestAgentAnalysisFiles(options: IngestAgentAnalysisOptions): IngestAgentAnalysisResult {
  const { sourceDir, extractedDir, analyzedDir, examIdFilter } = options;
  fs.mkdirSync(analyzedDir, { recursive: true });

  const sourceFiles = fs
    .readdirSync(sourceDir)
    .filter((file) => file.endsWith('.json'))
    .sort();

  let ingestedExams = 0;
  let ingestedQuestions = 0;
  const outputPaths: string[] = [];

  for (const file of sourceFiles) {
    const rawSource = AgentSourceSchema.parse(JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8')));
    if (examIdFilter && rawSource.examId !== examIdFilter) continue;

    const extractedPath = path.join(extractedDir, `${rawSource.examId}.json`);
    if (!fs.existsSync(extractedPath)) {
      throw new Error(`[AgentAnalysisSourceError] Missing extracted exam ${rawSource.examId}: ${extractedPath}`);
    }
    const extracted = ExtractedExamSchema.parse(JSON.parse(fs.readFileSync(extractedPath, 'utf8')));
    const questionMap = new Map(extracted.questions.map((q) => [q.questionNumber, q]));
    const passageMap = new Map(extracted.passages.map((p) => [p.id, p]));

    const outputPath = path.join(analyzedDir, `${rawSource.examId}.json`);
    let existing: AnalyzedExam | null = null;
    if (fs.existsSync(outputPath)) {
      existing = AnalyzedExamSchema.parse(JSON.parse(fs.readFileSync(outputPath, 'utf8')));
    }
    const merged = new Map(existing?.questions.map((q) => [q.questionNumber, q]) ?? []);

    const seen = new Set<number>();
    for (const compact of rawSource.questions) {
      if (seen.has(compact.questionNumber)) {
        throw new Error(`[AgentAnalysisSourceError] Duplicate source record for Exam ${rawSource.examId} Q${compact.questionNumber}`);
      }
      seen.add(compact.questionNumber);

      const question = questionMap.get(compact.questionNumber);
      if (!question) {
        throw new Error(`[AgentAnalysisSourceError] Exam ${rawSource.examId} Q${compact.questionNumber} does not exist in extracted corpus`);
      }

      const passage = question.passageId ? passageMap.get(question.passageId) : undefined;
      const imageHashes = question.visualEvidenceRequired ? computeAssetImageHashes(question.requiredAssets) : [];
      const contentHash = computeQuestionContentHash(
        question,
        passage?.text,
        rawSource.promptVersion,
        rawSource.providerName,
        rawSource.modelName,
        imageHashes,
        rawSource.criticPromptVersion,
        rawSource.analysisSchemaVersion
      );
      const analysis = buildAnalysis(question, compact);

      merged.set(question.questionNumber, {
        examId: rawSource.examId,
        questionNumber: question.questionNumber,
        contentHash,
        providerName: rawSource.providerName,
        modelName: rawSource.modelName,
        promptVersion: rawSource.promptVersion,
        criticPromptVersion: rawSource.criticPromptVersion,
        analysisSchemaVersion: rawSource.analysisSchemaVersion,
        analyzedAt: new Date().toISOString(),
        extracted: question,
        analysis,
      });
      ingestedQuestions++;
    }

    const questions = [...merged.values()].sort((a, b) => a.questionNumber - b.questionNumber);
    const promptVersions = new Set(questions.map((q) => q.promptVersion));
    const criticVersions = new Set(questions.map((q) => q.criticPromptVersion));
    const schemaVersions = new Set(questions.map((q) => q.analysisSchemaVersion));
    const analyzedExam = AnalyzedExamSchema.parse({
      examId: rawSource.examId,
      year: extracted.year,
      promptVersion: promptVersions.size === 1 ? questions[0]?.promptVersion ?? rawSource.promptVersion : 'mixed-agent-authored',
      criticPromptVersion: criticVersions.size === 1 ? questions[0]?.criticPromptVersion ?? rawSource.criticPromptVersion : 'mixed-agent-authored',
      analysisSchemaVersion: schemaVersions.size === 1 ? questions[0]?.analysisSchemaVersion ?? rawSource.analysisSchemaVersion : 'mixed',
      analyzedAt: new Date().toISOString(),
      questions,
    });

    fs.writeFileSync(outputPath, JSON.stringify(analyzedExam, null, 2), 'utf8');
    ingestedExams++;
    outputPaths.push(outputPath);
  }

  return { ingestedExams, ingestedQuestions, outputPaths };
}
