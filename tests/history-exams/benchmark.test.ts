import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runBenchmarkPipeline } from '../../scripts/history-exams/src/benchmark';
import { CapBenchmarkSchema } from '../../scripts/history-exams/src/schemas';

describe('Historical CAP English Exam Benchmark Builder', () => {
  const analyzedDir = path.resolve(__dirname, '../../history_exams/analyzed');
  const benchmarkDir = path.resolve(__dirname, '../../history_exams/benchmark');

  it('rejects offline mock records by default without allowProvisionalMock flag', async () => {
    const isMockDataPresent = fs.readdirSync(analyzedDir).some((f) => {
      if (!f.endsWith('.json') || f === 'run-manifest.json') return false;
      const content = JSON.parse(fs.readFileSync(path.join(analyzedDir, f), 'utf-8'));
      return content.questions.some((q: any) => q.modelName === 'rule-based-mock' || q.modelName === 'offline-mock');
    });

    if (isMockDataPresent) {
      await expect(
        runBenchmarkPipeline({
          analyzedDir,
          benchmarkDir,
          allowProvisionalMock: false,
        })
      ).rejects.toThrow(/MockDataQuarantinedError/);
    }
  });

  it('generates a valid benchmark foundation with distributions and holdout reference set', async () => {
    const summary = await runBenchmarkPipeline({
      analyzedDir,
      benchmarkDir,
      allowProvisionalMock: true,
    });

    expect(fs.existsSync(summary.outputPath)).toBe(true);
    expect(summary.totalQuestions).toBeGreaterThanOrEqual(215);

    const json = JSON.parse(fs.readFileSync(summary.outputPath, 'utf-8'));
    const benchmark = CapBenchmarkSchema.parse(json);

    expect(benchmark.referenceCorpus.totalQuestions).toBe(summary.totalQuestions);
    expect(benchmark.holdoutReferenceSet.length).toBe(20);
    expect(benchmark.provenance).toBeDefined();
    expect(benchmark.provenance.excludedHoldoutCount).toBe(20);

    // Verify holdout questions span all 5 exams
    const holdoutExamIds = new Set(benchmark.holdoutReferenceSet.map((h) => h.examId));
    expect(holdoutExamIds.size).toBe(5);

    // Verify essential evidence rate in passage section is 100%
    expect(benchmark.rates.essentialEvidenceRatePassageSection).toBe(100);
  });
});

