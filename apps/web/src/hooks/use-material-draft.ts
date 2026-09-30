import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  DraftAnswers,
  DraftSelfCheck,
  SaveDraftResult,
  SaveDraftStatus,
} from '../types/student-material'
import { fetchMaterialDraft, saveMaterialDraft } from '../lib/student-material-api'

export interface UseMaterialDraftOptions {
  materialId: string
  debounceMs?: number
}

export interface UseMaterialDraftReturn {
  answers: DraftAnswers
  selfCheck: DraftSelfCheck
  status: SaveDraftStatus
  lastSavedAt: string | null
  version: number
  isInitialLoading: boolean
  hasConflict: boolean
  serverConflictData: {
    answers: DraftAnswers
    selfCheck: DraftSelfCheck
    version: number
  } | null
  updateAnswer: (key: string, value: string, immediate?: boolean) => void
  toggleSelfCheck: (itemText: string) => void
  retrySave: () => Promise<void>
  resolveConflict: (strategy: 'keep-mine' | 'load-server') => Promise<void>
}

export function useMaterialDraft({
  materialId,
  debounceMs = 750,
}: UseMaterialDraftOptions): UseMaterialDraftReturn {
  const [answers, setAnswers] = useState<DraftAnswers>({})
  const [selfCheck, setSelfCheck] = useState<DraftSelfCheck>([])
  const [status, setStatus] = useState<SaveDraftStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [version, setVersion] = useState<number>(0)
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true)
  const [hasConflict, setHasConflict] = useState<boolean>(false)
  const [serverConflictData, setServerConflictData] = useState<{
    answers: DraftAnswers
    selfCheck: DraftSelfCheck
    version: number
  } | null>(null)

  // Refs for tracking mutable values without triggering re-effects
  const answersRef = useRef<DraftAnswers>(answers)
  answersRef.current = answers
  const selfCheckRef = useRef<DraftSelfCheck>(selfCheck)
  selfCheckRef.current = selfCheck
  const versionRef = useRef<number>(version)
  versionRef.current = version
  const statusRef = useRef<SaveDraftStatus>(status)
  statusRef.current = status

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveRunningRef = useRef(false)
  const saveQueuedRef = useRef(false)
  const editRevisionRef = useRef(0)
  const flushRef = useRef<(() => Promise<SaveDraftResult | null>) | null>(null)

  // 1. Initial Load of Draft
  useEffect(() => {
    let active = true
    setIsInitialLoading(true)
    setStatus('idle')

    fetchMaterialDraft(materialId)
      .then(({ data, error }) => {
        if (!active) return
        if (error || !data) {
          console.error('Failed to load initial draft', error)
          setStatus('idle')
        } else {
          setAnswers(data.answers ?? {})
          setSelfCheck(data.self_check ?? [])
          setVersion(data.version ?? 0)
          answersRef.current = data.answers ?? {}
          selfCheckRef.current = data.self_check ?? []
          versionRef.current = data.version ?? 0
          setLastSavedAt(data.updated_at)
          setStatus('saved')
        }
      })
      .finally(() => {
        if (active) {
          setIsInitialLoading(false)
        }
      })

    return () => {
      active = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (['unsaved', 'saving'].includes(statusRef.current)) void flushRef.current?.()
    }
  }, [materialId])

  // 2. Perform Save
  const performSave = useCallback(
    async (
      overrideAnswers?: DraftAnswers,
      overrideSelfCheck?: DraftSelfCheck,
      overrideVersion?: number,
    ): Promise<SaveDraftResult | null> => {
      const currentAnswers = overrideAnswers ?? answersRef.current
      const currentSelfCheck = overrideSelfCheck ?? selfCheckRef.current
      const currentVersion = overrideVersion ?? versionRef.current

      if (saveRunningRef.current) {
        saveQueuedRef.current = true
        return null
      }

      // Check online status
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setStatus('error')
        return null
      }

      saveRunningRef.current = true
      const savedRevision = editRevisionRef.current
      let conflicted = false
      setStatus('saving')

      try {
        const { data, error } = await saveMaterialDraft(
          materialId,
          currentAnswers,
          currentSelfCheck,
          currentVersion,
        )

        if (error || !data) {
          console.error('Save draft error', error)
          setStatus('error')
          return null
        }

        if (data.conflict) {
          conflicted = true
          saveQueuedRef.current = false
          setHasConflict(true)
          setServerConflictData({
            answers: data.server_answers ?? {},
            selfCheck: data.server_self_check ?? [],
            version: data.version,
          })
          setStatus('conflict')
          return data
        }

        // Successfully saved
        versionRef.current = data.version
        setVersion(data.version)
        setLastSavedAt(data.updated_at)
        setHasConflict(false)
        setServerConflictData(null)
        if (editRevisionRef.current !== savedRevision) {
          saveQueuedRef.current = true
          setStatus('unsaved')
        } else {
          setStatus('saved')
        }
        return data
      } catch (caught) {
        console.error('Save draft unexpected error', caught)
        setStatus('error')
        return null
      } finally {
        saveRunningRef.current = false
        if (saveQueuedRef.current && !conflicted) {
          saveQueuedRef.current = false
          queueMicrotask(() => { void performSave() })
        }
      }
    },
    [materialId],
  )

  flushRef.current = performSave

  useEffect(() => {
    function preventUnsavedExit(event: Event) {
      if (['unsaved', 'saving', 'error', 'conflict'].includes(statusRef.current)) event.preventDefault()
    }
    function beforeUnload(event: BeforeUnloadEvent) {
      preventUnsavedExit(event)
      if (event.defaultPrevented) event.returnValue = ''
    }
    window.addEventListener('paper-english:before-navigate', preventUnsavedExit)
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      window.removeEventListener('paper-english:before-navigate', preventUnsavedExit)
      window.removeEventListener('beforeunload', beforeUnload)
    }
  }, [])

  // 3. Update answer with debouncing
  const updateAnswer = useCallback(
    (key: string, value: string, immediate = false) => {
      editRevisionRef.current += 1
      setAnswers((prev) => {
        const next = { ...prev, [key]: value }
        answersRef.current = next
        return next
      })

      setStatus('unsaved')

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }

      if (immediate) {
        void performSave()
      } else {
        debounceTimerRef.current = setTimeout(() => {
          void performSave()
        }, debounceMs)
      }
    },
    [debounceMs, performSave],
  )

  // 4. Toggle self-check
  const toggleSelfCheck = useCallback(
    (itemText: string) => {
      editRevisionRef.current += 1
      setSelfCheck((prev) => {
        const next = prev.includes(itemText)
          ? prev.filter((t) => t !== itemText)
          : [...prev, itemText]
        selfCheckRef.current = next
        return next
      })

      setStatus('unsaved')

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }

      // Checkbox toggles save immediately
      void performSave()
    },
    [performSave],
  )

  // 5. Retry Save
  const retrySave = useCallback(async () => {
    await performSave()
  }, [performSave])

  // 6. Conflict Resolution
  const resolveConflict = useCallback(
    async (strategy: 'keep-mine' | 'load-server') => {
      if (!serverConflictData) return

      if (strategy === 'load-server') {
        saveQueuedRef.current = false
        setAnswers(serverConflictData.answers)
        setSelfCheck(serverConflictData.selfCheck)
        setVersion(serverConflictData.version)
        answersRef.current = serverConflictData.answers
        selfCheckRef.current = serverConflictData.selfCheck
        versionRef.current = serverConflictData.version
        setHasConflict(false)
        setServerConflictData(null)
        setStatus('saved')
      } else {
        // 'keep-mine': force save with server version as base version
        const nextVersion = serverConflictData.version
        versionRef.current = nextVersion
        setVersion(nextVersion)
        setHasConflict(false)
        setServerConflictData(null)
        await performSave(answersRef.current, selfCheckRef.current, nextVersion)
      }
    },
    [performSave, serverConflictData],
  )

  // 7. Auto-retry when coming back online
  useEffect(() => {
    function handleOnline() {
      if (statusRef.current === 'unsaved' || statusRef.current === 'error') {
        void performSave()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      return () => {
        window.removeEventListener('online', handleOnline)
      }
    }
  }, [performSave])

  return {
    answers,
    selfCheck,
    status,
    lastSavedAt,
    version,
    isInitialLoading,
    hasConflict,
    serverConflictData,
    updateAnswer,
    toggleSelfCheck,
    retrySave,
    resolveConflict,
  }
}
