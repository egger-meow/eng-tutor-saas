import fs from 'node:fs';
import path from 'node:path';
import { AnalyzedExamSchema } from '../schemas/analyzed.ts';
import { CapBenchmarkSchema } from '../schemas/benchmark.ts';
import { ExtractedExam, ExtractedExamSchema } from '../schemas/extracted.ts';
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
  valid: boolean;
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

  const { extractedDir, analyzedDir, knowledgeDir, benchmarkDir } = options;

  // 1. Validate Extracted Exams
  let extractedCount = 0;
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
      } catch (err: any) {
        errors.push(`[Extracted ${f}] JSON parse error: ${err.message}`);
      }
    }
  } else {
    errors.push(`Extracted directory does not exist: ${extractedDir}`);
  }

  // 2. Validate Analyzed Exams
  let analyzedCount = 0;
  if (fs.existsSync(analyzedDir)) {
    const files = fs.readdirSync(analyzedDir).filter((f) => f.endsWith('.json'));
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
        }
      } catch (err: any) {
        errors.push(`[Analyzed ${f}] JSON parse error: ${err.message}`);
      }
    }
  } else {
    errors.push(`Analyzed directory does not exist: ${analyzedDir}`);
  }

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
            }
          } else if (kf === 'distractor-patterns.json') {
            const res = z.array(DistractorPatternStatSchema).safeParse(raw);
            if (!res.success) {
              errors.push(...res.error.issues.map((i) => `[Knowledge ${kf}] ${i.path.join('.')}: ${i.message}`));
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
      } else {
        errors.push(...res.error.issues.map((i) => `[Benchmark] ${i.path.join('.')}: ${i.message}`));
      }
    } catch (err: any) {
      errors.push(`[Benchmark] JSON parse error: ${err.message}`);
    }
  } else {
    errors.push(`Benchmark file does not exist: ${benchmarkFile}`);
  }

  return {
    valid: errors.length === 0,
    extractedExamsCount: extractedCount,
    analyzedExamsCount: analyzedCount,
    knowledgeArtifactsCount: knowledgeCount,
    benchmarkValid,
    errors,
    warnings,
  };
}
