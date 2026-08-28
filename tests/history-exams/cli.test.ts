import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runExtractionPipeline } from '../../scripts/history-exams/src/extractor';
import { runAnalysisPipeline } from '../../scripts/history-exams/src/analyzer';
import { runSynthesisPipeline } from '../../scripts/history-exams/src/synthesizer';
import { runBenchmarkPipeline } from '../../scripts/history-exams/src/benchmark';
import { validateFullCorpus } from '../../scripts/history-exams/src/validator';
import { generateSpotCheckReport } from '../../scripts/history-exams/src/spot-check/spot-check-builder';
import { generatePilotReviewReport } from '../../scripts/history-exams/src/spot-check/pilot-builder';

describe('Historical CAP English Exam Pipeline Smoke Test', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
  });

  it(
    'runs complete lifecycle end-to-end and validates resulting artifacts',
    async () => {
      const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-cli-'));
      roots.push(testRoot);
      const rawDir = path.join(testRoot, 'raw');
      const assetsDir = path.join(testRoot, 'assets');
      const extractedDir = path.join(testRoot, 'extracted');
      const analyzedDir = path.join(testRoot, 'analyzed');
      const knowledgeDir = path.join(testRoot, 'knowledge');
      const benchmarkDir = path.join(testRoot, 'benchmark');
      const spotCheckPath = path.join(testRoot, 'spot-check-report.md');
      const pilotReviewPath = path.join(testRoot, 'pilot-review.md');
      fs.cpSync(path.resolve(__dirname, '../../history_exams/raw'), rawDir, { recursive: true });

      // 1. Extract & Render
      const extractResults = await runExtractionPipeline({
        rawDir,
        outputDir: extractedDir,
        assetsDir,
        renderImages: true,
      });
      expect(extractResults.length).toBe(5);

      // 2. Analyze
      const analyzeResults = await runAnalysisPipeline({
        extractedDir,
        analyzedDir,
        allowOfflineMock: true,
      });
      expect(analyzeResults.length).toBe(5);

      // 3. Synthesize
      const synthResult = await runSynthesisPipeline({
        analyzedDir,
        knowledgeDir,
        benchmarkDir,
        allowProvisionalMock: true,
      });
      expect(synthResult.totalQuestions).toBe(215);

      // 4. Benchmark
      const benchResult = await runBenchmarkPipeline({
        analyzedDir,
        benchmarkDir,
        allowProvisionalMock: true,
      });
      expect(benchResult.holdoutCount).toBe(20);

      // 5. Spot-Check Report & Pilot Review Report
      const spotPath = generateSpotCheckReport({
        extractedDir,
        analyzedDir,
        outputPath: spotCheckPath,
      });
      expect(fs.existsSync(spotPath)).toBe(true);

      const pilotPath = generatePilotReviewReport({
        extractedDir,
        analyzedDir,
        outputPath: pilotReviewPath,
      });
      expect(fs.existsSync(pilotPath)).toBe(true);

      // 6. Validate
      const valReport = validateFullCorpus({ extractedDir, analyzedDir, knowledgeDir, benchmarkDir });
      expect(valReport.valid).toBe(true);
      expect(valReport.errors).toEqual([]);
    },
    45000
  );
});
