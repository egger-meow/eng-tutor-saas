import { describe, expect, it } from 'vitest'
import { normalizeCurriculumPackage, type CurriculumPackage } from '@paper-english/generator'
import { renderCurriculumParentAnswerHtml, renderCurriculumStudentHtml } from './render-curriculum-package.js'
import { curriculumSample } from './generate-curriculum-sample.js'

const pkg = {
  metadata: { schemaVersion: '2.0.0', jobId: 'kobe-week-2', childId: 'child-1', weekNumber: 2, grade: 7, gradeStage: 'grade_7', title: 'One Change at a Time', generatedAt: '2026-08-12T00:00:00Z', curriculumVersion: 'curriculum/2.0.0', promptVersion: 'prompt/2.0.0', rubricVersion: 'rubric/2.0.0', rendererVersion: 'renderer/2.0.0', model: 'test', inputFingerprint: 'sha256:test' },
  learningPlan: { estimatedMinutes: 90, difficultyBand: 'on-level', targets: [], prerequisites: [], reviewStrategy: [], personalizationStrategy: 'Uses robotics interest for inference practice.', exclusions: [] },
  studentLesson: { opening: { goalsZh: ['讀懂因果', '找出證據'], howToUseZh: '先看提示再作答。', warmUp: '你會先改哪裡？' }, vocabulary: [], reading: { title: 'One Change at a Time', contextZh: '機器人實驗。', paragraphs: ['Mina tests a robot.'], wordCount: 4, readingTipsZh: ['圈出結果。'], sourceNote: null }, instruction: [], practice: [{ id: 'guided', stage: 'guided', titleZh: '跟著做', instructionsZh: '回答。', hintZh: null, questions: [{ id: 'Q1', targetIds: [], itemType: 'short-response', prompt: 'What happened?', writingLines: 2, difficulty: 'supported' }] }, { id: 'independent', stage: 'independent', titleZh: '自己做', instructionsZh: '回答。', hintZh: null, questions: [] }, { id: 'cap', stage: 'cap-transfer', titleZh: '會考轉移', instructionsZh: '回答。', hintZh: null, questions: [] }, { id: 'production', stage: 'production', titleZh: '寫作', instructionsZh: '回答。', hintZh: null, questions: [] }], selfCheckZh: ['我能找證據。'], homework: { purposeZh: '複習。', estimatedMinutes: 10, questions: [] } },
  parentSummary: { focusZh: '推論', observeZh: ['是否找證據'], completionCheckZh: '看是否完成。' },
  trackingDelta: { introducedVocabularyIds: [], reviewedVocabularyIds: [], grammarTargets: [], readingTargets: [], hypothesesToVerify: ['能否獨立完成'], nextReviewCandidates: [] },
  qualityEvidence: { feedbackApplied: ['增加中文解說'], improvementComparedToPrevious: ['新增中文策略與延遲提取。'], criticalChecks: [], criticFindings: [] },
  learnerSnapshot: { schoolProgress: null, specificInterests: [], changedInterests: [], avoid: [], recentDifficulty: 'appropriate', feedbackSummary: 'None', recurringMistakes: [], reviewDue: [] },
  answers: [{ questionId: 'Q1', answer: 'A robot.', acceptedAnswers: [], explanationZh: '文章說明。', likelyMisconceptionZh: null, followUpZh: null }],
} as unknown as CurriculumPackage

describe('curriculum package PDF HTML', () => {
  it('renders grounded 2.3 metadata deterministically without exposing internal provenance', () => {
    const firstStudent = renderCurriculumStudentHtml(curriculumSample)
    const secondStudent = renderCurriculumStudentHtml(curriculumSample)
    const parent = renderCurriculumParentAnswerHtml(curriculumSample)
    expect(firstStudent).toBe(secondStudent)
    for (const internalValue of ['source-energy-solar', 'fact-1', 'claim-1', 'energy.gov/eere']) {
      expect(firstStudent).not.toContain(internalValue)
      expect(parent).not.toContain(internalValue)
    }
  })

  it('renders bilingual student scaffolding and no answer key', () => {
    const html = renderCurriculumStudentHtml(pkg)
    expect(html).toContain('先看提示再作答')
    expect(html).toContain('One Change at a Time')
    expect(html).not.toContain('A robot.')
  })

  it('renders a compact answer-first parent projection without assigning teaching work', () => {
    const html = renderCurriculumParentAnswerHtml(pkg)
    expect(html).toContain('A robot.')
    expect(html).toContain('您不需要講課，也不需要逐題追問')
    expect(html).not.toContain('能否獨立完成')
    expect(html).not.toContain('這份教材為什麼這樣安排')
    expect(html).not.toContain('可追問')
  })

  it('uses the normalized total in both projections and removes only a stale trailing authored total', () => {
    const authored = structuredClone(pkg) as unknown as CurriculumPackage
    authored.learningPlan.estimatedMinutes = 78
    authored.studentLesson.homework.estimatedMinutes = 14
    authored.parentSummary.completionCheckZh = '完成閱讀、10 個核心字、三組教學、16 題跨階段練習與隔天作業即可，整體約 78 分鐘。'

    const normalized = normalizeCurriculumPackage(authored) as CurriculumPackage
    expect(normalized.studentLesson.homework.estimatedMinutes).toBe(5)
    expect(normalized.learningPlan.estimatedMinutes).toBe(30)
    expect(normalized.parentSummary.completionCheckZh).toBe('完成閱讀、10 個核心字、三組教學、16 題跨階段練習與隔天作業即可')

    const studentHtml = renderCurriculumStudentHtml(normalized)
    const parentHtml = renderCurriculumParentAnswerHtml(normalized)
    expect(studentHtml).toContain('預計 <strong>30</strong> 分鐘')
    expect(parentHtml).toContain('預計 <strong>30</strong> 分鐘')
    expect(parentHtml).toContain('<strong>預計總時間：</strong>30 分鐘')
    expect(parentHtml).toContain('完成閱讀、10 個核心字、三組教學、16 題跨階段練習與隔天作業即可')
    expect(parentHtml).not.toContain('78 分鐘')
  })

  it('preserves meaningful and component-specific numbers in completion scope text', () => {
    const authored = structuredClone(pkg) as unknown as CurriculumPackage
    authored.parentSummary.completionCheckZh = '完成 10 個核心字、16 題練習與隔天 8 分鐘作業即可。'

    const normalized = normalizeCurriculumPackage(authored) as CurriculumPackage
    expect(normalized.parentSummary.completionCheckZh).toBe(authored.parentSummary.completionCheckZh)
  })
})
