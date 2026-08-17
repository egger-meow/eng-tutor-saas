import type { CurriculumPackage, CurriculumQuestion } from '@paper-english/generator'
import { escapeHtml as h } from '../escape-html.js'
import { renderQuestionCard } from './question-renderer.js'

type PracticeStage = CurriculumPackage['studentLesson']['practice'][number]
type Homework = CurriculumPackage['studentLesson']['homework']

const STAGE_LABELS: Record<string, string> = {
  guided: '跟著示範',
  independent: '自己完成',
  'cap-transfer': '會考型轉移',
  production: '寫出自己的答案',
  retrieval: '隔天提取',
}

export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage
}

function renderSingleStage(stage: PracticeStage): string {
  const label = stageLabel(stage.stage)
  const hintHtml = stage.hintZh
    ? `<div class="stage-hint-box"><strong>提示：</strong>${h(stage.hintZh)}</div>`
    : ''
  const questionsHtml = stage.questions.map(renderQuestionCard).join('\n')

  return `<section class="stage-container">
  <div class="stage-header">
    <span class="stage-badge ${h(stage.stage)}">${h(label)}</span>
    <h2 class="stage-title">${h(stage.titleZh)}</h2>
  </div>
  <div class="stage-instructions">${h(stage.instructionsZh)}</div>
  ${hintHtml}
  <div class="stage-questions">
    ${questionsHtml}
  </div>
</section>`
}

export function renderPracticeStages(stages?: readonly PracticeStage[]): string {
  if (!stages || stages.length === 0) return ''
  return stages.map(renderSingleStage).join('\n')
}

export function renderSelfCheckSection(selfCheck?: readonly string[]): string {
  if (!selfCheck || selfCheck.length === 0) return ''

  const itemsHtml = selfCheck.map((item) => `
    <li class="selfcheck-item">
      <span class="selfcheck-box"></span>
      <span>${h(item)}</span>
    </li>
  `).join('\n')

  return `<section class="selfcheck-section">
  <h2>自我檢核</h2>
  <p class="small muted">完成今日學習後，請勾選已掌握的項目，並寫下心得或問題：</p>
  <ul class="selfcheck-list">
    ${itemsHtml}
  </ul>
  <div class="writing-lines-container">
    <div class="writing-line"></div>
    <div class="writing-line"></div>
  </div>
</section>`
}

export function renderHomeworkSection(homework?: Homework): string {
  if (!homework || !homework.questions || homework.questions.length === 0) return ''

  const questionsHtml = homework.questions.map(renderQuestionCard).join('\n')

  return `<section class="homework-section page-break">
  <h2>帶走一點，隔天再想一次</h2>
  <div class="homework-banner">
    <div><strong>任務目標：</strong>${h(homework.purposeZh)}（預計 ${homework.estimatedMinutes} 分鐘）</div>
    <div class="small muted" style="margin-top: 1mm;">建議在完成教材隔天再作答，測試自己是否真正記住。</div>
  </div>
  <div class="homework-questions">
    ${questionsHtml}
  </div>
</section>`
}
