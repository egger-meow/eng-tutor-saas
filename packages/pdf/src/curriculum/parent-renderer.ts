import type { CurriculumPackage } from '@paper-english/generator'
import { escapeHtml as h } from '../escape-html.js'
import { renderCurriculumHeader } from './header.js'
import { renderCurriculumShell } from './shell.js'

type AnswerItem = CurriculumPackage['answers'][number]

function renderAnswerCard(answer: AnswerItem): string {
  const alternativesHtml = answer.acceptedAnswers && answer.acceptedAnswers.length > 0
    ? `<div class="answer-alternatives"><strong>也可接受：</strong>${h(answer.acceptedAnswers.join('；'))}</div>`
    : ''

  const misconceptionHtml = answer.likelyMisconceptionZh
    ? `<div class="answer-misconception"><strong>常見誤區：</strong>${h(answer.likelyMisconceptionZh)}</div>`
    : ''

  const followUpHtml = answer.followUpZh
    ? `<div class="small muted" style="margin-top: 1.5mm;"><strong>可引導提問：</strong>${h(answer.followUpZh)}</div>`
    : ''

  return `<article class="answer-card">
  <div class="answer-header">
    <div class="answer-qid">${h(answer.questionId)}</div>
  </div>
  <div class="answer-key"><strong>答案：</strong>${h(answer.answer)}</div>
  ${alternativesHtml}
  <div class="answer-reason"><strong>簡短理由：</strong>${h(answer.explanationZh)}</div>
  ${misconceptionHtml}
  ${followUpHtml}
</article>`
}

export function renderCurriculumParentAnswerHtml(pkg: CurriculumPackage): string {
  const summary = pkg.parentSummary

  const observeItemsHtml = summary.observeZh && summary.observeZh.length > 0
    ? `<ul>${summary.observeZh.map((item) => `<li>${h(item)}</li>`).join('')}</ul>`
    : ''

  const personalizationHtml = summary.personalizationZh && summary.personalizationZh.length > 0
    ? `<div class="small muted" style="margin-top: 2mm; border-top: 1px dashed #e7ceb7; padding-top: 1.5mm;">
        <strong>本週調整說明：</strong>${h(summary.personalizationZh.join('；'))}
      </div>`
    : ''

  const answersHtml = pkg.answers.map(renderAnswerCard).join('\n')

  const body = `
${renderCurriculumHeader(pkg, 'parent-answer')}

<section class="parent-guidance-card">
  <div class="parent-guidance-title">家長只需要做一件事</div>
  <p>孩子完成學生教材後，再把這份答案交給他自行核對。您不需要講課，也不需要逐題追問。</p>
  <p><strong>本週學習重點：</strong>${h(summary.focusZh)}</p>
  ${summary.observeZh && summary.observeZh.length > 0 ? `<div><strong>觀察重點：</strong></div>${observeItemsHtml}` : ''}
  <p class="small"><strong>完成度確認：</strong>${h(summary.completionCheckZh)}</p>
  <p class="small"><strong>預計總時間：</strong>${pkg.learningPlan.estimatedMinutes} 分鐘</p>
  ${personalizationHtml}
</section>

<section class="answers-section">
  <h2>答案與解析</h2>
  <div class="answers-list">
    ${answersHtml}
  </div>
</section>

<section class="parent-guidance-card" style="margin-top: 6mm;">
  <div class="parent-guidance-title">遇到不懂時</div>
  <p>請孩子先找出錯在哪裡；仍不懂時，再拍下題目請 AI 解釋原因並另出一題。詳細方法請看網站的學習指南。</p>
</section>
`

  return renderCurriculumShell(`${pkg.metadata.title} - Parent Answers`, body)
}
