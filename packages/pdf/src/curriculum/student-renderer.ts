import type { CurriculumPackage } from '@paper-english/generator'
import { escapeHtml as h } from '../escape-html.js'
import { renderCurriculumHeader } from './header.js'
import { renderCurriculumShell } from './shell.js'
import { renderReadingSection } from './reading-renderer.js'
import { renderVocabularySection } from './vocabulary-renderer.js'
import { renderInstructionSection } from './instruction-renderer.js'
import { renderPracticeStages, renderSelfCheckSection, renderHomeworkSection } from './practice-renderer.js'

export function renderCurriculumStudentHtml(pkg: CurriculumPackage): string {
  const lesson = pkg.studentLesson

  const goalsHtml = lesson.opening.goalsZh && lesson.opening.goalsZh.length > 0
    ? `<ul class="goals-list">${lesson.opening.goalsZh.map((goal) => `<li>${h(goal)}</li>`).join('')}</ul>`
    : ''

  const orientationHtml = `<section class="orientation-card">
  <div class="kicker">這週要帶走的能力</div>
  ${goalsHtml}
  <p>${h(lesson.opening.howToUseZh)}</p>
  <div class="guide-tip">
    <span class="guide-step"><span class="guide-step-num">1</span> 先自己讀</span>
    <span class="guide-step"><span class="guide-step-num">2</span> 圈起生字</span>
    <span class="guide-step"><span class="guide-step-num">3</span> 獨立作答</span>
    <span class="guide-step"><span class="guide-step-num">4</span> 訂正思考</span>
    <span class="guide-step"><span class="guide-step-num">5</span> AI輔助解惑</span>
  </div>
</section>`

  const warmupHtml = `<section class="warmup-box">
  <h2>先想一想</h2>
  <div class="warmup-prompt">${h(lesson.opening.warmUp)}</div>
  <div class="writing-lines-container">
    <div class="writing-line"></div>
    <div class="writing-line"></div>
  </div>
</section>`

  const readingHtml = renderReadingSection(lesson.reading)
  const vocabHtml = renderVocabularySection(lesson.vocabulary)
  const instructionHtml = renderInstructionSection(lesson.instruction)
  const practiceHtml = renderPracticeStages(lesson.practice)
  const selfCheckHtml = renderSelfCheckSection(lesson.selfCheckZh)
  const homeworkHtml = renderHomeworkSection(lesson.homework)

  const body = `
${renderCurriculumHeader(pkg, 'student')}
${orientationHtml}
${warmupHtml}
${readingHtml}
${vocabHtml}
${instructionHtml}
${practiceHtml}
${selfCheckHtml}
${homeworkHtml}
`

  return renderCurriculumShell(`${pkg.metadata.title} - Student`, body)
}
