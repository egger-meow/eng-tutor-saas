import source from './public-demo.json'
import type { StudentLesson, DraftAnswers } from '../types/student-material'

// A public synthetic fixture. Answer keys here are deliberately public demo data;
// authenticated materials continue to use the server's submission gate.
export const demoQuestions: Array<{ questionId: string; prompt: string; options?: string[] }> = [...source.exercises.flatMap((stage) => stage.questions), ...source.homework.tasks]
export const demoLesson: StudentLesson = {
  opening: { goalsZh: ['找出文章證據', '練習 do / does 問句'], howToUseZh: '先讀文章，再自行作答。可以部分完成，提交整份範例後再看參考答案。' },
  vocabulary: source.vocabulary.map((word, index) => ({ id: `demo-v${index}`, ...word })),
  reading: { ...source.reading, genre: 'narrative', contextZh: '公開合成故事，非真實事件報導' },
  instruction: [{ id: 'demo-grammar', titleZh: source.grammar.topic, explanationZh: source.grammar.explanation,
    workedExamples: source.grammar.examples.map((example) => ({ example, walkthroughZh: '先找主詞，再選 do 或 does；後面的動詞用原形。' })) }],
  practice: source.exercises.map((stage, index) => ({ id: `demo-stage${index}`, titleZh: stage.title, instructionsZh: stage.instructions,
    questions: stage.questions.map((question) => ({ ...question, id: question.questionId })) })),
  selfCheckZh: ['我已先自行閱讀與作答', '我能回到文章找出證據'],
  homework: { purposeZh: source.homework.instructions, questions: source.homework.tasks.map((question) => ({ ...question, id: question.questionId })) },
}

export function getDemoResults(answers: DraftAnswers) {
  return demoQuestions.map((question) => {
    const reference = source.answers.find((item) => item.questionId === question.questionId)!
    const response = answers[question.questionId]?.trim() ?? ''
    const options = question.options
    const correctLetter = reference.answer.match(/^([A-Z])\./)?.[1]
    const status = !response ? 'unanswered' : !options ? 'open_review'
      : response === correctLetter || response === options[correctLetter!.charCodeAt(0) - 65] ? 'correct' : 'incorrect'
    return { ...reference, prompt: question.prompt, response, status }
  })
}
