import type { StudentLesson, DraftAnswers, DraftSelfCheck } from '../../../types/student-material'
import { AnswerReadOnlyContext } from './AnswerReadOnlyContext'
import { OpeningRenderer } from './OpeningRenderer'
import { VocabularyRenderer } from './VocabularyRenderer'
import { ReadingRenderer } from './ReadingRenderer'
import { InstructionRenderer } from './InstructionRenderer'
import { PracticeRenderer } from './PracticeRenderer'
import { SelfCheckRenderer } from './SelfCheckRenderer'
import { HomeworkRenderer } from './HomeworkRenderer'

export function StudentLessonRenderer({ lesson, answers, selfCheck, readOnly, onAnswerChange, onToggleSelfCheck }: {
  lesson: StudentLesson; answers: DraftAnswers; selfCheck: DraftSelfCheck; readOnly: boolean
  onAnswerChange: (key: string, value: string, immediate?: boolean) => void
  onToggleSelfCheck: (key: string) => void
}) {
  return <AnswerReadOnlyContext.Provider value={readOnly}>
    <OpeningRenderer opening={lesson.opening} draftAnswers={answers} onAnswerChange={onAnswerChange} />
    <VocabularyRenderer vocabulary={lesson.vocabulary} />
    <ReadingRenderer vocabulary={lesson.vocabulary} reading={lesson.reading} adaptiveExtension={lesson.adaptiveExtension} draftAnswers={answers} onAnswerChange={onAnswerChange} />
    <InstructionRenderer instruction={lesson.instruction} />
    <PracticeRenderer practice={lesson.practice} adaptiveExtension={lesson.adaptiveExtension} draftAnswers={answers} onAnswerChange={onAnswerChange} />
    <SelfCheckRenderer selfCheckZh={lesson.selfCheckZh} draftSelfCheck={selfCheck} onToggleSelfCheck={onToggleSelfCheck} />
    <HomeworkRenderer homework={lesson.homework} draftAnswers={answers} onAnswerChange={onAnswerChange} />
  </AnswerReadOnlyContext.Provider>
}
