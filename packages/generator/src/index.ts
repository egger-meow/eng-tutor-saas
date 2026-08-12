export type GenerationJob = {
  id: string
  childId: string
  materialWeek: string
  ruleVersion: string
  idempotencyKey: string
}

export type GenerationContext = {
  grade: 7 | 8 | 9
  preferences: ReadonlyArray<string>
  priorFeedback: ReadonlyArray<string>
}

export type GeneratedLesson = {
  title: string
  studentMarkdown: string
  parentAnswerMarkdown: string
}

export interface LessonGenerator {
  generate(job: GenerationJob, context: GenerationContext): Promise<GeneratedLesson>
}
