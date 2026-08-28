import path from 'node:path';
import { runExtractionPipeline } from './extractor/index.ts';
import { runAnalysisPipeline, createAiProvider } from './analyzer/index.ts';
import { runSynthesisPipeline } from './synthesizer/index.ts';
import { runBenchmarkPipeline } from './benchmark/index.ts';
import { validateFullCorpus } from './validator/index.ts';
import { generateSpotCheckReport } from './spot-check/spot-check-builder.ts';
import { generatePilotReviewReport } from './spot-check/pilot-builder.ts';
import { commitRollingWindowManifest, reconcileRollingWindow } from './corpus/rolling-window.ts';
import { writePrecedentCards } from './precedents/build-precedent-cards.ts';
import { rotateHoldoutManifest } from './benchmark/rotate-holdouts.ts';

const rootDir = process.cwd();
const rawDir = path.resolve(rootDir, 'history_exams/raw');
const assetsDir = path.resolve(rootDir, 'history_exams/assets');
const extractedDir = path.resolve(rootDir, 'history_exams/extracted');
const analyzedDir = path.resolve(rootDir, 'history_exams/analyzed');
const knowledgeDir = path.resolve(rootDir, 'history_exams/knowledge');
const benchmarkDir = path.resolve(rootDir, 'history_exams/benchmark');
const spotCheckPath = path.resolve(rootDir, 'history_exams/spot-check-report.md');
const pilotReviewPath = path.resolve(rootDir, 'history_exams/pilot-review.md');
const agentAnalysisDir = path.resolve(rootDir, 'history_exams/agent_analysis');

function parseArgs(args: string[]) {
  const command = args[0] || 'help';
  let examId: string | undefined;
  let questionNumber: number | undefined;
  let questionNumbers: number[] | undefined;
  let providerName: 'gemini' | 'openai' | 'offline-mock' | undefined;
  let modelName: string | undefined;
  let concurrency: number | undefined;
  let force = false;
  let allowProvisionalMock = false;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--exam' && args[i + 1]) {
      examId = args[i + 1];
      i++;
    } else if (args[i] === '--question' && args[i + 1]) {
      questionNumber = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--questions' && args[i + 1]) {
      questionNumbers = args[i + 1].split(/[,\s]+/).map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      i++;
    } else if (args[i] === '--provider' && args[i + 1]) {
      providerName = args[i + 1] as any;
      i++;
    } else if (args[i] === '--model' && args[i + 1]) {
      modelName = args[i + 1];
      i++;
    } else if (args[i] === '--concurrency' && args[i + 1]) {
      concurrency = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--force') {
      force = true;
    } else if (args[i] === '--allow-offline-mock' || args[i] === '--allow-provisional-mock') {
      allowProvisionalMock = true;
    }
  }

  return {
    command,
    examId,
    questionNumber,
    questionNumbers,
    providerName,
    modelName,
    concurrency,
    force,
    allowProvisionalMock,
  };
}

async function main() {
  const {
    command,
    examId,
    questionNumber,
    questionNumbers,
    providerName,
    modelName,
    concurrency,
    force,
    allowProvisionalMock,
  } = parseArgs(process.argv.slice(2));

  console.log(`[history-exams] Command: ${command}`);

  switch (command) {
    case 'extract': {
      console.log(`[history-exams] Stage 1: Extracting and rendering multimodal assets from ${rawDir}...`);
      const results = await runExtractionPipeline({
        rawDir,
        outputDir: extractedDir,
        assetsDir,
        examIdFilter: examId,
        renderImages: true,
      });
      console.log(`[history-exams] Extracted ${results.length} exams.`);
      for (const r of results) {
        console.log(`  - Exam ${r.examId}: ${r.questionCount} questions, ${r.passageCount} passages, ${r.renderedImagesCount} page images. Valid: ${r.validation.valid}`);
      }
      break;
    }

    case 'analyze': {
      console.log(`[history-exams] Stage 2: Deep Pedagogical Reverse-Engineering (Two-Pass Live AI)...`);
      const results = await runAnalysisPipeline({
        extractedDir,
        analyzedDir,
        examIdFilter: examId,
        questionNumberFilter: questionNumber,
        questionNumbersFilter: questionNumbers,
        providerName,
        modelName,
        concurrency,
        force,
        allowOfflineMock: allowProvisionalMock,
      });
      console.log(`[history-exams] Analyzed ${results.length} exams.`);
      for (const r of results) {
        console.log(`  - Exam ${r.examId}: ${r.totalQuestions} questions (Analyzed: ${r.analyzedCount}, Cached: ${r.cachedCount})`);
      }
      break;
    }

    case 'pilot': {
      const pilotExamId = examId || '115';
      const pilotQuestions = questionNumbers || [1, 20, 22, 23, 26, 32, 38, 43];
      console.log(`[history-exams] Phase 4 Pilot: Running targeted two-pass digestion on Exam ${pilotExamId} (Questions: ${pilotQuestions.join(', ')})...`);
      await runAnalysisPipeline({
        extractedDir,
        analyzedDir,
        examIdFilter: pilotExamId,
        questionNumbersFilter: pilotQuestions,
        providerName,
        modelName,
        concurrency,
        force,
        allowOfflineMock: allowProvisionalMock,
      });
      const outPath = generatePilotReviewReport({
        extractedDir,
        analyzedDir,
        outputPath: pilotReviewPath,
        targetExamId: pilotExamId,
        targetQuestions: pilotQuestions,
      });
      console.log(`[history-exams] Pilot review report successfully generated: ${outPath}`);
      break;
    }

    case 'synthesize': {
      console.log(`[history-exams] Stage 3: Synthesizing Cross-Year Knowledge Base with Holdout Isolation...`);
      let aiProvider;
      try {
        aiProvider = createAiProvider({ allowOfflineMock: allowProvisionalMock });
      } catch {}

      const result = await runSynthesisPipeline({
        analyzedDir,
        knowledgeDir,
        benchmarkDir,
        allowProvisionalMock,
        aiProvider,
      });
      console.log(`[history-exams] Synthesis complete across ${result.totalExams} exams and ${result.nonHoldoutQuestionsCount} non-holdout questions (${result.excludedHoldoutCount} holdouts isolated).`);
      console.log(`  - Taxonomy: ${result.taxonomyPath}`);
      console.log(`  - Recipes: ${result.recipesPath}`);
      console.log(`  - Distractors: ${result.distractorsPath}`);
      console.log(`  - Depth Framework: ${result.depthFrameworkPath}`);
      console.log(`  - Anti-Patterns: ${result.antiPatternsPath}`);
      console.log(`  - Blueprint JSON: ${result.blueprintJsonPath}`);
      console.log(`  - Blueprint MD: ${result.blueprintMdPath}`);
      break;
    }

    case 'benchmark': {
      console.log(`[history-exams] Stage 4: Building Benchmark Foundation...`);
      const result = await runBenchmarkPipeline({
        analyzedDir,
        benchmarkDir,
        allowProvisionalMock,
      });
      console.log(`[history-exams] Benchmark built: ${result.outputPath} (${result.holdoutCount} holdouts).`);
      break;
    }

    case 'spot-check': {
      console.log(`[history-exams] Generating Human Spot-Check Report...`);
      const outPath = generateSpotCheckReport({
        extractedDir,
        analyzedDir,
        outputPath: spotCheckPath,
      });
      console.log(`[history-exams] Spot-check report generated: ${outPath}`);
      break;
    }

    case 'validate': {
      console.log(`[history-exams] Validating Complete Corpus...`);
      const report = validateFullCorpus({
        extractedDir,
        analyzedDir,
        knowledgeDir,
        benchmarkDir,
      });
      console.log(`[history-exams] Validation Report:`);
      console.log(`  - Structurally Valid: ${report.structurallyValid ? '✅ YES' : '❌ NO'}`);
      console.log(`  - Authority Eligible: ${report.authorityEligible ? '✅ YES (Authoritative CAP Brain)' : '❌ NO (Provisional)'}`);
      console.log(`  - Authority Status:   ${report.authorityStatus.toUpperCase()}`);
      console.log(`  - Extracted exams:    ${report.extractedExamsCount} / 5`);
      console.log(`  - Analyzed exams:     ${report.analyzedExamsCount} / 5`);
      console.log(`  - Knowledge artifacts:${report.knowledgeArtifactsCount} / 7`);
      console.log(`  - Benchmark valid:    ${report.benchmarkValid ? '✅ YES' : '❌ NO'}`);

      if (report.authorityBlockers.length > 0) {
        console.log(`\n[history-exams] Blockers for Authoritative Certification:`);
        for (const blocker of report.authorityBlockers) {
          console.log(`  * ${blocker}`);
        }
      }

      if (report.errors.length > 0) {
        console.error('\n[history-exams] Structural Errors:', report.errors);
        process.exit(1);
      }
      break;
    }

    case 'build': {
      console.log(`[history-exams] Running Complete Hardened Pipeline...`);
      const rolling = reconcileRollingWindow({ rawDir, extractedDir, analyzedDir, assetsDir, agentAnalysisDir });
      console.log(`[history-exams] Rolling window ${rolling.examIds.join(', ')}; reusing authoritative analysis for ${rolling.unchangedExamIds.join(', ') || 'none'}.`);
      await runExtractionPipeline({ rawDir, outputDir: extractedDir, assetsDir, renderImages: true, examIdsToProcess: rolling.changedExamIds });
      await runAnalysisPipeline({
        extractedDir,
        analyzedDir,
        providerName,
        modelName,
        concurrency,
        force: false,
        allowOfflineMock: allowProvisionalMock,
      });
      rotateHoldoutManifest(analyzedDir, benchmarkDir, rolling.examIds);
      let aiProvider;
      try {
        aiProvider = createAiProvider({ allowOfflineMock: allowProvisionalMock });
      } catch {}
      await runSynthesisPipeline({ analyzedDir, knowledgeDir, benchmarkDir, allowProvisionalMock, aiProvider });
      await runBenchmarkPipeline({ analyzedDir, benchmarkDir, allowProvisionalMock });
      generateSpotCheckReport({ extractedDir, analyzedDir, outputPath: spotCheckPath });
      generatePilotReviewReport({ extractedDir, analyzedDir, outputPath: pilotReviewPath });
      const report = validateFullCorpus({ extractedDir, analyzedDir, knowledgeDir, benchmarkDir });
      if (!report.valid || !report.authorityEligible || report.authorityStatus !== 'authoritative') {
        console.error('[history-exams] Build validation failed:', report.errors);
        process.exit(1);
      }
      writePrecedentCards(
        analyzedDir,
        benchmarkDir,
        path.resolve(rootDir, 'packages/generator/curriculum/cap-precedent-cards.json'),
        path.resolve(rootDir, 'history_exams/knowledge/cap-precedent-index.json'),
      );
      commitRollingWindowManifest(rawDir, rolling);
      console.log(`[history-exams] Complete digestion pipeline successfully built, validated, and spot-check/pilot reports generated!`);
      break;
    }

    case 'reconcile': {
      const rolling = reconcileRollingWindow({ rawDir, extractedDir, analyzedDir, assetsDir, agentAnalysisDir });
      console.log(JSON.stringify(rolling, null, 2));
      break;
    }

    case 'precedents': {
      const cards = writePrecedentCards(analyzedDir, benchmarkDir, path.resolve(rootDir, 'packages/generator/curriculum/cap-precedent-cards.json'), path.resolve(rootDir, 'history_exams/knowledge/cap-precedent-index.json'));
      console.log(`[history-exams] Wrote ${cards.length} authoritative non-holdout precedent cards.`);
      break;
    }

    default: {
      console.log(`
Usage: pnpm history-exams <command> [options]

Commands:
  extract      Run multimodal extraction and render page assets for raw exam PDFs
  analyze      Run live AI pedagogical deep analysis (requires GEMINI_API_KEY or OPENAI_API_KEY)
  pilot        Run targeted two-pass digestion pilot (115 Q1, Q20, Q22, Q23, Q26, Q32, Q38, Q43) and generate history_exams/pilot-review.md
  synthesize   Run cross-year knowledge synthesis producing taxonomy, recipes, distractors, depth framework, anti-patterns, and blueprint
  benchmark    Build CAP benchmark foundation distributions and holdout set
  spot-check   Generate human spot-check report (history_exams/spot-check-report.md)
  validate     Validate integrity, schema, and provenance across all artifacts
  build        Run extract -> analyze -> synthesize -> benchmark -> spot-check -> pilot -> validate in sequence
  reconcile    Reconcile derived artifacts to the authoritative rolling five-year raw/ window
  precedents   Build compact production precedent cards with strict holdout isolation

Options:
  --exam <id>               Filter by exam ID (e.g. --exam 115)
  --question <num>          Filter by question number (e.g. --question 24)
  --questions <q1,q2,...>   Filter by comma-separated question numbers (e.g. --questions 1,20,22,23,26,32,38,43)
  --provider <name>         AI provider: 'gemini' | 'openai' | 'offline-mock'
  --model <name>            Model name override
  --concurrency <num>       Concurrent API request limit (default: 3)
  --force                   Bypass cache and force re-analysis
  --allow-provisional-mock  Permit provisional offline mock records (for testing only)
      `);
      break;
    }
  }
}

main().catch((err) => {
  console.error('[history-exams] Fatal error:', err);
  process.exit(1);
});
