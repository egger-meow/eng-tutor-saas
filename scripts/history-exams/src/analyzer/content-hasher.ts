import { createHash } from 'node:crypto';
import { ExtractedQuestion } from '../schemas/extracted.ts';

export function computeQuestionContentHash(
  question: ExtractedQuestion,
  passageText: string | null | undefined,
  promptVersion: string
): string {
  const payload = {
    examId: question.examId,
    questionNumber: question.questionNumber,
    section: question.section,
    stem: question.stem,
    options: question.options,
    passage: passageText || '',
    promptVersion,
  };

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
