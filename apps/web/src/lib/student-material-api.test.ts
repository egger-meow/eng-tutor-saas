import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  fetchStudentMaterialProjection,
  fetchMaterialDraft,
  saveMaterialDraft,
  createStudentPdfSignedUrl,
  fetchStudentSubmission,
  submitStudentMaterial,
  saveStudentParentFeedback,
  requestNextAfterSubmission,
  canOpenParentAnswer,
} from './student-material-api'

const rpcMock = vi.fn()
const storageFromMock = vi.fn()

vi.mock('./supabase', () => ({
  getSupabaseClient: () => ({
    rpc: rpcMock,
    storage: {
      from: storageFromMock,
    },
  }),
}))

describe('student-material-api client tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. fetchStudentMaterialProjection successfully calls RPC and returns projection', async () => {
    const mockProjection = {
      material_id: 'mat-1',
      child_id: 'child-1',
      child_name: 'Jonathan',
      material_week: '2026-09-28',
      week_number: 1,
      revision: 1,
      title: 'Sound and Vibration',
      student_lesson: {
        vocabulary: [],
        reading: { title: 'Test Reading' },
      },
      student_pdf_path: 'path/to/student.pdf',
      release_at: '2026-09-28T00:00:00Z',
    }

    rpcMock.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: mockProjection, error: null }),
    })

    const result = await fetchStudentMaterialProjection('mat-1')

    expect(result.error).toBeNull()
    expect(result.data).toEqual(mockProjection)
    expect(rpcMock).toHaveBeenCalledWith('get_student_material_projection', {
      p_material_id: 'mat-1',
    })
  })

  it('2. fetchStudentMaterialProjection handles RPC error gracefully', async () => {
    rpcMock.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Material not released or unowned' },
      }),
    })

    const result = await fetchStudentMaterialProjection('mat-unowned')

    expect(result.data).toBeNull()
    expect(result.error?.message).toContain('Material not released or unowned')
  })

  it('3. fetchMaterialDraft returns empty draft defaults when row does not exist yet', async () => {
    rpcMock.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    const result = await fetchMaterialDraft('mat-new')

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      answers: {},
      self_check: [],
      version: 0,
      updated_at: null,
    })
    expect(rpcMock).toHaveBeenCalledWith('get_material_draft', { p_material_id: 'mat-new' })
  })

  it('4. saveMaterialDraft calls RPC and returns save or conflict status', async () => {
    const mockSaveResult = {
      success: true,
      version: 2,
      updated_at: '2026-09-29T10:15:00Z',
      conflict: false,
      answers: null,
      self_check: null,
    }

    rpcMock.mockResolvedValue({ data: mockSaveResult, error: null })

    const result = await saveMaterialDraft(
      'mat-1',
      { 'q-1': 'A' },
      ['item-1'],
      1,
    )

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      saved: true,
      version: 2,
      updated_at: '2026-09-29T10:15:00Z',
      conflict: false,
      server_answers: null,
      server_self_check: null,
    })
    expect(rpcMock).toHaveBeenCalledWith('save_material_draft', {
      p_material_id: 'mat-1',
      p_answers: { 'q-1': 'A' },
      p_self_check: ['item-1'],
      p_client_version: 1,
    })
  })

  it('5. createStudentPdfSignedUrl creates signed URL with 1800s expiry', async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed-url' },
      error: null,
    })
    storageFromMock.mockReturnValue({ createSignedUrl })

    const url = await createStudentPdfSignedUrl('path/to/student.pdf')

    expect(url).toBe('https://example.com/signed-url')
    expect(storageFromMock).toHaveBeenCalledWith('weekly-materials')
    expect(createSignedUrl).toHaveBeenCalledWith('path/to/student.pdf', 1800)
  })

  it('loads a submitted result only through the scoped RPC', async () => {
    const submission = { submitted_at: '2026-09-29T00:00:00Z', answers: { q1: 'A' }, self_check: [], results: [] }
    rpcMock.mockResolvedValue({ data: submission, error: null })
    expect(await fetchStudentSubmission('mat-1')).toEqual(submission)
    expect(rpcMock).toHaveBeenCalledWith('get_student_material_submission', { p_material_id: 'mat-1' })
  })

  it('submits using the latest saved draft version', async () => {
    rpcMock.mockResolvedValue({ data: { conflict: true, version: 3 }, error: null })
    expect(await submitStudentMaterial('mat-1', 2)).toEqual({ conflict: true, version: 3 })
    expect(rpcMock).toHaveBeenCalledWith('submit_student_material', { p_material_id: 'mat-1', p_client_version: 2 })
  })

  it('saves optional parent feedback without requesting the next material', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null })
    await saveStudentParentFeedback('mat-1', { difficulty: 3, completionRate: 50, weakArea: null, comments: '' })
    expect(rpcMock).toHaveBeenCalledWith('save_student_parent_feedback', {
      p_material_id: 'mat-1', p_difficulty: 3, p_completion_rate: 50, p_weak_area: null,
      p_mistakes_text: '', p_child_comments: '', p_parent_comments: '',
    })
    expect(rpcMock).toHaveBeenCalledTimes(1)
  })

  it('requests the next material with an explicit action', async () => {
    rpcMock.mockResolvedValue({ data: { requested: true, used: 2, limit: 4 }, error: null })
    expect(await requestNextAfterSubmission('mat-1')).toMatchObject({ requested: true, used: 2 })
    expect(rpcMock).toHaveBeenCalledWith('request_next_after_student_submission', { p_material_id: 'mat-1' })
  })

  it('checks parent answer access through the server gate', async () => {
    rpcMock.mockResolvedValue({ data: false, error: null })
    expect(await canOpenParentAnswer('mat-1')).toBe(false)
    expect(rpcMock).toHaveBeenCalledWith('can_open_parent_answer', { p_material_id: 'mat-1' })
  })
})
