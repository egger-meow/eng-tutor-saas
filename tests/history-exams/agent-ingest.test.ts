import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ingestAgentAnalysisFiles } from '../../scripts/history-exams/src/agent-ingest/index';

const tempDirs: string[] = [];

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-agent-ingest-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('agent-authored CAP analysis ingestion', () => {
  it('materializes compact analysis with canonical provenance and exactly one correct option', () => {
    const root = makeTempDir();
    const sourceDir = path.join(root, 'agent');
    const analyzedDir = path.join(root, 'analyzed');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(analyzedDir, { recursive: true });

    fs.writeFileSync(
      path.join(sourceDir, '111.json'),
      JSON.stringify({
        examId: '111',
        providerName: 'openai-chatgpt',
        modelName: 'gpt-5.6-sol',
        promptVersion: 'chatgpt-agent-digestion-v1',
        criticPromptVersion: 'chatgpt-agent-critic-v1',
        questions: [
          {
            questionNumber: 2,
            primarySkill: 'grammar_in_context',
            secondarySkills: ['discourse_relationship'],
            skillExplanation: 'Select a causal connector from the relationship between movie time and meeting time.',
            languageDifficulty: 'A1_elementary',
            cognitiveDepth: 'D2_single_step_inference',
            evidenceNecessity: 'essential',
            evidenceSpan: 'single_sentence',
            reasoningOperations: ['Identify the cause-result relation between the movie start time and the proposed earlier meeting time.'],
            reasoningComplexity: 'simple_single_step',
            readingDemand: 'low',
            grammarDemand: 'medium',
            vocabularyDemand: 'low',
            inferenceDemand: 'low',
            visualIntegrationDemand: 'low',
            questionMechanism: 'Context-constrained connector selection rather than isolated conjunction recall.',
            whyTheQuestionWorks: 'Only the result connector preserves the intended pragmatic relation between the two clauses.',
            correctRationale: 'The movie starts at 2:00, so meeting at 1:45 is the resulting plan.',
            distractors: {
              B: { strategy: 'reversed_cause_effect', rationale: '“or” changes the relation into an alternative, which the context does not offer.', misconceptionTarget: 'Treating connectors as interchangeable punctuation.' },
              C: { strategy: 'grammatically_plausible_contextually_wrong', rationale: '“if” would make the meeting conditional on the movie start time instead of a consequence of it.', misconceptionTarget: 'Recognizing syntax without checking discourse logic.' },
              D: { strategy: 'reversed_cause_effect', rationale: '“because” reverses the dependency: the proposed meeting time does not cause the movie to start at two.', misconceptionTarget: 'Reversing cause and result.' },
            },
            studentFailureModes: ['Choosing a connector by grammar shape without modeling the clause relationship.'],
            misconceptionsTargeted: ['Cause and result connectors can be reversed without changing meaning.'],
            reusableDesignPrinciple: 'Give two individually simple clauses whose logical relation uniquely licenses one connector.',
            canSimplifyLanguageWithoutBreakingMechanism: true,
            simplificationConstraints: ['Preserve the explicit cause-result relation.'],
            canIncreaseDepthWithoutIncreasingVocabulary: true,
            depthAdjustmentStrategies: ['Make the cause implicit across two short sentences.'],
            shallowRecall: { isShallowRecall: false, recallType: 'none', explanation: 'The connector must be selected from contextual logic.' },
            analysisConfidence: 'high',
            uncertainties: [],
            evidenceReferences: [
              { type: 'stem_clue', location: '111 Q2 stem', quoteOrDescription: 'The movie starts at two o’clock ... let’s meet ... at one forty-five.', role: 'primary_proof' },
            ],
            criticStatus: 'passed',
            criticIssues: [],
          },
        ],
      }, null, 2)
    );

    const result = ingestAgentAnalysisFiles({
      sourceDir,
      extractedDir: path.resolve(__dirname, '../../history_exams/extracted'),
      analyzedDir,
    });

    expect(result.ingestedQuestions).toBe(1);
    const output = JSON.parse(fs.readFileSync(path.join(analyzedDir, '111.json'), 'utf8'));
    const q2 = output.questions[0];
    expect(q2.providerName).toBe('openai-chatgpt');
    expect(q2.modelName).toBe('gpt-5.6-sol');
    expect(q2.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(q2.extracted.answer).toBe('A');
    expect(q2.analysis.optionAnalyses).toHaveLength(4);
    expect(q2.analysis.optionAnalyses.filter((o: any) => o.isCorrect)).toHaveLength(1);
    expect(q2.analysis.optionAnalyses.find((o: any) => o.isCorrect)?.option).toBe('A');
    expect(q2.analysis.optionAnalyses.filter((o: any) => !o.isCorrect)).toHaveLength(3);
    expect(q2.analysis.criticStatus).toBe('passed');
  });

  it('rejects a compact source that supplies a distractor entry for the official correct answer', () => {
    const root = makeTempDir();
    const sourceDir = path.join(root, 'agent');
    const analyzedDir = path.join(root, 'analyzed');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(analyzedDir, { recursive: true });

    fs.writeFileSync(path.join(sourceDir, '111.json'), JSON.stringify({
      examId: '111',
      providerName: 'openai-chatgpt',
      modelName: 'gpt-5.6-sol',
      promptVersion: 'chatgpt-agent-digestion-v1',
      criticPromptVersion: 'chatgpt-agent-critic-v1',
      questions: [{
        questionNumber: 2,
        primarySkill: 'grammar_in_context', secondarySkills: [], languageDifficulty: 'A1_elementary', cognitiveDepth: 'D2_single_step_inference',
        evidenceNecessity: 'essential', evidenceSpan: 'single_sentence', reasoningOperations: ['Read relation'], reasoningComplexity: 'simple_single_step',
        readingDemand: 'low', grammarDemand: 'medium', vocabularyDemand: 'low', inferenceDemand: 'low', visualIntegrationDemand: 'low',
        questionMechanism: 'connector selection', whyTheQuestionWorks: 'context constrains answer', correctRationale: 'so marks the result',
        distractors: { A: { strategy: 'partial_truth', rationale: 'invalid', misconceptionTarget: 'invalid' }, B: { strategy: 'partial_truth', rationale: 'x', misconceptionTarget: 'x' }, C: { strategy: 'partial_truth', rationale: 'x', misconceptionTarget: 'x' } },
        studentFailureModes: ['x'], misconceptionsTargeted: ['x'], reusableDesignPrinciple: 'x',
        canSimplifyLanguageWithoutBreakingMechanism: true, simplificationConstraints: ['x'], canIncreaseDepthWithoutIncreasingVocabulary: true, depthAdjustmentStrategies: ['x'],
        analysisConfidence: 'high', uncertainties: [], evidenceReferences: [{ type: 'stem_clue', location: 'Q2', quoteOrDescription: 'stem', role: 'primary_proof' }], criticStatus: 'passed', criticIssues: [],
      }],
    }));

    expect(() => ingestAgentAnalysisFiles({ sourceDir, extractedDir: path.resolve(__dirname, '../../history_exams/extracted'), analyzedDir })).toThrow(/distractor/i);
  });
});
