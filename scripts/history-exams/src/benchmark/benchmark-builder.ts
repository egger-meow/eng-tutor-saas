import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  AnalyzedExam,
  AnalyzedQuestion,
  CognitiveDepth,
  CognitiveDepthSchema,
  DistractorPattern,
  DistractorPatternSchema,
  EvidenceNecessity,
  EvidenceNecessitySchema,
  EvidenceSpan,
  EvidenceSpanSchema,
  LanguageDifficulty,
  LanguageDifficultySchema,
  TaxonomySkill,
  TaxonomySkillSchema,
} from '../schemas/analyzed.ts';
import {
  BenchmarkHoldoutItem,
  CapBenchmark,
  CapBenchmarkSchema,
  HoldoutManifest,
  HoldoutManifestSchema,
} from '../schemas/benchmark.ts';

export interface BenchmarkOptions {
  analyzedDir: string;
  benchmarkDir: string;
  allowProvisionalMock?: boolean;
}

export interface BenchmarkSummary {
  outputPath: string;
  totalQuestions: number;
  holdoutCount: number;
  benchmark: CapBenchmark;
}

export async function runBenchmarkPipeline(options: BenchmarkOptions): Promise<BenchmarkSummary> {
  const { analyzedDir, benchmarkDir, allowProvisionalMock = false } = options;

  if (!fs.existsSync(benchmarkDir)) {
    fs.mkdirSync(benchmarkDir, { recursive: true });
  }

  const analyzedFiles = fs
    .readdirSync(analyzedDir)
    .filter((f) => f.endsWith('.json') && f !== 'run-manifest.json')
    .sort();

  const allExams: AnalyzedExam[] = [];
  const allQuestions: AnalyzedQuestion[] = [];

  for (const file of analyzedFiles) {
    const content: AnalyzedExam = JSON.parse(
      fs.readFileSync(path.join(analyzedDir, file), 'utf-8')
    );
    allExams.push(content);
    allQuestions.push(...content.questions);
  }

  if (allQuestions.length === 0) {
    throw new Error('No analyzed questions available for benchmark construction');
  }

  // Strict Provenance Gate: Reject offline mock records unless explicitly opted in
  const mockQuestions = allQuestions.filter(
    (q) => q.modelName === 'rule-based-mock' || q.modelName === 'offline-mock'
  );
  if (mockQuestions.length > 0 && !allowProvisionalMock) {
    throw new Error(
      `[MockDataQuarantinedError] Cannot build benchmark distributions using ${mockQuestions.length} offline mock analyzed record(s). ` +
      `Benchmark distributions must derive strictly from authentic live AI Reverse-Engineering. ` +
      `Execute Stage 2 analysis with an API key, or pass --allow-provisional-mock if intentionally running tests.`
    );
  }

  // Load holdout manifest
  const manifestPath = path.join(benchmarkDir, 'holdout-manifest.json');
  let holdoutItemsManifest: HoldoutManifest['holdoutQuestions'] = [];
  if (fs.existsSync(manifestPath)) {
    const rawManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const parsedManifest = HoldoutManifestSchema.safeParse(rawManifest);
    if (parsedManifest.success) {
      holdoutItemsManifest = parsedManifest.data.holdoutQuestions;
    }
  }

  const holdoutKeys = new Set(
    holdoutItemsManifest.map((h) => `${h.examId}-Q${h.questionNumber}`)
  );

  const total = allQuestions.length;

  const skillCounts: Record<TaxonomySkill, number> = {} as any;
  TaxonomySkillSchema.options.forEach((k) => (skillCounts[k] = 0));

  const depthCounts: Record<CognitiveDepth, number> = {} as any;
  CognitiveDepthSchema.options.forEach((k) => (depthCounts[k] = 0));

  const langCounts: Record<LanguageDifficulty, number> = {} as any;
  LanguageDifficultySchema.options.forEach((k) => (langCounts[k] = 0));

  const evidenceNecessityCounts: Record<EvidenceNecessity, number> = {} as any;
  EvidenceNecessitySchema.options.forEach((k) => (evidenceNecessityCounts[k] = 0));

  const spanCounts: Record<EvidenceSpan, number> = {} as any;
  EvidenceSpanSchema.options.forEach((k) => (spanCounts[k] = 0));

  const distractorCounts: Record<DistractorPattern, number> = {} as any;
  DistractorPatternSchema.options.forEach((k) => (distractorCounts[k] = 0));

  let shallowOverall = 0;
  let shallowSingle = 0;
  let singleCount = 0;
  let shallowPassage = 0;
  let passageCount = 0;
  let essentialPassage = 0;
  let totalDistractors = 0;

  for (const q of allQuestions) {
    skillCounts[q.analysis.primarySkill] = (skillCounts[q.analysis.primarySkill] || 0) + 1;
    depthCounts[q.analysis.cognitiveDepth] = (depthCounts[q.analysis.cognitiveDepth] || 0) + 1;
    langCounts[q.analysis.languageDifficulty] = (langCounts[q.analysis.languageDifficulty] || 0) + 1;
    evidenceNecessityCounts[q.analysis.evidenceNecessity] =
      (evidenceNecessityCounts[q.analysis.evidenceNecessity] || 0) + 1;
    spanCounts[q.analysis.evidenceSpan] = (spanCounts[q.analysis.evidenceSpan] || 0) + 1;

    for (const opt of q.analysis.optionAnalyses) {
      if (opt.isCorrect || !opt.distractorStrategy) continue;
      distractorCounts[opt.distractorStrategy] = (distractorCounts[opt.distractorStrategy] || 0) + 1;
      totalDistractors++;
    }

    if (q.analysis.shallowRecall.isShallowRecall) {
      shallowOverall++;
    }

    if (q.extracted.section === 'single') {
      singleCount++;
      if (q.analysis.shallowRecall.isShallowRecall) shallowSingle++;
    } else {
      passageCount++;
      if (q.analysis.shallowRecall.isShallowRecall) shallowPassage++;
      if (q.analysis.evidenceNecessity === 'essential') essentialPassage++;
    }
  }

  const toPct = (record: Record<string, number>, base: number) => {
    const res: Record<string, number> = {};
    for (const k of Object.keys(record)) {
      res[k] = base > 0 ? Math.round(((record[k] || 0) / base) * 1000) / 10 : 0;
    }
    return res;
  };

  // Build isolated holdout set
  const holdoutReferenceSet: BenchmarkHoldoutItem[] = [];

  for (const holdoutQ of holdoutItemsManifest) {
    const match = allQuestions.find(
      (q) => q.examId === holdoutQ.examId && q.questionNumber === holdoutQ.questionNumber
    );
    if (match) {
      holdoutReferenceSet.push({
        examId: match.examId,
        questionNumber: match.questionNumber,
        section: match.extracted.section,
        evidenceMode: match.extracted.evidenceMode,
        primarySkill: match.analysis.primarySkill,
        cognitiveDepth: match.analysis.cognitiveDepth,
        languageDifficulty: match.analysis.languageDifficulty,
        evidenceNecessity: match.analysis.evidenceNecessity,
        evidenceSpan: match.analysis.evidenceSpan,
        contextNecessity: match.analysis.evidenceNecessity,
        benchmarkEvaluationFocus: `Evaluate generated materials on ${match.analysis.primarySkill} at ${match.analysis.cognitiveDepth} depth with ${match.analysis.evidenceNecessity} evidence necessity.`,
      });
    }
  }

  const nonHoldoutCount = total - holdoutReferenceSet.length;
  const isAuthoritative = mockQuestions.length === 0;
  const corpusHash = createHash('sha256')
    .update(allQuestions.map((q) => q.contentHash).sort().join(':'))
    .digest('hex');

  const benchmarkObj: CapBenchmark = {
    provenance: {
      knowledgeVersion: '1.0.0',
      sourceExamIds: allExams.map((e) => e.examId),
      sourceQuestionCount: total,
      excludedHoldoutCount: holdoutReferenceSet.length,
      providerName: allQuestions[0]?.providerName || 'unknown',
      modelName: allQuestions[0]?.modelName || 'unknown',
      analysisPromptVersion: allQuestions[0]?.promptVersion || 'v3.0.0',
      synthesisPromptVersion: 'v1.0.0',
      generatedAt: new Date().toISOString(),
      sourceCorpusHash: corpusHash,
      authorityStatus: isAuthoritative ? 'authoritative' : 'provisional',
    },
    benchmarkVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    referenceCorpus: {
      examIds: allExams.map((e) => e.examId),
      totalQuestions: total,
      nonHoldoutQuestions: nonHoldoutCount,
    },
    distributions: {
      skillDistribution: toPct(skillCounts, total) as any,
      cognitiveDepthDistribution: toPct(depthCounts, total) as any,
      languageDifficultyDistribution: toPct(langCounts, total) as any,
      evidenceNecessityDistribution: toPct(evidenceNecessityCounts, total) as any,
      evidenceSpanDistribution: toPct(spanCounts, total) as any,
      distractorPatternDistribution: toPct(distractorCounts, totalDistractors) as any,
      contextNecessityDistribution: toPct(evidenceNecessityCounts, total) as any,
    },
    rates: {
      shallowRecallRateOverall: total > 0 ? Math.round((shallowOverall / total) * 1000) / 10 : 0,
      shallowRecallRateSingleSection: singleCount > 0 ? Math.round((shallowSingle / singleCount) * 1000) / 10 : 0,
      shallowRecallRatePassageSection: passageCount > 0 ? Math.round((shallowPassage / passageCount) * 1000) / 10 : 0,
      essentialEvidenceRatePassageSection: passageCount > 0 ? Math.round((essentialPassage / passageCount) * 1000) / 10 : 0,
      essentialContextRatePassageSection: passageCount > 0 ? Math.round((essentialPassage / passageCount) * 1000) / 10 : 0,
    },
    holdoutReferenceSet,
  };

  CapBenchmarkSchema.parse(benchmarkObj);

  const outputPath = path.join(benchmarkDir, 'cap-benchmark.json');
  fs.writeFileSync(outputPath, JSON.stringify(benchmarkObj, null, 2), 'utf-8');

  return {
    outputPath,
    totalQuestions: total,
    holdoutCount: holdoutReferenceSet.length,
    benchmark: benchmarkObj,
  };
}

