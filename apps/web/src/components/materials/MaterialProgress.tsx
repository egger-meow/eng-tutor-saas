import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchMaterialDraft, fetchStudentSubmission, type SubmissionResult } from '../../lib/student-material-api'

type Progress = { materialId: string; loading: boolean; failed: boolean; started: boolean; submission: SubmissionResult | null; retry: () => void }
const Context = createContext<Progress | null>(null)
function useProgress(materialId: string, enabled: boolean): Progress {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ materialId, loading: true, failed: false, started: false, submission: null as SubmissionResult | null })
  useEffect(() => {
    if (!enabled) return
    let active = true
    setState({ materialId, loading: true, failed: false, started: false, submission: null })
    void (async () => {
      const submission = await fetchStudentSubmission(materialId)
      if (submission) return { started: true, submission }
      const { data, error } = await fetchMaterialDraft(materialId)
      if (error) throw error
      return { started: Boolean(data?.updated_at), submission: null }
    })().then((result) => { if (active) setState({ materialId, loading: false, failed: false, ...result }) })
      .catch(() => { if (active) setState({ materialId, loading: false, failed: true, started: false, submission: null }) })
    return () => { active = false }
  }, [materialId, enabled, attempt])
  const current = state.materialId === materialId ? state : { materialId, loading: true, failed: false, started: false, submission: null }
  return { ...current, retry: () => setAttempt((n) => n + 1) }
}
export function MaterialProgressProvider({ materialId, children }: { materialId: string; children: ReactNode }) {
  const progress = useProgress(materialId, true)
  return <Context.Provider value={progress}>{children}</Context.Provider>
}
// Shared with standalone progress consumers as well as the provider.
// oxlint-disable-next-line react/only-export-components
export function useMaterialProgress(materialId: string) {
  const shared = useContext(Context)
  const local = useProgress(materialId, shared?.materialId !== materialId)
  return shared?.materialId === materialId ? shared : local
}
