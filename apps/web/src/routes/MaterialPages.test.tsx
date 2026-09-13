import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MaterialPreview } from '../components/materials/MaterialPreview'
import { loadAuthenticatedMaterial } from '../lib/authenticated-material-loader'
import { AuthenticatedMaterialContent } from './AuthenticatedMaterialPage'
import { ScopedMaterialContent, ScopedMaterialLoadingState, ScopedMaterialPage } from './ScopedMaterialPage'

const { rpcMock, createSignedUrlMock, functionsInvokeMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  createSignedUrlMock: vi.fn(),
  functionsInvokeMock: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: vi.fn(() => ({
    rpc: rpcMock,
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: createSignedUrlMock,
      })),
    },
    functions: {
      invoke: functionsInvokeMock,
    },
  })),
}))

describe('weekly material inline preview and page states', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. valid email token, anonymous user: renders header, student preview, and both download actions', () => {
    const html = renderToStaticMarkup(
      <ScopedMaterialContent
        state={{
          status: 'ready',
          material: { childName: 'Pax', materialWeek: '2026-W35', weekNumber: 1 },
          studentPdfUrl: 'https://example.com/student.pdf',
          parentAnswerPdfUrl: 'https://example.com/parent.pdf',
        }}
        session={null}
      />
    )

    // Header
    expect(html).toContain('Pax · Week 1')
    expect(html).toContain('本週教材')

    // Student PDF preview
    expect(html).toContain('學生學習版')
    expect(html).toContain('material-preview-surface')
    expect(html).toContain('data="https://example.com/student.pdf#toolbar=0&amp;navpanes=0"')
    expect(html).toContain('type="application/pdf"')

    // Actions below preview
    expect(html).toContain('下載學生教材')
    expect(html).toContain('href="https://example.com/student.pdf"')
    expect(html).toContain('下載家長解答')
    expect(html).toContain('href="https://example.com/parent.pdf"')

    // Anonymous navigation
    expect(html).toContain('登入查看所有教材與學習紀錄')
  })

  it('2. valid email token, logged-in matching owner: canonical redirect and authenticated preview exist', async () => {
    // Authenticated material content renders preview for the canonical route
    const html = renderToStaticMarkup(
      <AuthenticatedMaterialContent
        state={{
          status: 'ready',
          material: {
            id: 'mat-1',
            child_id: 'child-1',
            child_name: 'Jonathan',
            material_week: '2026-W35',
            week_number: 2,
            revision: 1,
            student_pdf_path: 'child-1/mat-1/student.pdf',
            parent_answer_pdf_path: 'child-1/mat-1/answer.pdf',
            generation_summary: {},
            created_at: '2026-08-25T00:00:00Z',
            feedback: null,
          },
          studentPdfUrl: 'https://example.com/signed-student-preview.pdf',
        }}
        onRetry={vi.fn()}
      />
    )

    expect(html).toContain('Jonathan · Week 2')
    expect(html).toContain('本週教材')
    expect(html).toContain('學生學習版')
    expect(html).toContain('data="https://example.com/signed-student-preview.pdf#toolbar=0&amp;navpanes=0"')
    expect(html).toContain('下載學生教材')
    expect(html).toContain('下載家長解答')
  })

  it('3. direct authenticated /materials/:id loads owned released material and creates temporary preview URL', async () => {
    const mockMaterialData = {
      id: 'mat-released',
      child_id: 'child-1',
      child_name: 'Jonathan',
      material_week: '2026-W35',
      revision: 1,
      student_pdf_path: 'child-1/mat-released/student.pdf',
      parent_answer_pdf_path: 'child-1/mat-released/answer.pdf',
      generation_summary: { weekNumber: 3 },
      created_at: '2026-08-25T00:00:00Z',
      release_at: '2026-08-25T00:00:00Z',
    }

    rpcMock.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: mockMaterialData, error: null }),
    })
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: 'https://supabase.co/storage/v1/object/sign/weekly-materials/signed.pdf' },
      error: null,
    })

    const result = await loadAuthenticatedMaterial('mat-released', 'parent-user-1')

    expect(result.status).toBe('ready')
    if (result.status === 'ready') {
      expect(result.material.id).toBe('mat-released')
      expect(result.studentPdfUrl).toBe('https://supabase.co/storage/v1/object/sign/weekly-materials/signed.pdf')
      expect(result.previewError).toBe(false)
    }

    expect(rpcMock).toHaveBeenCalledWith('get_owned_released_material', { p_material_id: 'mat-released' })
    expect(createSignedUrlMock).toHaveBeenCalledWith('child-1/mat-released/student.pdf', 1800)
  })

  it('4. other parent material: preview is unavailable and returns not-found', async () => {
    // When requesting a material belonging to another parent, RPC returns null
    rpcMock.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    const result = await loadAuthenticatedMaterial('other-parent-mat', 'parent-user-2')

    expect(result).toEqual({ status: 'not-found' })
    expect(createSignedUrlMock).not.toHaveBeenCalled()

    const html = renderToStaticMarkup(<AuthenticatedMaterialContent state={{ status: 'not-found' }} onRetry={vi.fn()} />)
    expect(html).toContain('找不到這份教材')
    expect(html).toContain('教材尚未開放，或不屬於這個帳戶。')
    expect(html).not.toContain('material-preview-surface')
  })

  it('5. unreleased material: RPC returns no row, no preview URL is created, returns not-found', async () => {
    // Unreleased material is filtered by get_owned_released_material (release_at <= now())
    rpcMock.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    const result = await loadAuthenticatedMaterial('future-mat', 'parent-user-1')

    expect(result).toEqual({ status: 'not-found' })
    expect(createSignedUrlMock).not.toHaveBeenCalled()
  })

  it('6. expired or revoked email token: preserves existing invalid-link UI', () => {
    const html = renderToStaticMarkup(
      <ScopedMaterialContent
        state={{ status: 'error' }}
        session={null}
      />
    )

    expect(html).toContain('這個教材連結無法使用')
    expect(html).toContain('教材連結')
    expect(html).toContain('連結可能已過期、遭撤銷，或教材尚未開放。請登入紙屬英文查看目前可用的教材。')
    expect(html).toContain('登入紙屬英文')
    expect(html).not.toContain('material-preview-surface')
  })

  it('7. PDF embed failure: renders browser unsupported fallback with direct open button', () => {
    // Normal embed object contains fallback markup inside for unsupported browsers
    const html = renderToStaticMarkup(
      <MaterialPreview pdfUrl="https://example.com/student.pdf" />
    )

    expect(html).toContain('你的瀏覽器無法直接顯示教材。')
    expect(html).toContain('開啟學生教材預覽')
    expect(html).toContain('href="https://example.com/student.pdf"')
    expect(html).toContain('target="_blank"')
  })

  it('7b. signed URL creation failure: shows error notice while page and actions remain usable', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const mockMaterialData = {
      id: 'mat-1',
      child_id: 'child-1',
      child_name: 'Pax',
      material_week: '2026-W35',
      revision: 1,
      student_pdf_path: 'child-1/mat-1/student.pdf',
      parent_answer_pdf_path: 'child-1/mat-1/answer.pdf',
      generation_summary: {},
      created_at: '2026-08-25T00:00:00Z',
      release_at: '2026-08-25T00:00:00Z',
    }

    rpcMock.mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: mockMaterialData, error: null }),
    })
    createSignedUrlMock.mockResolvedValue({
      data: null,
      error: { message: 'Storage timeout' },
    })

    const result = await loadAuthenticatedMaterial('mat-1', 'parent-user-1')

    expect(result.status).toBe('ready')
    if (result.status === 'ready') {
      expect(result.studentPdfUrl).toBeNull()
      expect(result.previewError).toBe(true)
    }

    // Page renders preview error state but download actions remain available
    const html = renderToStaticMarkup(
      <AuthenticatedMaterialContent
        state={{
          status: 'ready',
          material: {
            ...mockMaterialData,
            feedback: null,
          },
          studentPdfUrl: null,
          previewError: true,
        }}
        onRetry={vi.fn()}
      />
    )

    expect(html).toContain('教材預覽暫時無法載入')
    expect(html).toContain('下載學生教材')
    expect(html).toContain('下載家長解答')
    consoleError.mockRestore()
  })

  it('8. loading and structure invariants: marks loading state correctly', () => {
    const scopedLoading = renderToStaticMarkup(<ScopedMaterialPage session={null} />)
    expect(scopedLoading).toContain('scoped-material-main-loading')
    expect(scopedLoading).toContain('container scoped-material-page')

    const loadingState = renderToStaticMarkup(<ScopedMaterialLoadingState />)
    expect(loadingState).toContain('scoped-material-loading-state')
    expect(loadingState).toContain('正在安全開啟教材')
    expect(loadingState).toContain('role="status"')

    const previewLoading = renderToStaticMarkup(<MaterialPreview isLoading={true} />)
    expect(previewLoading).toContain('正在載入教材預覽…')
    expect(previewLoading).toContain('material-preview-loading-surface')
  })
})
