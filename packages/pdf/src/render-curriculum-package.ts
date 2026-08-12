import type { CurriculumPackage, CurriculumQuestion } from '@paper-english/generator'
import { escapeHtml as h } from './escape-html.js'

export type CurriculumPdfKind = 'student' | 'parent-answer'

const curriculumStyles = `
  @page { size: A4; margin: 15mm 15mm 17mm; @bottom-center { content: "紙屬英文  ·  " counter(page); font-size: 8.5pt; color: #6b6256; } }
  * { box-sizing: border-box; }
  body { margin: 0; color: #25231f; background: #fffdf8; font-family: "Noto Sans TC", "Microsoft JhengHei", Arial, sans-serif; font-size: 10.5pt; line-height: 1.65; }
  header { border-bottom: 1px solid #b7aa98; padding-bottom: 7mm; margin-bottom: 7mm; }
  .brand { color: #765d42; font-size: 9pt; letter-spacing: .2em; font-weight: 700; }
  h1, h2, h3 { color: #172d29; break-after: avoid; }
  h1 { font-family: Georgia, "Noto Serif TC", serif; font-size: 27pt; line-height: 1.2; letter-spacing: .01em; margin: 2mm 0 3mm; }
  h2 { font-size: 16pt; border-bottom: 1px solid #cfc3b1; padding-bottom: 1.5mm; margin: 8mm 0 3mm; }
  h3 { font-size: 12.5pt; margin: 5mm 0 2mm; }
  p { margin: 0 0 3mm; }
  ul { margin: 0 0 4mm; padding-left: 6mm; }
  li { margin: 0 0 1.5mm; }
  .meta { display: flex; flex-wrap: wrap; gap: 2mm 8mm; color: #6b6256; font-size: 9pt; }
  .kicker { color: #9b673d; font-size: 9pt; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
  .callout { border-left: 4px solid #9b673d; background: #f4ede2; padding: 4mm 5mm; margin: 4mm 0; break-inside: avoid; }
  .goal-grid, .vocab-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
  .goal, .vocab, .worked, .mistake, .question, .answer { border: 1px solid #d8cdbd; background: #fffefa; padding: 3.5mm; break-inside: avoid; page-break-inside: avoid; }
  .goal strong, .word { color: #173e37; }
  .vocab-grid { margin-top: 3mm; }
  .word { font-size: 13pt; font-weight: 800; }
  .pos { color: #8a7c6c; font-size: 9pt; }
  .example { color: #4e473f; margin-bottom: 0; }
  .reading { font-family: Georgia, "Noto Serif TC", serif; font-size: 11.5pt; line-height: 1.85; }
  .reading p { margin-bottom: 4mm; }
  .reading-note { color: #6b6256; font-size: 9.5pt; }
  .instruction { border-top: 3px solid #173e37; padding-top: 3mm; break-inside: avoid; }
  .pattern { background: #eef1e9; padding: 2mm 3mm; margin: 2mm 0; font-family: Georgia, serif; }
  .worked { margin: 2mm 0; }
  .wrong { color: #8b4036; text-decoration: line-through; }
  .correct { color: #23584b; font-weight: 700; }
  .stage { margin-top: 7mm; }
  .stage-label { display: inline-block; border: 1px solid #a89a88; color: #765d42; padding: 1mm 2.5mm; font-size: 8.5pt; letter-spacing: .06em; }
  .question { margin: 2.5mm 0; }
  .qid { color: #765d42; font-weight: 800; font-size: 8.5pt; letter-spacing: .08em; }
  .options { margin: 2mm 0 0 4mm; }
  .writing-line { border-bottom: 1px solid #b8aea1; height: 8mm; }
  .answer { border-left: 4px solid #173e37; }
  .answer strong { color: #173e37; }
  .page-break { break-before: page; }
  .avoid-break { break-inside: avoid; }
  .small { color: #6b6256; font-size: 9pt; }
  @media print { body { background: #fffdf8; } }
`

function shell(title: string, body: string): string {
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>${h(title)}</title><style>${curriculumStyles}</style></head><body>${body}</body></html>`
}

function header(pkg: CurriculumPackage, edition: string): string {
  const stage = pkg.metadata.gradeStage === 'incoming_grade_7' ? '即將升國一' : `國中 ${pkg.metadata.grade} 年級`
  return `<header><div class="brand">紙屬英文 · ${h(edition)}</div><h1>${h(pkg.metadata.title)}</h1><div class="meta"><span>${h(stage)}</span><span>第 ${pkg.metadata.weekNumber} 週</span><span>預計 ${pkg.learningPlan.estimatedMinutes} 分鐘</span></div></header>`
}

function list(items: readonly string[]): string { return `<ul>${items.map((item) => `<li>${h(item)}</li>`).join('')}</ul>` }

function options(question: CurriculumQuestion): string {
  return question.options ? `<div class="options">${question.options.map((option, index) => `<div>${String.fromCharCode(65 + index)}. ${h(option)}</div>`).join('')}</div>` : ''
}

function lines(count: number): string { return Array.from({ length: count }, () => '<div class="writing-line"></div>').join('') }

function questionHtml(question: CurriculumQuestion): string {
  return `<article class="question"><div class="qid">${h(question.id)} · ${h(question.difficulty)}</div><p>${h(question.prompt)}</p>${options(question)}${lines(question.writingLines)}</article>`
}

function stageLabel(stage: string): string {
  return ({ guided: '跟著示範', independent: '自己完成', 'cap-transfer': '會考型轉移', production: '寫出自己的答案', retrieval: '隔天提取' } as Record<string, string>)[stage] ?? stage
}

export function renderCurriculumStudentHtml(pkg: CurriculumPackage): string {
  const lesson = pkg.studentLesson
  const body = `${header(pkg, '學生教材')}
    <section class="callout"><div class="kicker">這週要帶走的能力</div>${list(lesson.opening.goalsZh)}<p>${h(lesson.opening.howToUseZh)}</p></section>
    <section><h2>先想一想</h2><p>${h(lesson.opening.warmUp)}</p>${lines(2)}</section>
    <section><h2>本週核心單字</h2><div class="vocab-grid">${lesson.vocabulary.map((item) => `<article class="vocab"><div><span class="word">${h(item.word)}</span> <span class="pos">${h(item.partOfSpeech)} · ${h(item.status)}</span></div><p>${h(item.meaningZh)}</p><p class="example">${h(item.exampleEn)}</p><p class="small">${h(item.exampleZh)}</p></article>`).join('')}</div></section>
    <section><h2>閱讀：${h(lesson.reading.title)}</h2><p>${h(lesson.reading.contextZh)}</p><p class="reading-note">讀法提示：${h(lesson.reading.readingTipsZh.join('；'))}</p><div class="reading">${lesson.reading.paragraphs.map((paragraph) => `<p>${h(paragraph)}</p>`).join('')}</div></section>
    ${lesson.instruction.map((instruction) => `<section class="instruction"><h2>${h(instruction.titleZh)}</h2><p>${h(instruction.explanationZh)}</p>${instruction.patterns.map((pattern) => `<div class="pattern">${h(pattern)}</div>`).join('')}<h3>看一個完整例子</h3>${instruction.workedExamples.map((example) => `<article class="worked"><strong>${h(example.example)}</strong><p>${h(example.walkthroughZh)}</p></article>`).join('')}<h3>容易踩到的地方</h3>${instruction.commonMistakes.map((mistake) => `<article class="mistake"><p class="wrong">${h(mistake.wrong)}</p><p class="correct">${h(mistake.corrected)}</p><p>${h(mistake.whyZh)}</p></article>`).join('')}</section>`).join('')}
    ${lesson.practice.map((stage) => `<section class="stage"><span class="stage-label">${h(stageLabel(stage.stage))}</span><h2>${h(stage.titleZh)}</h2><p>${h(stage.instructionsZh)}</p>${stage.hintZh ? `<div class="callout">提示：${h(stage.hintZh)}</div>` : ''}${stage.questions.map(questionHtml).join('')}</section>`).join('')}
    <section><h2>自己檢查</h2>${list(lesson.selfCheckZh)}${lines(3)}</section>
    <section class="page-break"><h2>帶走一點，隔天再想一次</h2><p>${h(lesson.homework.purposeZh)}（約 ${lesson.homework.estimatedMinutes} 分鐘）</p>${lesson.homework.questions.map(questionHtml).join('')}</section>`
  return shell(`${pkg.metadata.title} - Student`, body)
}

export function renderCurriculumParentAnswerHtml(pkg: CurriculumPackage): string {
  const prompts = new Map([...pkg.studentLesson.practice.flatMap((stage) => stage.questions.map((question) => [question.id, question.prompt] as const)), ...pkg.studentLesson.homework.questions.map((question) => [question.id, question.prompt] as const)])
  const body = `${header(pkg, '家長答案與觀察')}
    <section class="callout"><div class="kicker">本週教學重點</div><p>${h(pkg.parentSummary.focusZh)}</p><p>${h(pkg.parentSummary.completionCheckZh)}</p></section>
    <section><h2>這份教材為什麼這樣安排</h2><p>${h(pkg.learningPlan.personalizationStrategy)}</p><p class="small">本次應用的回饋：</p>${list(pkg.qualityEvidence.feedbackApplied)}</section>
    <section><h2>答案與簡短說明</h2>${pkg.answers.map((answer) => `<article class="answer"><div class="qid">${h(answer.questionId)}</div><p>${h(prompts.get(answer.questionId) ?? '')}</p><p><strong>答案：</strong>${h(answer.answer)}</p>${answer.acceptedAnswers.length ? `<p><strong>可接受：</strong>${h(answer.acceptedAnswers.join('；'))}</p>` : ''}<p><strong>為什麼：</strong>${h(answer.explanationZh)}</p>${answer.likelyMisconceptionZh ? `<p><strong>可能卡點：</strong>${h(answer.likelyMisconceptionZh)}</p>` : ''}${answer.followUpZh ? `<p><strong>可追問：</strong>${h(answer.followUpZh)}</p>` : ''}</article>`).join('')}</section>
    <section><h2>家長只要觀察這幾件事</h2>${list(pkg.parentSummary.observeZh)}</section>
    <section><h2>下一週要驗證的學習訊號</h2>${list(pkg.trackingDelta.hypothesesToVerify)}<p class="small">這些是待驗證假設，不代表孩子已經精熟。</p></section>`
  return shell(`${pkg.metadata.title} - Parent Answers`, body)
}
