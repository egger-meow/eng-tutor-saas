import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MaterialEvidenceCard } from './MaterialEvidenceCard'
import type { ParentMaterialEvidenceSummary } from '../../lib/parent-material-evidence'

describe('MaterialEvidenceCard', () => {
  it('renders student submission evidence with objective counts, targets, and rationale', () => {
    const evidence: ParentMaterialEvidenceSummary = {
      source: 'student_submission',
      submittedAt: '2026-10-04T08:00:00Z',
      objectiveCorrect: 3,
      objectiveIncorrect: 1,
      unanswered: 2,
      openReview: 1,
      reportedCompletionRate: null,
      adjustmentNotes: ['加強過去分詞', '擴展科普閱讀情境'],
      targets: [
        { label: 'past-participle', state: 'needs_review' },
        { label: 'reading-inference', state: 'observed_correct' },
      ],
    }

    const html = renderToStaticMarkup(
      <MaterialEvidenceCard
        materialId="mat-1"
        initialEvidence={evidence}
      />
    )

    expect(html).toContain('這次的作答／家長回報')
    expect(html).toContain('學生線上作答')

    // Counts
    expect(html).toContain('>3<')
    expect(html).toContain('答對')
    expect(html).toContain('>1<')
    expect(html).toContain('待複習')
    expect(html).toContain('>2<')
    expect(html).toContain('未作答')
    expect(html).toContain('開放題（待評閱）')

    // Targets
    expect(html).toContain('past-participle')
    expect(html).toContain('需再複習')
    expect(html).toContain('reading-inference')
    expect(html).toContain('作答正確')

    // Adjustment rationale
    expect(html).toContain('這份教材為什麼調整')
    expect(html).toContain('加強過去分詞')
    expect(html).toContain('擴展科普閱讀情境')
    expect(html).toContain('申請後依這次證據設計下一份教材')
  })

  it('renders parent paper report without fabricating accuracy percentage', () => {
    const evidence: ParentMaterialEvidenceSummary = {
      source: 'parent_report',
      submittedAt: '2026-10-04T08:00:00Z',
      objectiveCorrect: 0,
      objectiveIncorrect: 0,
      unanswered: 0,
      openReview: 0,
      reportedCompletionRate: 75,
      adjustmentNotes: ['依上週紙筆回報降低生字量'],
      targets: [],
    }

    const html = renderToStaticMarkup(
      <MaterialEvidenceCard
        materialId="mat-2"
        initialEvidence={evidence}
      />
    )

    expect(html).toContain('家長紙筆回報')
    expect(html).toContain('75%')
    expect(html).toContain('由家長回報之紙筆進度，未經線上評分')
    expect(html).toContain('尚無足夠能力指標證據')
    expect(html).toContain('依上週紙筆回報降低生字量')
  })

  it('renders none source state with action CTAs and truthful empty notice', () => {
    const evidence: ParentMaterialEvidenceSummary = {
      source: 'none',
      submittedAt: null,
      objectiveCorrect: 0,
      objectiveIncorrect: 0,
      unanswered: 0,
      openReview: 0,
      reportedCompletionRate: null,
      adjustmentNotes: [],
      targets: [],
    }

    const onOpenFeedback = vi.fn()

    const html = renderToStaticMarkup(
      <MaterialEvidenceCard
        materialId="mat-3"
        answerUnlockRequiresSubmission={false}
        initialEvidence={evidence}
        onOpenFeedback={onOpenFeedback}
      />
    )

    expect(html).toContain('尚無作答記錄')
    expect(html).toContain('目前只有教材設計記錄，尚無提交作答或家長回報。')
    expect(html).toContain('href="/materials/mat-3"')
    expect(html).toContain('前往線上閱讀與作答')
    expect(html).toContain('紙筆做過了，填寫學習觀察')
  })

  it('shows supplementary note when both submission and feedback exist without overwriting objective results', () => {
    const evidence: ParentMaterialEvidenceSummary = {
      source: 'student_submission',
      submittedAt: '2026-10-04T08:00:00Z',
      objectiveCorrect: 5,
      objectiveIncorrect: 0,
      unanswered: 0,
      openReview: 0,
      reportedCompletionRate: 100,
      adjustmentNotes: ['掌握良好'],
      targets: [],
    }

    const html = renderToStaticMarkup(
      <MaterialEvidenceCard
        materialId="mat-4"
        initialEvidence={evidence}
      />
    )

    expect(html).toContain('學生線上作答')
    expect(html).toContain('家長觀察回報進度：100%（家長觀察記錄，未覆蓋客觀答題結果）')
    expect(html).toContain('尚無足夠能力證據')
  })
})
