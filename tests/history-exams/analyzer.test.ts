import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeQuestionContentHash,
  createAiProvider,
  deriveDeterministicAnalysis,
  OfflineMockProvider,
  PROMPT_VERSION,
  runAnalysisPipeline,
} from '../../scripts/history-exams/src/analyzer';
import {
  AnalyzedExamSchema,
  PedagogicalAnalysisSchema,
} from '../../scripts/history-exams/src/schemas';
import { ExtractedQuestion } from '../../scripts/history-exams/src/schemas/extracted';

describe('Historical CAP English Exam Analyzer', () => {
  const extractedDir = path.resolve(__dirname, '../../history_exams/extracted');
  const analyzedDir = path.resolve(__dirname, '../../history_exams/analyzed');

  const sampleQuestion: ExtractedQuestion = {
    examId: '115',
    questionNumber: 24,
    section: 'passage_comprehension',
    page: 7,
    passageId: '115-p24-26',
    stem: 'Which question can the brochure answer?',
    options: {
      A: 'Can I order tickets online?',
      B: 'How much are the tickets?',
      C: 'How can I get to the Marigolds’ Home?',
      D: 'When can I visit the Marigolds’ Home?',
    },
    answer: null,
    extractionConfidence: 'high',
    extractionWarnings: [],
  };

  it('computes stable content hashes for questions', () => {
    const hash1 = computeQuestionContentHash(sampleQuestion, 'Sample passage', PROMPT_VERSION);
    const hash2 = computeQuestionContentHash(sampleQuestion, 'Sample passage', PROMPT_VERSION);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex string

    // Changing prompt version changes hash
    const hashDiffPrompt = computeQuestionContentHash(sampleQuestion, 'Sample passage', 'v2.0.0');
    expect(hashDiffPrompt).not.toBe(hash1);

    // Changing stem changes hash
    const modifiedQ = { ...sampleQuestion, stem: 'Different stem' };
    const hashDiffStem = computeQuestionContentHash(modifiedQ, 'Sample passage', PROMPT_VERSION);
    expect(hashDiffStem).not.toBe(hash1);
  });

  it('generates valid pedagogical analysis adhering to controlled taxonomy', () => {
    const analysis = deriveDeterministicAnalysis(sampleQuestion, {
      id: '115-p24-26',
      examId: '115',
      questionRange: [24, 26],
      genre: 'brochure_flyer',
      text: 'Opening times: March to October. Admission: Free.',
      pageStart: 6,
      pageEnd: 7,
      questionNumbers: [24, 25, 26],
    });

    const parsed = PedagogicalAnalysisSchema.parse(analysis);
    expect(parsed.primarySkill).toBeDefined();
    expect(parsed.cognitiveDepth).toMatch(/^D[1-4]_/);
    expect(parsed.languageDifficulty).toMatch(/^[AB][12]_/);
    expect(parsed.contextNecessity).toBe('essential');
    expect(parsed.distractorStrategies.length).toBe(4);
    expect(parsed.reasoningOperations.length).toBeGreaterThan(0);
  });

  it('supports decoupling cognitive depth from language difficulty', () => {
    // Single item with elementary language but inference cognitive depth
    const singleQ: ExtractedQuestion = {
      examId: '115',
      questionNumber: 2,
      section: 'single',
      page: 2,
      stem: 'Look at the picture. The woman is putting candles on the cake.',
      options: {
        A: 'candles',
        B: 'forks',
        C: 'plates',
        D: 'strawberries',
      },
      answer: null,
      extractionConfidence: 'high',
      extractionWarnings: [],
    };

    const analysis = deriveDeterministicAnalysis(singleQ, null);
    expect(analysis.languageDifficulty).toBe('A1_elementary');
    expect(analysis.contextNecessity).toBe('none');
    expect(analysis.shallowRecall.recallType).toBe('intentional_retrieval_drill');
  });

  it('runs the analysis pipeline with content caching', async () => {
    const summaries = await runAnalysisPipeline({
      extractedDir,
      analyzedDir,
      examIdFilter: '115',
      aiProvider: new OfflineMockProvider(),
    });

    expect(summaries.length).toBe(1);
    expect(summaries[0].totalQuestions).toBe(43);
    expect(summaries[0].cachedCount).toBeGreaterThan(0);

    const json = JSON.parse(fs.readFileSync(summaries[0].outputPath, 'utf-8'));
    const parsed = AnalyzedExamSchema.parse(json);
    expect(parsed.questions.length).toBe(43);
  });

  it('handles bounded error repair when AI returns invalid JSON', async () => {
    let callCount = 0;
    const flakyProvider = {
      name: 'flaky-test-provider',
      async generateAnalysis(): Promise<string> {
        callCount++;
        if (callCount === 1) {
          // Return invalid schema
          return JSON.stringify({ primarySkill: 'INVALID_SKILL' });
        }
        // Return valid analysis on retry
        return JSON.stringify(deriveDeterministicAnalysis(sampleQuestion, null));
      },
    };

    const summaries = await runAnalysisPipeline({
      extractedDir,
      analyzedDir,
      examIdFilter: '115',
      questionNumberFilter: 24,
      force: true,
      aiProvider: flakyProvider,
    });

    expect(summaries.length).toBe(1);
    expect(callCount).toBeGreaterThanOrEqual(2); // Attempted repair
  });
});
