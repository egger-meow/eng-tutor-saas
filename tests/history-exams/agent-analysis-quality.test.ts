import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const AGENT_DIR = path.join(ROOT, 'history_exams/agent_analysis');
const EXTRACTED_DIR = path.join(ROOT, 'history_exams/extracted');

function loadAgentExam(examId: string) {
  return JSON.parse(fs.readFileSync(path.join(AGENT_DIR, `${examId}.json`), 'utf8'));
}

function loadExtractedExam(examId: string) {
  return JSON.parse(fs.readFileSync(path.join(EXTRACTED_DIR, `${examId}.json`), 'utf8'));
}

describe('CAP agent-authored deep digestion quality floor', () => {
  it('contains a complete 215-question live corpus with per-item, non-template analysis', () => {
    const exams = ['111', '112', '113', '114', '115'].map(loadAgentExam);
    const questions = exams.flatMap((exam) => exam.questions);

    expect(exams.map((exam) => exam.questions.length)).toEqual([43, 43, 43, 43, 43]);
    expect(questions).toHaveLength(215);
    expect(exams.every((exam) => exam.providerName === 'openai-chatgpt')).toBe(true);
    expect(exams.every((exam) => exam.modelName === 'gpt-5.6-sol')).toBe(true);
    expect(exams.every((exam) => exam.promptVersion === 'chatgpt-agent-digestion-v2')).toBe(true);

    const mechanisms = new Set(questions.map((q) => q.questionMechanism));
    const whyWorks = new Set(questions.map((q) => q.whyTheQuestionWorks));
    const principles = new Set(questions.map((q) => q.reusableDesignPrinciple));
    const skillExplanations = new Set(questions.map((q) => q.skillExplanation));

    expect(mechanisms.size).toBeGreaterThanOrEqual(200);
    expect(whyWorks.size).toBeGreaterThanOrEqual(200);
    expect(principles.size).toBeGreaterThanOrEqual(200);
    expect(skillExplanations.size).toBeGreaterThanOrEqual(200);

    const bannedBoilerplate = [
      'exact wording and evidence configuration',
      'Preserve the evidence pattern while changing surface content',
    ];
    for (const question of questions) {
      const serialized = JSON.stringify(question);
      for (const phrase of bannedBoilerplate) expect(serialized).not.toContain(phrase);
      expect(['passed', 'repaired']).toContain(question.criticStatus);
      expect(question.evidenceReferences.length).toBeGreaterThan(0);
      expect(question.reasoningOperations.length).toBeGreaterThan(0);
    }
  });

  it('uses exactly the three official wrong options as distractors for every item', () => {
    for (const examId of ['111', '112', '113', '114', '115']) {
      const agent = loadAgentExam(examId);
      const extracted = loadExtractedExam(examId);
      const extractedByNumber = new Map(extracted.questions.map((q: any) => [q.questionNumber, q]));

      for (const question of agent.questions) {
        const source: any = extractedByNumber.get(question.questionNumber);
        expect(source).toBeTruthy();
        const expected = ['A', 'B', 'C', 'D'].filter((option) => option !== source.answer).sort();
        expect(Object.keys(question.distractors).sort()).toEqual(expected);
      }
    }
  });

  it('locks representative high-value semantics across years', () => {
    const byKey = new Map<string, any>();
    for (const examId of ['111', '112', '113', '114', '115']) {
      for (const q of loadAgentExam(examId).questions) byKey.set(`${examId}-Q${q.questionNumber}`, q);
    }

    expect(byKey.get('111-Q2')?.primarySkill).toBe('discourse_relationship');
    expect(byKey.get('111-Q41')?.primarySkill).toBe('information_integration');
    expect(byKey.get('112-Q24')?.cognitiveDepth).toBe('D3_multi_step_synthesis');
    expect(byKey.get('113-Q28')?.primarySkill).toBe('pragmatic_meaning');
    expect(byKey.get('114-Q34')?.cognitiveDepth).toBe('D4_evaluative_pragmatic');
    expect(byKey.get('115-Q26')?.primarySkill).toBe('information_integration');
    expect(byKey.get('115-Q26')?.cognitiveDepth).toBe('D3_multi_step_synthesis');
    expect(byKey.get('115-Q38')?.primarySkill).toBe('cross_sentence_inference');
    expect(byKey.get('115-Q38')?.cognitiveDepth).toBe('D3_multi_step_synthesis');
  });
});
