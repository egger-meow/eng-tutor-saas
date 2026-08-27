import { ExtractedExam, ExtractedExamSchema } from '../schemas/extracted.ts';

export interface ExtractionValidationResult {
  valid: boolean;
  examId: string;
  questionCount: number;
  errors: string[];
  warnings: string[];
}

export function validateExtractedExam(exam: ExtractedExam): ExtractionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Schema validation
  const parseRes = ExtractedExamSchema.safeParse(exam);
  if (!parseRes.success) {
    for (const issue of parseRes.error.issues) {
      errors.push(`Schema validation error at ${issue.path.join('.')}: ${issue.message}`);
    }
  }

  // Check question count
  if (exam.questions.length !== 43) {
    errors.push(`Expected 43 questions, got ${exam.questions.length}`);
  }

  // Check question number sequence and duplicates
  const seenNumbers = new Set<number>();
  for (const q of exam.questions) {
    if (seenNumbers.has(q.questionNumber)) {
      errors.push(`Duplicate question number: ${q.questionNumber}`);
    }
    seenNumbers.add(q.questionNumber);

    if (q.questionNumber < 1 || q.questionNumber > 43) {
      errors.push(`Question number out of bounds: ${q.questionNumber}`);
    }

    if (!q.options.A || !q.options.B || !q.options.C || !q.options.D) {
      errors.push(`Question ${q.questionNumber} is missing one or more options (A, B, C, D)`);
    }

    if (q.section === 'passage_comprehension' || q.section === 'cloze') {
      if (!q.passageId) {
        errors.push(`Question ${q.questionNumber} belongs to passage section but has no passageId`);
      }
    }

    if (q.extractionWarnings && q.extractionWarnings.length > 0) {
      for (const w of q.extractionWarnings) {
        warnings.push(`Question ${q.questionNumber}: ${w}`);
      }
    }
  }

  for (let i = 1; i <= 43; i++) {
    if (!seenNumbers.has(i)) {
      errors.push(`Missing question number: ${i}`);
    }
  }

  // Check passages
  for (const p of exam.passages) {
    if (!p.text || p.text.trim().length === 0) {
      errors.push(`Passage ${p.id} has empty text`);
    }
    if (p.questionNumbers.length === 0) {
      errors.push(`Passage ${p.id} has no associated questions`);
    }
  }

  return {
    valid: errors.length === 0,
    examId: exam.examId,
    questionCount: exam.questions.length,
    errors,
    warnings,
  };
}
