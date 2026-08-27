import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runBenchmarkPipeline } from '../../scripts/history-exams/src/benchmark';
import { CapBenchmarkSchema } from '../../scripts/history-exams/src/schemas';

describe('Historical CAP English Exam Benchmark Builder', () => {
  const analyzedDir = path.resolve(__dirname, '../../history_exams/analyzed');
  const benchmarkDir = path.resolve(__dirname, '../../history_exams/benchmark');

  it('generates a valid benchmark foundation with distributions and holdout reference set', async () => {
    const summary = await runBenchmarkPipeline({
      analyzedDir,
      benchmarkDir,
    });

    expect(fs.existsSync(summary.outputPath)).toBe(true);
    expect(summary.totalQuestions).toBeGreaterThanOrEqual(215);

    const json = JSON.parse(fs.readFileSync(summary.outputPath, 'utf-8'));
    const benchmark = CapBenchmarkSchema.parse(json);

    expect(benchmark.referenceCorpus.totalQuestions).toBe(summary.totalQuestions);
    expect(benchmark.holdoutReferenceSet.length).toBeGreaterThanOrEqual(20);

    // Verify holdout questions span all 5 exams
    const holdoutExamIds = new Set(benchmark.holdoutReferenceSet.map((h) => h.examId));
    expect(holdoutExamIds.size).toBe(5);

    // Verify essential context rate in passage section is 100%
    expect(benchmark.rates.essentialContextRatePassageSection).toBe(100);
  });
});
