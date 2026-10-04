import { describe, it, expect, vi } from 'vitest'
import {
  parseParentMaterialEvidenceSummary,
  fetchParentMaterialEvidenceSummary,
} from './parent-material-evidence'

describe('parseParentMaterialEvidenceSummary', () => {
  it('returns null for non-object or null input', () => {
    expect(parseParentMaterialEvidenceSummary(null)).toBeNull()
    expect(parseParentMaterialEvidenceSummary(undefined)).toBeNull()
    expect(parseParentMaterialEvidenceSummary('string')).toBeNull()
  })

  it('correctly parses a complete student submission payload', () => {
    const raw = {
      source: 'student_submission',
      submittedAt: '2026-10-04T08:00:00Z',
      objectiveCorrect: 4,
      objectiveIncorrect: 1,
      unanswered: 2,
      openReview: 1,
      reportedCompletionRate: null,
      adjustmentNotes: ['加強過去式動詞', '自然科相關閱讀'],
      targets: [
        { label: 'past-tense', state: 'needs_review' },
        { label: 'reading-detail', state: 'observed_correct' },
      ],
    }

    const parsed = parseParentMaterialEvidenceSummary(raw)
    expect(parsed).toEqual({
      source: 'student_submission',
      submittedAt: '2026-10-04T08:00:00Z',
      objectiveCorrect: 4,
      objectiveIncorrect: 1,
      unanswered: 2,
      openReview: 1,
      reportedCompletionRate: null,
      adjustmentNotes: ['加強過去式動詞', '自然科相關閱讀'],
      targets: [
        { label: 'past-tense', state: 'needs_review' },
        { label: 'reading-detail', state: 'observed_correct' },
      ],
    })
  })

  it('correctly parses a paper report payload and clamps completion rate', () => {
    const raw = {
      source: 'parent_report',
      submittedAt: '2026-10-04T08:00:00Z',
      objectiveCorrect: 0,
      objectiveIncorrect: 0,
      unanswered: 0,
      openReview: 0,
      reportedCompletionRate: 75,
      adjustmentNotes: ['首週程度評估'],
      targets: [],
    }

    const parsed = parseParentMaterialEvidenceSummary(raw)
    expect(parsed?.source).toBe('parent_report')
    expect(parsed?.reportedCompletionRate).toBe(75)
    expect(parsed?.objectiveCorrect).toBe(0)
    expect(parsed?.targets).toEqual([])
  })

  it('limits adjustment notes to at most 3 items and trims them', () => {
    const raw = {
      source: 'none',
      adjustmentNotes: ['  重點一 ', '重點二', '重點三', '重點四（超出）'],
    }

    const parsed = parseParentMaterialEvidenceSummary(raw)
    expect(parsed?.adjustmentNotes).toEqual(['重點一', '重點二', '重點三'])
  })

  it('sanitizes unknown states in targets to ungraded', () => {
    const raw = {
      source: 'student_submission',
      targets: [{ label: 'grammar', state: 'unknown_state' }],
    }

    const parsed = parseParentMaterialEvidenceSummary(raw)
    expect(parsed?.targets).toEqual([{ label: 'grammar', state: 'ungraded' }])
  })
})

describe('fetchParentMaterialEvidenceSummary', () => {
  it('returns null if materialId is empty', async () => {
    const mockClient = { rpc: vi.fn() } as unknown as Parameters<typeof fetchParentMaterialEvidenceSummary>[0]
    const res = await fetchParentMaterialEvidenceSummary(mockClient, '')
    expect(res).toBeNull()
    expect(mockClient.rpc).not.toHaveBeenCalled()
  })

  it('invokes get_parent_material_evidence_summary RPC and parses response', async () => {
    const mockClient = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          source: 'student_submission',
          submittedAt: '2026-10-04T08:00:00Z',
          objectiveCorrect: 3,
          objectiveIncorrect: 1,
          unanswered: 0,
          openReview: 0,
          reportedCompletionRate: null,
          adjustmentNotes: ['調整一'],
          targets: [],
        },
        error: null,
      }),
    } as unknown as Parameters<typeof fetchParentMaterialEvidenceSummary>[0]

    const res = await fetchParentMaterialEvidenceSummary(mockClient, 'mat-123')
    expect(mockClient.rpc).toHaveBeenCalledWith('get_parent_material_evidence_summary', {
      p_material_id: 'mat-123',
    })
    expect(res?.objectiveCorrect).toBe(3)
    expect(res?.source).toBe('student_submission')
  })

  it('returns null on RPC error', async () => {
    const mockClient = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      }),
    } as unknown as Parameters<typeof fetchParentMaterialEvidenceSummary>[0]

    const res = await fetchParentMaterialEvidenceSummary(mockClient, 'mat-123')
    expect(res).toBeNull()
  })
})
