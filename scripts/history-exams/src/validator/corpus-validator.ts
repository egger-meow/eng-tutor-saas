import fs from 'node:fs';
import path from 'node:path';
import { AnalyzedExam, AnalyzedExamSchema } from '../schemas/analyzed.ts';
import {
  CapBenchmarkSchema,
  HoldoutManifest,
  HoldoutManifestSchema,
} from '../schemas/benchmark.ts';
import { ExtractedExam } from '../schemas/extracted.ts';
import {
  AntiPatternSchema,
  CapBlueprintSchema,
  DepthLevelDefinitionSchema,
  DistractorPatternStatSchema,
  QuestionRecipeSchema,
} from '../schemas/knowledge.ts';
import { validateExtractedExam } from '../extractor/extractor-validator.ts';
import { z } from 'zod';

export interface CorpusValidationOptions {
  extractedDir: string;
  analyzedDir: string;
  knowledgeDir: string;
  benchmarkDir: string;
}

export interface CorpusValidationReport {
  valid: boolean; // Backwards-compatible alias for structurallyValid
  structurallyValid: boolean;
  authorityEligible: boolean;
  authorityStatus: 'authoritative' | 'provisional' | 'invalid';
  authorityBlockers: string[];
  extractedExamsCount: number;
  analyzedExamsCount: number;
  knowledgeArtifactsCount: number;
  benchmarkValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateFullCorpus(options: CorpusValidationOptions): CorpusValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const authorityBlockers: string[] = [];

  const { extractedDir, analyzedDir, knowledgeDir, benchmarkDir } = options;

  // 1. Validate Extracted Exams
  let extractedCount = 0;
  const allExtractedExams: ExtractedExam[] = [];
  if (fs.existsSync(extractedDir)) {
    const files = fs.readdirSync(extractedDir).filter((f) => f.endsWith('.json'));
    extractedCount = files.length;
    for (const f of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(extractedDir, f), 'utf-8'));
        const examVal = validateExtractedExam(content as ExtractedExam);
        if (!examVal.valid) {
          errors.push(...examVal.errors.map((e) => `[Extracted ${f}] ${e}`));
        }
        warnings.push(...examVal.warnings.map((w) => `[Extracted ${f}] ${w}`));

        // Validate official answer coverage & asset hashes
        for (const q of (content as ExtractedExam).questions) {
          if (!q.answer) {
            errors.push(`[Extracted ${f}] Question ${q.questionNumber} is missing official answer key`);
          }
          if (q.visualEvidenceRequired) {
            if (q.requiredAssets.length === 0) {
              errors.push(`[Extracted ${f}] Question ${q.questionNumber} requires visual evidence but has no requiredAssets`);
            } else {
              for (const asset of q.requiredAssets) {
                if (!asset.sha256 || asset.sha256.length !== 64) {
                  errors.push(`[Extracted ${f}] Question ${q.questionNumber} asset ${asset.imagePath} missing valid SHA-256 hash`);
                }
              }
            }
          }
        }
        allExtractedExams.push(content as ExtractedExam);
      } catch (err: any) {
        errors.push(`[Extracted ${f}] JSON parse error: ${err.message}`);
      }
    }
  } else {
    errors.push(`Extracted directory does not exist: ${extractedDir}`);
  }

  // 2. Validate Analyzed Exams
  let analyzedCount = 0;
  const allAnalyzedExams: AnalyzedExam[] = [];
  if (fs.existsSync(analyzedDir)) {
    const files = fs
      .readdirSync(analyzedDir)
      .filter((f) => f.endsWith('.json') && f !== 'run-manifest.json');
    analyzedCount = files.length;
    for (const f of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(analyzedDir, f), 'utf-8'));
        const parsed = AnalyzedExamSchema.safeParse(content);
        if (!parsed.success) {
          errors.push(...parsed.error.issues.map((i) => `[Analyzed ${f}] ${i.path.join('.')}: ${i.message}`));
        } else {
          if (parsed.data.questions.length !== 43) {
            errors.push(`[Analyzed ${f}] Expected 43 analyzed questions, found ${parsed.data.questions.length}`);
          }
          for (const q of parsed.data.questions) {
            // Check exactly 4 option analyses
            if (q.analysis.optionAnalyses.length !== 4) {
              errors.push(
                `[Analyzed ${f}] Question ${q.questionNumber} must have exactly 4 optionAnalyses, found ${q.analysis.optionAnalyses.length}`
              );
            }
            // Check visual question 1 has essential evidence necessity
            if (q.extracted.visualEvidenceRequired && q.analysis.evidenceNecessity !== 'essential') {
              errors.push(
                `[Analyzed ${f}] Question ${q.questionNumber} has visual evidence required but evidenceNecessity is '${q.analysis.evidenceNecessity}' instead of 'essential'`
              );
            }
            // Check correct answer rationale
            const correctOpt = q.analysis.optionAnalyses.find((o) => o.isCorrect);
            if (!correctOpt || correctOpt.option !== q.extracted.answer) {
              errors.push(
                `[Analyzed ${f}] Question ${q.questionNumber} correct option (${correctOpt?.option}) does not match extracted answer (${q.extracted.answer})`
              );
            }
          }
          allAnalyzedExams.push(parsed.data);
        }
      } catch (err: any) {
        errors.push(`[Analyzed ${f}] JSON parse error: ${err.message}`);
      }
    }
  } else {
    errors.push(`Analyzed directory does not exist: ${analyzedDir}`);
  }

  // Load holdout manifest for holdout leakage checks
  const holdoutKeys = new Set<string>();
  const holdoutManifestPath = path.join(benchmarkDir, 'holdout-manifest.json');
  if (fs.existsSync(holdoutManifestPath)) {
    try {
      const rawHoldout = JSON.parse(fs.readFileSync(holdoutManifestPath, 'utf-8'));
      const parsedHoldout = HoldoutManifestSchema.safeParse(rawHoldout);
      if (parsedHoldout.success) {
        // Code-level verification of stratification and grounding in extracted corpus
        const extractedQuestionsMap = new Map<string, { section: string; evidenceMode: string }>();
        allExtractedExams.forEach((exam) => {
          exam.questions.forEach((q) => {
            extractedQuestionsMap.set(`${exam.examId}-Q${q.questionNumber}`, {
              section: q.section,
              evidenceMode: q.evidenceMode,
            });
          });
        });

        parsedHoldout.data.holdoutQuestions.forEach((h) => {
          const key = `${h.examId}-Q${h.questionNumber}`;
          holdoutKeys.add(key);

          const extractedQ = extractedQuestionsMap.get(key);
          if (!extractedQ) {
            errors.push(`[Benchmark holdout-manifest.json] Holdout item ${key} does not exist in extracted corpus.`);
          } else {
            if (h.section !== extractedQ.section) {
              errors.push(
                `[Benchmark holdout-manifest.json] Holdout item ${key} section mismatch: declared '${h.section}', corpus has '${extractedQ.section}'.`
              );
            }
            if (h.evidenceMode !== extractedQ.evidenceMode) {
              errors.push(
                `[Benchmark holdout-manifest.json] Holdout item ${key} evidenceMode mismatch: declared '${h.evidenceMode}', corpus has '${extractedQ.evidenceMode}'.`
              );
            }
          }
        });
      } else {
        errors.push(`[Benchmark holdout-manifest.json] Invalid schema or stratification: ${parsedHoldout.error.message}`);
      }
    } catch (err: any) {
      errors.push(`[Benchmark holdout-manifest.json] Parse error: ${err.message}`);
    }
  } else {
    errors.push(`[Benchmark holdout-manifest.json] Missing holdout manifest at ${holdoutManifestPath}. Certified holdout isolation required.`);
  }

  // Filter non-holdout questions
  const allAnalyzedQuestions = allAnalyzedExams.flatMap((e) => e.questions);
  const nonHoldoutQuestions = allAnalyzedQuestions.filter(
    (q) => !holdoutKeys.has(`${q.examId}-Q${q.questionNumber}`)
  );

  // 3. Validate Knowledge Artifacts
  let knowledgeCount = 0;
  const requiredKnowledgeFiles = [
    'cap-taxonomy.json',
    'question-recipes.json',
    'distractor-patterns.json',
    'depth-framework.json',
    'anti-patterns.json',
    'cap-blueprint.json',
    'cap-blueprint.md',
  ];

  if (fs.existsSync(knowledgeDir)) {
    for (const kf of requiredKnowledgeFiles) {
      const filePath = path.join(knowledgeDir, kf);
      if (!fs.existsSync(filePath)) {
        errors.push(`Missing required knowledge artifact: ${kf}`);
        continue;
      }

      knowledgeCount++;

      if (kf.endsWith('.json')) {
        try {
          const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (kf === 'question-recipes.json') {
            const res = z.array(QuestionRecipeSchema).safeParse(raw);
            if (!res.success) {
              errors.push(...res.error.issues.map((i) => `[Knowledge ${kf}] ${i.path.join('.')}: ${i.message}`));
            } else {
              // Check HOLDOUT LEAKAGE in recipes
              for (const recipe of res.data) {
                for (const ev of recipe.sourceEvidence) {
                  const key = `${ev.examId}-Q${ev.questionNumber}`;
                  if (holdoutKeys.has(key)) {
                    errors.push(
                      `[Knowledge ${kf}] Holdout leakage detected: Recipe ${recipe.recipeId} contains holdout question ${key}`
                    );
                  }
                }
              }
            }
          } else if (kf === 'distractor-patterns.json') {
            const res = z.array(DistractorPatternStatSchema).safeParse(raw);
            if (!res.success) {
              errors.push(...res.error.issues.map((i) => `[Knowledge ${kf}] ${i.path.join('.')}: ${i.message}`));
            } else if (nonHoldoutQuestions.length > 0) {
              // Provenance check: verify observed counts match ground truth non-holdout sum
              const groundTruthDistractorCounts: Record<string, number> = {};
              let totalGroundTruthDistractors = 0;
              for (const q of nonHoldoutQuestions) {
                for (const opt of q.analysis.optionAnalyses) {
                  if (opt.isCorrect || !opt.distractorStrategy) continue;
                  groundTruthDistractorCounts[opt.distractorStrategy] =
                    (groundTruthDistractorCounts[opt.distractorStrategy] || 0) + 1;
                  totalGroundTruthDistractors++;
                }
              }
              let sumObserved = 0;
              for (const item of res.data) {
                const expected = groundTruthDistractorCounts[item.pattern] || 0;
                sumObserved += item.observedCount;
                if (item.observedCount !== expected) {
                  errors.push(
                    `[Knowledge ${kf}] Provenance mismatch for ${item.pattern}: artifact has ${item.observedCount}, ground truth non-holdout sum is ${expected}`
                  );
                }
              }
              if (sumObserved !== nonHoldoutQuestions.length * 3) {
                errors.push(
                  `[Knowledge ${kf}] Distractor sum mismatch: artifact total observed is ${sumObserved}, expected ${nonHoldoutQuestions.length * 3} (3 per non-holdout question)`
                );
              }
            }
          } else if (kf === 'depth-framework.json') {
            const res = z.array(DepthLevelDefinitionSchema).safeParse(raw);
            if (!res.success) {
              errors.push(...res.error.issues.map((i) => `[Knowledge ${kf}] ${i.path.join('.')}: ${i.message}`));
            }
          } else if (kf === 'anti-patterns.json') {
            const res = z.array(AntiPatternSchema).safeParse(raw);
            if (!res.success) {
              errors.push(...res.error.issues.map((i) => `[Knowledge ${kf}] ${i.path.join('.')}: ${i.message}`));
            }
          } else if (kf === 'cap-blueprint.json') {
            const res = CapBlueprintSchema.safeParse(raw);
            if (!res.success) {
              errors.push(...res.error.issues.map((i) => `[Knowledge ${kf}] ${i.path.join('.')}: ${i.message}`));
            }
          }
        } catch (err: any) {
          errors.push(`[Knowledge ${kf}] JSON parse error: ${err.message}`);
        }
      } else {
        const text = fs.readFileSync(filePath, 'utf-8');
        if (text.trim().length === 0) {
          errors.push(`[Knowledge ${kf}] Markdown file is empty`);
        }
      }
    }
  } else {
    errors.push(`Knowledge directory does not exist: ${knowledgeDir}`);
  }

  // 4. Validate Benchmark
  let benchmarkValid = false;
  const benchmarkFile = path.join(benchmarkDir, 'cap-benchmark.json');
  if (fs.existsSync(benchmarkFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(benchmarkFile, 'utf-8'));
      const res = CapBenchmarkSchema.safeParse(raw);
      if (res.success) {
        benchmarkValid = true;
        if (res.data.holdoutReferenceSet.length !== 20) {
          errors.push(`[Benchmark] Expected 20 holdout reference questions, found ${res.data.holdoutReferenceSet.length}`);
        }
      } else {
        errors.push(...res.error.issues.map((i) => `[Benchmark] ${i.path.join('.')}: ${i.message}`));
      }
    } catch (err: any) {
      errors.push(`[Benchmark] JSON parse error: ${err.message}`);
    }
  } else {
    errors.push(`Benchmark file does not exist: ${benchmarkFile}`);
  }

  // 5. Authoritative Eligibility & Provenance Audit
  let mockCount = 0;
  let unreviewedCriticCount = 0;
  let failedCriticCount = 0;

  for (const q of allAnalyzedQuestions) {
    if (q.providerName === 'offline-mock' || q.modelName.toLowerCase().includes('mock')) {
      mockCount++;
    }
    if (q.analysis.criticStatus === 'not_reviewed') {
      unreviewedCriticCount++;
    } else if (q.analysis.criticStatus === 'failed') {
      failedCriticCount++;
    }
  }

  if (mockCount > 0) {
    authorityBlockers.push(
      `[Provenance Quarantine] ${mockCount} analyzed questions were generated using offline-mock provider instead of live multimodal AI.`
    );
  }
  if (unreviewedCriticCount > 0) {
    authorityBlockers.push(
      `[Critic Incomplete] ${unreviewedCriticCount} analyzed questions have criticStatus 'not_reviewed'.`
    );
  }
  if (failedCriticCount > 0) {
    authorityBlockers.push(
      `[Critic Defect] ${failedCriticCount} analyzed questions failed the Pass B evidence critic audit.`
    );
  }

  const structurallyValid =
    errors.length === 0 &&
    extractedCount === 5 &&
    analyzedCount === 5 &&
    benchmarkValid &&
    knowledgeCount >= 7;

  if (!structurallyValid && errors.length > 0) {
    authorityBlockers.unshift(`[Structural Defects] Corpus failed ${errors.length} structural/schema validation check(s).`);
  }

  const authorityEligible = structurallyValid && authorityBlockers.length === 0;
  const authorityStatus = !structurallyValid
    ? 'invalid'
    : authorityEligible
    ? 'authoritative'
    : 'provisional';

  return {
    valid: structurallyValid,
    structurallyValid,
    authorityEligible,
    authorityStatus,
    authorityBlockers,
    extractedExamsCount: extractedCount,
    analyzedExamsCount: analyzedCount,
    knowledgeArtifactsCount: knowledgeCount,
    benchmarkValid,
    errors,
    warnings,
  };
}

