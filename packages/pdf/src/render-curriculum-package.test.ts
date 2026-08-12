import { describe, expect, it } from 'vitest'
import type { CurriculumPackage } from '@paper-english/generator'
import { renderCurriculumParentAnswerHtml, renderCurriculumStudentHtml } from './render-curriculum-package.js'

const pkg = {
  metadata: { schemaVersion: '2.0.0', jobId: 'kobe-week-2', childId: 'child-1', weekNumber: 2, grade: 7, gradeStage: 'grade_7', title: 'One Change at a Time', generatedAt: '2026-08-12T00:00:00Z', curriculumVersion: 'curriculum/2.0.0', promptVersion: 'prompt/2.0.0', rubricVersion: 'rubric/2.0.0', rendererVersion: 'renderer/2.0.0', model: 'test', inputFingerprint: 'sha256:test' },
  learningPlan: { estimatedMinutes: 90, difficultyBand: 'on-level', targets: [], prerequisites: [], reviewStrategy: [], personalizationStrategy: 'Uses robotics interest for inference practice.', exclusions: [] },
  studentLesson: { opening: { goalsZh: ['讀懂因果', '找出證據'], howToUseZh: '先看提示再作答。', warmUp: '你會先改哪裡？' }, vocabulary: [], reading: { title: 'One Change at a Time', contextZh: '機器人實驗。', paragraphs: ['Mina tests a robot.'], wordCount: 4, readingTipsZh: ['圈出結果。'], sourceNote: null }, instruction: [], practice: [{ id: 'guided', stage: 'guided', titleZh: '跟著做', instructionsZh: '回答。', hintZh: null, questions: [{ id: 'Q1', targetIds: [], itemType: 'short-response', prompt: 'What happened?', writingLines: 2, difficulty: 'supported' }] }, { id: 'independent', stage: 'independent', titleZh: '自己做', instructionsZh: '回答。', hintZh: null, questions: [] }, { id: 'cap', stage: 'cap-transfer', titleZh: '會考轉移', instructionsZh: '回答。', hintZh: null, questions: [] }, { id: 'production', stage: 'production', titleZh: '寫作', instructionsZh: '回答。', hintZh: null, questions: [] }], selfCheckZh: ['我能找證據。'], homework: { purposeZh: '複習。', estimatedMinutes: 10, questions: [] } },
  parentSummary: { focusZh: '推論', observeZh: ['是否找證據'], completionCheckZh: '看是否完成。' },
  trackingDelta: { introducedVocabularyIds: [], reviewedVocabularyIds: [], grammarTargets: [], readingTargets: [], hypothesesToVerify: ['能否獨立完成'], nextReviewCandidates: [] },
  qualityEvidence: { feedbackApplied: ['增加中文解說'], criticalChecks: [], criticFindings: [] },
  learnerSnapshot: { schoolProgress: null, specificInterests: [], changedInterests: [], avoid: [], recentDifficulty: 'appropriate', feedbackSummary: 'None', recurringMistakes: [], reviewDue: [] },
  answers: [{ questionId: 'Q1', answer: 'A robot.', acceptedAnswers: [], explanationZh: '文章說明。', likelyMisconceptionZh: null, followUpZh: null }],
} as unknown as CurriculumPackage

describe('curriculum package PDF HTML', () => {
  it('renders bilingual student scaffolding and no answer key', () => {
    const html = renderCurriculumStudentHtml(pkg)
    expect(html).toContain('先看提示再作答')
    expect(html).toContain('One Change at a Time')
    expect(html).not.toContain('A robot.')
  })

  it('renders parent answers and tracking hypotheses', () => {
    const html = renderCurriculumParentAnswerHtml(pkg)
    expect(html).toContain('A robot.')
    expect(html).toContain('能否獨立完成')
  })
})
