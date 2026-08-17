import type { CurriculumPackage } from '@paper-english/generator'
import { escapeHtml as h } from '../escape-html.js'

export function formatGradeStage(pkg: CurriculumPackage): string {
  if (pkg.metadata.gradeStage === 'incoming_grade_7') return '即將升國一'
  return `國中 ${pkg.metadata.grade} 年級`
}

export function renderCurriculumHeader(pkg: CurriculumPackage, kind: 'student' | 'parent-answer'): string {
  const stage = formatGradeStage(pkg)
  const isStudent = kind === 'student'
  const editionLabel = isStudent ? '學生教材' : '家長答案'
  const editionClass = isStudent ? 'student' : 'parent'

  return `<header>
  <div class="brand-bar">
    <div class="brand-title">紙屬英文</div>
    <div class="brand-edition ${editionClass}">${h(editionLabel)}</div>
  </div>
  <h1>${h(pkg.metadata.title)}</h1>
  <div class="header-meta">
    <div class="header-meta-item">
      <span class="header-meta-badge">${h(stage)}</span>
    </div>
    <div class="header-meta-item">
      <span>第 <strong>${pkg.metadata.weekNumber}</strong> 週</span>
    </div>
    <div class="header-meta-item">
      <span>預計 <strong>${pkg.learningPlan.estimatedMinutes}</strong> 分鐘</span>
    </div>
  </div>
</header>`
}
