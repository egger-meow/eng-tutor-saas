import { createHash } from 'node:crypto';
import { ExtractedQuestion } from '../schemas/extracted.ts';

export function computeQuestionContentHash(
  question: ExtractedQuestion,
  passageText: string | null | undefined,
  promptVersion: string,
  providerName = 'gemini',
  modelName = 'gemini-2.5-flash'
): string {
  const payload = {
    provider: providerName,
    model: modelName,
    promptVersion,
    examId: question.examId,
    questionNumber: question.questionNumber,
    section: question.section,
    stem: question.stem,
    options: question.options,
    answer: question.answer || null,
    evidenceMode: question.evidenceMode,
    visualEvidenceRequired: question.visualEvidenceRequired,
    passage: passageText || '',
  };

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
