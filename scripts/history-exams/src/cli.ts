import path from 'node:path';
import { runExtractionPipeline } from './extractor/index.ts';
import { runAnalysisPipeline } from './analyzer/index.ts';
import { runSynthesisPipeline } from './synthesizer/index.ts';
import { runBenchmarkPipeline } from './benchmark/index.ts';
import { validateFullCorpus } from './validator/index.ts';
import { generateSpotCheckReport } from './spot-check/spot-check-builder.ts';

const rootDir = process.cwd();
const rawDir = path.resolve(rootDir, 'history_exams/raw');
const assetsDir = path.resolve(rootDir, 'history_exams/assets');
const extractedDir = path.resolve(rootDir, 'history_exams/extracted');
const analyzedDir = path.resolve(rootDir, 'history_exams/analyzed');
const knowledgeDir = path.resolve(rootDir, 'history_exams/knowledge');
const benchmarkDir = path.resolve(rootDir, 'history_exams/benchmark');
const spotCheckPath = path.resolve(rootDir, 'history_exams/spot-check-report.md');

function parseArgs(args: string[]) {
  const command = args[0] || 'help';
  let examId: string | undefined;
  let questionNumber: number | undefined;
  let force = false;
  let allowOfflineMock = false;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--exam' && args[i + 1]) {
      examId = args[i + 1];
      i++;
    } else if (args[i] === '--question' && args[i + 1]) {
      questionNumber = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--force') {
      force = true;
    } else if (args[i] === '--allow-offline-mock') {
      allowOfflineMock = true;
    }
  }

  return { command, examId, questionNumber, force, allowOfflineMock };
}

async function main() {
  const { command, examId, questionNumber, force, allowOfflineMock } = parseArgs(process.argv.slice(2));

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
      console.log(`[history-exams] Stage 2: Deep Pedagogical Reverse-Engineering (Live AI)...`);
      const results = await runAnalysisPipeline({
        extractedDir,
        analyzedDir,
        examIdFilter: examId,
        questionNumberFilter: questionNumber,
        force,
        allowOfflineMock,
      });
      console.log(`[history-exams] Analyzed ${results.length} exams.`);
      for (const r of results) {
        console.log(`  - Exam ${r.examId}: ${r.totalQuestions} questions (Analyzed: ${r.analyzedCount}, Cached: ${r.cachedCount})`);
      }
      break;
    }

    case 'synthesize': {
      console.log(`[history-exams] Stage 3: Synthesizing Cross-Year Knowledge Base...`);
      const result = await runSynthesisPipeline({
        analyzedDir,
        knowledgeDir,
      });
      console.log(`[history-exams] Synthesis complete across ${result.totalExams} exams and ${result.totalQuestions} questions.`);
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
      console.log(`[history-exams] Validation Report: Valid = ${report.valid}`);
      console.log(`  - Extracted exams: ${report.extractedExamsCount}`);
      console.log(`  - Analyzed exams: ${report.analyzedExamsCount}`);
      console.log(`  - Knowledge artifacts: ${report.knowledgeArtifactsCount}`);
      console.log(`  - Benchmark valid: ${report.benchmarkValid}`);
      if (report.errors.length > 0) {
        console.error('[history-exams] Errors:', report.errors);
        process.exit(1);
      }
      break;
    }

    case 'build': {
      console.log(`[history-exams] Running Complete Hardened Pipeline...`);
      await runExtractionPipeline({ rawDir, outputDir: extractedDir, assetsDir, renderImages: true });
      await runAnalysisPipeline({ extractedDir, analyzedDir, force, allowOfflineMock });
      await runSynthesisPipeline({ analyzedDir, knowledgeDir });
      await runBenchmarkPipeline({ analyzedDir, benchmarkDir });
      generateSpotCheckReport({ extractedDir, analyzedDir, outputPath: spotCheckPath });
      const report = validateFullCorpus({ extractedDir, analyzedDir, knowledgeDir, benchmarkDir });
      if (!report.valid) {
        console.error('[history-exams] Build validation failed:', report.errors);
        process.exit(1);
      }
      console.log(`[history-exams] Complete digestion pipeline successfully built, validated, and spot-check report generated!`);
      break;
    }

    default: {
      console.log(`
Usage: pnpm history-exams <command> [options]

Commands:
  extract      Run multimodal extraction and render page assets for raw exam PDFs
  analyze      Run live AI pedagogical deep analysis (requires GEMINI_API_KEY or OPENAI_API_KEY)
  synthesize   Run cross-year knowledge synthesis producing taxonomy, recipes, distractors, depth framework, anti-patterns, and blueprint
  benchmark    Build CAP benchmark foundation distributions and holdout set
  spot-check   Generate human spot-check report (history_exams/spot-check-report.md)
  validate     Validate integrity, schema, and provenance across all artifacts
  build        Run extract -> analyze -> synthesize -> benchmark -> spot-check -> validate in sequence

Options:
  --exam <id>               Filter by exam ID (e.g. --exam 115)
  --question <num>          Filter by question number (e.g. --question 24)
  --force                   Bypass cache and force re-analysis
  --allow-offline-mock      Permit offline mock provider (for testing/development only)
      `);
      break;
    }
  }
}

main().catch((err) => {
  console.error('[history-exams] Fatal error:', err);
  process.exit(1);
});
