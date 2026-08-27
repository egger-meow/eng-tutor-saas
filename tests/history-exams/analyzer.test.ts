import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ApiKeyMissingError,
  computeAssetImageHashes,
  computeFileSha256,
  computeQuestionContentHash,
  CRITIC_PROMPT_VERSION,
  createAiProvider,
  deriveDeterministicAnalysis,
  OfflineMockProvider,
  PROMPT_VERSION,
  runAnalysisPipeline,
  VisualAssetMissingError,
} from '../../scripts/history-exams/src/analyzer';
import {
  AnalyzedExamSchema,
  PedagogicalAnalysisSchema,
} from '../../scripts/history-exams/src/schemas';
import { ExtractedQuestion } from '../../scripts/history-exams/src/schemas/extracted';

describe('Historical CAP English Exam Analyzer (Two-Pass Hardened)', () => {
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
    answer: 'D',
    evidenceMode: 'text_only',
    visualEvidenceRequired: false,
    requiredAssets: [],
    extractionConfidence: 'high',
    extractionWarnings: [],
  };

  it('fails fast when no API key is provided and allowOfflineMock is false', () => {
    const origGemini = process.env.GEMINI_API_KEY;
    const origOpenAI = process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      expect(() => createAiProvider({ allowOfflineMock: false })).toThrow(ApiKeyMissingError);
    } finally {
      if (origGemini) process.env.GEMINI_API_KEY = origGemini;
      if (origOpenAI) process.env.OPENAI_API_KEY = origOpenAI;
    }
  });

  it('throws VisualAssetMissingError when visualEvidenceRequired is true but asset is missing', async () => {
    const visualQWithMissingAsset: ExtractedQuestion = {
      ...sampleQuestion,
      questionNumber: 99,
      visualEvidenceRequired: true,
      evidenceMode: 'visual_only',
      requiredAssets: [
        {
          page: 99,
          role: 'single_image',
          imagePath: 'history_exams/assets/non_existent_page.png',
        },
      ],
    };

    expect(() => {
      computeAssetImageHashes(visualQWithMissingAsset.requiredAssets);
    }).toThrow(/Image asset file not found/);
  });

  it('computes stable content hashes incorporating prompt and schema versions', () => {
    const hash1 = computeQuestionContentHash(
      sampleQuestion,
      'Sample passage',
      PROMPT_VERSION,
      'gemini',
      'gemini-2.5-flash',
      undefined,
      CRITIC_PROMPT_VERSION,
      '1.0.0'
    );
    const hash2 = computeQuestionContentHash(
      sampleQuestion,
      'Sample passage',
      PROMPT_VERSION,
      'gemini',
      'gemini-2.5-flash',
      undefined,
      CRITIC_PROMPT_VERSION,
      '1.0.0'
    );
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);

    // Changing answer key changes hash
    const modQ = { ...sampleQuestion, answer: 'A' as const };
    const hashDiffAns = computeQuestionContentHash(
      modQ,
      'Sample passage',
      PROMPT_VERSION,
      'gemini',
      'gemini-2.5-flash',
      undefined,
      CRITIC_PROMPT_VERSION,
      '1.0.0'
    );
    expect(hashDiffAns).not.toBe(hash1);
  });

  it('generates valid pedagogical analysis adhering to optionAnalyses structure', () => {
    const analysis = deriveDeterministicAnalysis(sampleQuestion, {
      id: '115-p24-26',
      examId: '115',
      questionRange: [24, 26],
      genre: 'brochure_flyer',
      title: "Marigolds' Home",
      text: 'Opening times: March to October. Admission: Free.',
      evidenceMode: 'spatial',
      visualEvidenceRequired: true,
      requiredAssets: [],
      pageStart: 6,
      pageEnd: 7,
      questionNumbers: [24, 25, 26],
    });

    const parsed = PedagogicalAnalysisSchema.parse(analysis);
    expect(parsed.primarySkill).toBeDefined();
    expect(parsed.cognitiveDepth).toMatch(/^D[1-4]_/);
    expect(parsed.languageDifficulty).toMatch(/^[AB][12]_/);
    expect(parsed.evidenceNecessity).toBe('essential');
    expect(parsed.optionAnalyses.length).toBe(4);

    const correct = parsed.optionAnalyses.find((o) => o.isCorrect);
    expect(correct).toBeDefined();
    expect(correct?.option).toBe('D');
    expect(correct?.correctRationale?.length).toBeGreaterThan(0);
    expect(correct?.distractorStrategy).toBeUndefined();

    const distractors = parsed.optionAnalyses.filter((o) => !o.isCorrect);
    expect(distractors.length).toBe(3);
    for (const d of distractors) {
      expect(d.distractorStrategy).toBeDefined();
      expect(d.distractorRationale?.length).toBeGreaterThan(0);
    }
  });

  it('runs the two-pass analysis pipeline with offline mock provider in test mode', async () => {
    const summaries = await runAnalysisPipeline({
      extractedDir,
      analyzedDir,
      examIdFilter: '115',
      allowOfflineMock: true,
      aiProvider: new OfflineMockProvider(),
    });

    expect(summaries.length).toBe(1);
    expect(summaries[0].totalQuestions).toBe(43);

    const json = JSON.parse(fs.readFileSync(summaries[0].outputPath, 'utf-8'));
    const parsed = AnalyzedExamSchema.parse(json);
    expect(parsed.questions.length).toBe(43);
    for (const q of parsed.questions) {
      expect(q.analysis.criticStatus).toBeDefined();
      expect(q.analysis.optionAnalyses.length).toBe(4);
    }
  });
});

