import { useCallback, useEffect, useMemo, useState } from 'react'
import { listChildProfiles, type ChildProfile } from '../lib/child-profiles'
import { listChildren, type Child } from '../lib/children'
import { listMaterials, type Material } from '../lib/materials'

export type ChildWithProfile = Child & { profile: ChildProfile | null }

const selectionKey = 'paper-english:selected-child'

export function chooseOwnedChild(children: ChildWithProfile[], requestedId: string | null): ChildWithProfile | null {
  return children.find((child) => child.id === requestedId) ?? children[0] ?? null
}

export function useParentData() {
  const [children, setChildren] = useState<ChildWithProfile[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string | null>(() => window.localStorage.getItem(selectionKey))
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const childRows = await listChildren()
      const profiles = await listChildProfiles(childRows.map((child) => child.id))
      const profileMap = new Map(profiles.map((profile) => [profile.child_id, profile]))
      const joined = childRows.map((child) => ({ ...child, profile: profileMap.get(child.id) ?? null }))
      const selected = chooseOwnedChild(joined, selectedChildId)
      setChildren(joined)
      setSelectedChildId(selected?.id ?? null)
      setMaterials(selected ? await listMaterials([selected.id]) : [])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '無法讀取家長資料，請稍後再試。')
    } finally {
      setLoading(false)
    }
  }, [selectedChildId])

  useEffect(() => { void refresh() }, [refresh])

  const selectedChild = useMemo(
    () => chooseOwnedChild(children, selectedChildId),
    [children, selectedChildId],
  )

  const selectChild = useCallback((childId: string) => {
    if (!children.some((child) => child.id === childId)) return
    window.localStorage.setItem(selectionKey, childId)
    setSelectedChildId(childId)
  }, [children])

  return { children, selectedChild, materials, loading, error, selectChild, refresh }
}

