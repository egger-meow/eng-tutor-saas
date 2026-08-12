import type { WeeklyLesson } from '@paper-english/generator'
import { escapeHtml as h } from './escape-html.js'
import { printStyles } from './styles.js'

export type PdfKind = 'student' | 'parent-answer'

export function artifactFilename(lesson: WeeklyLesson, kind: PdfKind): `${string}.pdf` {
  const job = lesson.metadata.jobId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${job}-${kind}.pdf`
}

function documentShell(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${h(title)}</title><style>${printStyles}</style></head><body>${body}</body></html>`
}

function header(lesson: WeeklyLesson, edition: string): string {
  return `<header><div class="label">${h(edition)}</div><h1>${h(lesson.metadata.title)}</h1><div class="meta"><span>Grade ${h(lesson.metadata.grade)}</span><span>Week ${h(lesson.metadata.weekNumber)}</span><span>Lesson ID: ${h(lesson.metadata.jobId)}</span></div></header>`
}

function list(items: readonly string[]): string {
  return `<ul>${items.map((item) => `<li>${h(item)}</li>`).join('')}</ul>`
}

function questionHtml(question: WeeklyLesson['exercises'][number]['questions'][number]): string {
  const options = question.options?.map((option, index) => `<div class="option">${String.fromCharCode(65 + index)}. ${h(option)}</div>`).join('') ?? ''
  const lines = Array.from({ length: question.writingLines }, () => '<div class="writing-line"></div>').join('')
  return `<article class="question" data-question-id="${h(question.questionId)}"><div class="label">${h(question.questionId)}</div><p>${h(question.prompt)}</p>${options}${lines}</article>`
}

export function renderStudentHtml(lesson: WeeklyLesson): string {
  const body = `${header(lesson, 'Student Worksheet')}
    <section><h2>Learning Objectives</h2>${list(lesson.objectives)}</section>
    <section><h2>Core Vocabulary</h2><div class="vocab-grid">${lesson.vocabulary.map((item) => `<article class="card"><div><span class="word">${h(item.word)}</span> <span class="muted">(${h(item.partOfSpeech)})</span></div><p>${h(item.definition)}</p><p><em>${h(item.example)}</em></p></article>`).join('')}</div></section>
    <section><h2>Reading</h2><h3>${h(lesson.reading.title)}</h3><p class="passage">${h(lesson.reading.passage)}</p></section>
    <section><h2>Grammar Focus</h2><h3>${h(lesson.grammar.topic)}</h3><p>${h(lesson.grammar.explanation)}</p>${list(lesson.grammar.examples)}</section>
    <section>${lesson.exercises.map((group) => `<h2>${h(group.title)}</h2><p>${h(group.instructions)}</p>${group.questions.map(questionHtml).join('')}`).join('')}</section>
    <section><h2>Homework</h2><p>${h(lesson.homework.instructions)}</p>${lesson.homework.tasks.map((task) => `<article class="question" data-question-id="${h(task.questionId)}"><div class="label">${h(task.questionId)}</div><p>${h(task.prompt)}</p>${Array.from({ length: task.writingLines }, () => '<div class="writing-line"></div>').join('')}</article>`).join('')}</section>`
  return documentShell(`${lesson.metadata.title} - Student Worksheet`, body)
}

export function renderParentAnswerHtml(lesson: WeeklyLesson): string {
  const questions = new Map([
    ...lesson.exercises.flatMap((group) => group.questions.map((question) => [question.questionId, question.prompt] as const)),
    ...lesson.homework.tasks.map((task) => [task.questionId, task.prompt] as const),
  ])
  const body = `${header(lesson, 'Parent Answer Guide')}
    <section><h2>Personalization Summary</h2><p>${h(lesson.personalization.rationale)}</p><p><strong>Focus areas:</strong> ${lesson.personalization.focusAreas.map(h).join(', ')}</p><p><strong>Previous feedback:</strong> ${h(lesson.personalization.priorFeedbackSummary)}</p></section>
    <section><h2>Answers and Explanations</h2>${lesson.answers.map((answer) => { const prompt = questions.get(answer.questionId)!; return `<article class="answer" data-question-id="${h(answer.questionId)}"><div class="label">${h(answer.questionId)}</div><p>${h(prompt)}</p><p><strong>Answer:</strong> ${h(answer.answer)}</p><p><strong>Why:</strong> ${h(answer.explanation)}</p></article>` }).join('')}</section>
    <section><h2>Parent Guidance</h2><p><strong>Weekly focus:</strong> ${h(lesson.parentGuidance.weeklyFocus)}</p>${list(lesson.parentGuidance.supportTips)}<p><strong>Completion check:</strong> ${h(lesson.parentGuidance.completionCheck)}</p></section>`
  return documentShell(`${lesson.metadata.title} - Parent Answer Guide`, body)
}
