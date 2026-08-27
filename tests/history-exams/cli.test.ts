import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runExtractionPipeline } from '../../scripts/history-exams/src/extractor';
import { runAnalysisPipeline } from '../../scripts/history-exams/src/analyzer';
import { runSynthesisPipeline } from '../../scripts/history-exams/src/synthesizer';
import { runBenchmarkPipeline } from '../../scripts/history-exams/src/benchmark';
import { validateFullCorpus } from '../../scripts/history-exams/src/validator';

describe('Historical CAP English Exam Pipeline Smoke Test', () => {
  const rawDir = path.resolve(__dirname, '../../history_exams/raw');
  const extractedDir = path.resolve(__dirname, '../../history_exams/extracted');
  const analyzedDir = path.resolve(__dirname, '../../history_exams/analyzed');
  const knowledgeDir = path.resolve(__dirname, '../../history_exams/knowledge');
  const benchmarkDir = path.resolve(__dirname, '../../history_exams/benchmark');

  it('runs complete lifecycle end-to-end and validates resulting artifacts', async () => {
    // 1. Extract
    const extractResults = await runExtractionPipeline({ rawDir, outputDir: extractedDir });
    expect(extractResults.length).toBeGreaterThanOrEqual(5);

    // 2. Analyze
    const analyzeResults = await runAnalysisPipeline({ extractedDir, analyzedDir });
    expect(analyzeResults.length).toBeGreaterThanOrEqual(5);

    // 3. Synthesize
    const synthResult = await runSynthesisPipeline({ analyzedDir, knowledgeDir });
    expect(synthResult.totalQuestions).toBeGreaterThanOrEqual(215);

    // 4. Benchmark
    const benchResult = await runBenchmarkPipeline({ analyzedDir, benchmarkDir });
    expect(benchResult.holdoutCount).toBeGreaterThanOrEqual(20);

    // 5. Validate
    const valReport = validateFullCorpus({ extractedDir, analyzedDir, knowledgeDir, benchmarkDir });
    expect(valReport.valid).toBe(true);
    expect(valReport.errors).toEqual([]);
  });
});
