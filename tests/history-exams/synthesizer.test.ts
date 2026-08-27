import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AntiPatternSchema,
  CapBlueprintSchema,
  DepthLevelDefinitionSchema,
  DistractorPatternStatSchema,
  QuestionRecipeSchema,
} from '../../scripts/history-exams/src/schemas';
import { MockDataQuarantinedError, runSynthesisPipeline } from '../../scripts/history-exams/src/synthesizer';
import { z } from 'zod';

describe('Historical CAP English Exam Synthesizer', () => {
  const analyzedDir = path.resolve(__dirname, '../../history_exams/analyzed');
  const knowledgeDir = path.resolve(__dirname, '../../history_exams/knowledge');

  it('rejects offline mock records by default without allowProvisionalMock flag', async () => {
    // If analyzed records are from offline-mock, default run must throw MockDataQuarantinedError
    const isMockDataPresent = fs.readdirSync(analyzedDir).some((f) => {
      if (!f.endsWith('.json')) return false;
      const content = JSON.parse(fs.readFileSync(path.join(analyzedDir, f), 'utf-8'));
      return content.questions.some((q: any) => q.modelName === 'rule-based-mock' || q.modelName === 'offline-mock');
    });

    if (isMockDataPresent) {
      await expect(
        runSynthesisPipeline({
          analyzedDir,
          knowledgeDir,
          allowProvisionalMock: false,
        })
      ).rejects.toThrow(MockDataQuarantinedError);
    }
  });

  it('synthesizes all 6 knowledge base artifacts across 5 years with allowProvisionalMock', async () => {
    const summary = await runSynthesisPipeline({
      analyzedDir,
      knowledgeDir,
      allowProvisionalMock: true,
    });

    expect(summary.totalExams).toBeGreaterThanOrEqual(5);
    expect(summary.totalQuestions).toBe(summary.totalExams * 43);

    // 1. Taxonomy
    const taxonomy = JSON.parse(fs.readFileSync(summary.taxonomyPath, 'utf-8'));
    expect(taxonomy.version).toBe('1.0.0');
    expect(Object.keys(taxonomy.primarySkillFrequencies).length).toBeGreaterThan(0);

    // 2. Recipes
    const recipes = JSON.parse(fs.readFileSync(summary.recipesPath, 'utf-8'));
    const parsedRecipes = z.array(QuestionRecipeSchema).parse(recipes);
    expect(parsedRecipes.length).toBeGreaterThanOrEqual(6);
    for (const r of parsedRecipes) {
      expect(r.stemTemplates.length).toBeGreaterThan(0);
      expect(r.validDistractorMechanisms.length).toBeGreaterThan(0);
      expect(r.qualityChecks.length).toBeGreaterThan(0);
    }

    // 3. Distractor Patterns
    const distractors = JSON.parse(fs.readFileSync(summary.distractorsPath, 'utf-8'));
    const parsedDistractors = z.array(DistractorPatternStatSchema).parse(distractors);
    expect(parsedDistractors.length).toBeGreaterThan(0);

    let totalPct = 0;
    for (const d of parsedDistractors) {
      totalPct += d.observedPercentage;
      expect(d.description.length).toBeGreaterThan(0);
    }
    expect(Math.round(totalPct)).toBe(100);

    // 4. Depth Framework
    const depthFramework = JSON.parse(fs.readFileSync(summary.depthFrameworkPath, 'utf-8'));
    const parsedDepth = z.array(DepthLevelDefinitionSchema).parse(depthFramework);
    expect(parsedDepth.length).toBe(4);
    const levels = parsedDepth.map((d) => d.level);
    expect(levels).toEqual([
      'D1_verbatim_retrieval',
      'D2_single_step_inference',
      'D3_multi_step_synthesis',
      'D4_evaluative_pragmatic',
    ]);

    // 5. Anti-Patterns
    const antiPatterns = JSON.parse(fs.readFileSync(summary.antiPatternsPath, 'utf-8'));
    const parsedAnti = z.array(AntiPatternSchema).parse(antiPatterns);
    expect(parsedAnti.length).toBeGreaterThanOrEqual(5);
    for (const ap of parsedAnti) {
      expect(ap.diagnosticTest.length).toBeGreaterThan(0);
      expect(ap.repairStrategy.length).toBeGreaterThan(0);
    }

    // 6. Blueprint JSON & MD
    const blueprintJson = JSON.parse(fs.readFileSync(summary.blueprintJsonPath, 'utf-8'));
    const parsedBlueprint = CapBlueprintSchema.parse(blueprintJson);
    expect(parsedBlueprint.totalExams).toBe(summary.totalExams);
    expect(parsedBlueprint.totalQuestionsAnalyzed).toBe(summary.totalQuestions);

    const blueprintMd = fs.readFileSync(summary.blueprintMdPath, 'utf-8');
    expect(blueprintMd).toContain('# CAP English Exam Assessment Design Blueprint');
    expect(blueprintMd).toContain('Decoupling Principle');
  });
});
