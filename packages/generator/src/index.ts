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

export { WeeklyLessonSchema } from './lesson-schema.js'
export type { WeeklyLesson } from './lesson-schema.js'
export { parseWeeklyLesson, validateWeeklyLesson } from './validate-lesson.js'
export type { LessonValidationIssue, LessonValidationResult } from './validate-lesson.js'
export { syntheticWeekOne } from './fixtures/synthetic-week-1.js'
export { CurriculumPackageSchema } from './curriculum-package-schema.js'
export type { CurriculumPackage, CurriculumQuestion } from './curriculum-package-schema.js'
export { validateCurriculumPackage } from './validate-curriculum-package.js'
export type { CurriculumValidationResult } from './validate-curriculum-package.js'
