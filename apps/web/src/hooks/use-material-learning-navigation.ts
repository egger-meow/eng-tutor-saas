import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchMaterialNavigation,
  saveMaterialNavigation,
  type MaterialNavigationPosition,
} from '../lib/material-learning-navigation'

export interface UseMaterialLearningNavigationProps {
  materialId: string
  enabled?: boolean
}

export function useMaterialLearningNavigation({
  materialId,
  enabled = true,
}: UseMaterialLearningNavigationProps) {
  const [position, setPosition] = useState<MaterialNavigationPosition | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasConflict, setHasConflict] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const versionRef = useRef<number>(0)

  // Clear and load when materialId changes
  useEffect(() => {
    versionRef.current = 0
    setPosition(null)
    setHasConflict(false)
    setSaveError(false)

    if (!enabled || !materialId) {
      setIsLoading(false)
      return
    }

    let active = true
    setIsLoading(true)

    void fetchMaterialNavigation(materialId)
      .then((saved) => {
        if (!active) return
        if (saved) {
          setPosition(saved)
          versionRef.current = saved.version
        }
      })
      .catch(() => {
        // Non-fatal: navigation fetch failures should never block reading
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [materialId, enabled])

  const recordPosition = useCallback(
    async (chapterId: string, questionId: string | null = null) => {
      if (!enabled || !materialId) return
      try {
        setSaveError(false)
        const res = await saveMaterialNavigation(
          materialId,
          chapterId,
          questionId,
          versionRef.current
        )
        if (res.conflict) {
          setHasConflict(true)
          versionRef.current = res.version
          setPosition({
            chapter_id: res.chapter_id,
            question_id: res.question_id,
            version: res.version,
            updated_at: res.updated_at,
          })
        } else if (res.saved) {
          setHasConflict(false)
          versionRef.current = res.version
          setPosition({
            chapter_id: res.chapter_id,
            question_id: res.question_id,
            version: res.version,
            updated_at: res.updated_at,
          })
        }
      } catch {
        // Position save failures do not block reading or answer drafts
        setSaveError(true)
      }
    },
    [materialId, enabled]
  )

  const dismissResumePrompt = useCallback(() => {
    setPosition(null)
  }, [])

  return {
    savedPosition: position,
    isLoading,
    hasConflict,
    saveError,
    recordPosition,
    dismissResumePrompt,
  }
}
