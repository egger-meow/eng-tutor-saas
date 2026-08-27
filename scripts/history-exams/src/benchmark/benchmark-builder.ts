import fs from 'node:fs';
import path from 'node:path';
import {
  AnalyzedExam,
  AnalyzedQuestion,
  CognitiveDepth,
  CognitiveDepthSchema,
  ContextNecessity,
  ContextNecessitySchema,
  DistractorPattern,
  DistractorPatternSchema,
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
    .filter((f) => f.endsWith('.json'))
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

  const total = allQuestions.length;

  const skillCounts: Record<TaxonomySkill, number> = {} as any;
  TaxonomySkillSchema.options.forEach((k) => (skillCounts[k] = 0));

  const depthCounts: Record<CognitiveDepth, number> = {} as any;
  CognitiveDepthSchema.options.forEach((k) => (depthCounts[k] = 0));

  const langCounts: Record<LanguageDifficulty, number> = {} as any;
  LanguageDifficultySchema.options.forEach((k) => (langCounts[k] = 0));

  const contextCounts: Record<ContextNecessity, number> = {} as any;
  ContextNecessitySchema.options.forEach((k) => (contextCounts[k] = 0));

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
    contextCounts[q.analysis.contextNecessity] = (contextCounts[q.analysis.contextNecessity] || 0) + 1;
    spanCounts[q.analysis.evidenceSpan] = (spanCounts[q.analysis.evidenceSpan] || 0) + 1;

    const correctAnswer = q.extracted.answer;
    for (const d of q.analysis.distractorStrategies) {
      if (correctAnswer && d.option === correctAnswer) continue;
      distractorCounts[d.strategy] = (distractorCounts[d.strategy] || 0) + 1;
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
      if (q.analysis.contextNecessity === 'essential') essentialPassage++;
    }
  }

  const toPct = (record: Record<string, number>, base: number) => {
    const res: Record<string, number> = {};
    for (const k of Object.keys(record)) {
      res[k] = base > 0 ? Math.round(((record[k] || 0) / base) * 1000) / 10 : 0;
    }
    return res;
  };

  // Build isolated holdout set: 4 items per exam representing varied types
  const holdoutReferenceSet: BenchmarkHoldoutItem[] = [];

  for (const exam of allExams) {
    // Pick Q1 (visual image single), Q10 (mid-single grammar/vocab), Q25 (early passage), Q35 (deep passage)
    const candidates = [1, 10, 25, 35];
    for (const qNum of candidates) {
      const match = exam.questions.find((q) => q.questionNumber === qNum);
      if (match) {
        holdoutReferenceSet.push({
          examId: match.examId,
          questionNumber: match.questionNumber,
          section: match.extracted.section,
          primarySkill: match.analysis.primarySkill,
          cognitiveDepth: match.analysis.cognitiveDepth,
          languageDifficulty: match.analysis.languageDifficulty,
          contextNecessity: match.analysis.contextNecessity,
          evidenceSpan: match.analysis.evidenceSpan,
          benchmarkEvaluationFocus: `Evaluate generated materials on ${match.analysis.primarySkill} at ${match.analysis.cognitiveDepth} depth with ${match.analysis.contextNecessity} context.`,
        });
      }
    }
  }

  const benchmarkObj: CapBenchmark = {
    benchmarkVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    referenceCorpus: {
      examIds: allExams.map((e) => e.examId),
      totalQuestions: total,
    },
    distributions: {
      skillDistribution: toPct(skillCounts, total) as any,
      cognitiveDepthDistribution: toPct(depthCounts, total) as any,
      languageDifficultyDistribution: toPct(langCounts, total) as any,
      contextNecessityDistribution: toPct(contextCounts, total) as any,
      evidenceSpanDistribution: toPct(spanCounts, total) as any,
      distractorPatternDistribution: toPct(distractorCounts, totalDistractors) as any,
    },
    rates: {
      shallowRecallRateOverall: total > 0 ? Math.round((shallowOverall / total) * 1000) / 10 : 0,
      shallowRecallRateSingleSection: singleCount > 0 ? Math.round((shallowSingle / singleCount) * 1000) / 10 : 0,
      shallowRecallRatePassageSection: passageCount > 0 ? Math.round((shallowPassage / passageCount) * 1000) / 10 : 0,
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
